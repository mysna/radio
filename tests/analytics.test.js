import test from "node:test";
import assert from "node:assert/strict";

import { createAnalyticsSession, getVisitorId } from "../src/analytics.js";

function createMemoryStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, value),
  };
}

function createRecordingFetcher(responses) {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body) });
    const response = responses.shift() ?? { visit_id: "visit-1", session_id: "session-1" };
    return { ok: true, json: async () => response };
  };
  return { fetcher, calls };
}

function createRecordingBeacon() {
  const calls = [];
  const sendBeacon = (url, blob) => {
    calls.push({ url, blob });
    return true;
  };
  return { sendBeacon, calls };
}

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

test("getVisitorId reuses the id stored on a previous visit", () => {
  const storage = createMemoryStorage();
  const first = getVisitorId(storage);
  const second = getVisitorId(storage);
  assert.equal(first, second);
});

test("getVisitorId falls back to a fresh id when storage is unavailable", () => {
  const storage = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  const id = getVisitorId(storage);
  assert.match(id, /^[0-9a-f-]{36}$/);
});

test("createAnalyticsSession starts a visit with the stored visitor id and referrer", async () => {
  const storage = createMemoryStorage({ "radio-player:visitor-id": "visitor-abc" });
  const { fetcher, calls } = createRecordingFetcher([{ visit_id: "visit-1" }]);
  const documentRef = { hidden: false, referrer: "https://example.com/" };
  const { sendBeacon } = createRecordingBeacon();

  const session = createAnalyticsSession({ fetcher, storage, documentRef, sendBeacon });
  await flushMicrotasks();

  assert.equal(session.visitorId, "visitor-abc");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.endsWith("/v1/events/visit"), true);
  assert.deepEqual(calls[0].body, { visitor_id: "visitor-abc", referrer: "https://example.com/" });

  session.endVisit();
});

test("trackListenStart waits for the visit before starting a listen session", async () => {
  const storage = createMemoryStorage();
  const { fetcher, calls } = createRecordingFetcher([{ visit_id: "visit-1" }, { session_id: "session-1" }]);
  const documentRef = { hidden: false, referrer: "" };
  const { sendBeacon } = createRecordingBeacon();

  const session = createAnalyticsSession({ fetcher, storage, documentRef, sendBeacon });
  await session.trackListenStart("kbs.1radio.seoul");

  assert.equal(calls.length, 2);
  assert.equal(calls[1].url.endsWith("/v1/events/listen/start"), true);
  assert.deepEqual(calls[1].body, {
    visitor_id: session.visitorId,
    visit_id: "visit-1",
    channel_id: "kbs.1radio.seoul",
    broadcaster: null,
    region_id: null,
    program_id: null,
    program_title: null,
  });

  session.endListenSession();
  session.endVisit();
});

test("trackListenStart sends broadcaster/region/program metadata and refreshes the program on end", async () => {
  const storage = createMemoryStorage();
  const { fetcher, calls } = createRecordingFetcher([{ visit_id: "visit-1" }, { session_id: "session-1" }]);
  const documentRef = { hidden: false, referrer: "" };
  const { sendBeacon, calls: beaconCalls } = createRecordingBeacon();
  let currentProgram = { programId: "kbs.news.0900", programTitle: "KBS 뉴스" };

  const session = createAnalyticsSession({ fetcher, storage, documentRef, sendBeacon });
  await session.trackListenStart("kbs.1radio.seoul", {
    broadcaster: "kbs",
    regionId: "seoul",
    getProgram: () => currentProgram,
  });

  assert.deepEqual(calls[1].body, {
    visitor_id: session.visitorId,
    visit_id: "visit-1",
    channel_id: "kbs.1radio.seoul",
    broadcaster: "kbs",
    region_id: "seoul",
    program_id: "kbs.news.0900",
    program_title: "KBS 뉴스",
  });

  // 재생 도중 다음 프로그램으로 바뀐 뒤 종료하면, 종료 시점의 최신 프로그램을 실어 보낸다.
  currentProgram = { programId: "kbs.next", programTitle: "다음 프로그램" };
  session.endListenSession();

  assert.equal(beaconCalls.length, 1);
  const endBody = JSON.parse(await beaconCalls[0].blob.text());
  assert.deepEqual(endBody, {
    session_id: "session-1",
    program_id: "kbs.next",
    program_title: "다음 프로그램",
  });

  session.endVisit();
});

test("trackListenStart closes the previous channel's session with sendBeacon before starting a new one", async () => {
  const storage = createMemoryStorage();
  const { fetcher } = createRecordingFetcher([
    { visit_id: "visit-1" },
    { session_id: "session-a" },
    { session_id: "session-b" },
  ]);
  const documentRef = { hidden: false, referrer: "" };
  const { sendBeacon, calls: beaconCalls } = createRecordingBeacon();

  const session = createAnalyticsSession({ fetcher, storage, documentRef, sendBeacon });
  await session.trackListenStart("channel-a");
  await session.trackListenStart("channel-b");

  assert.equal(beaconCalls.length, 1);
  assert.equal(beaconCalls[0].url.endsWith("/v1/events/listen/end"), true);

  session.endListenSession();
  session.endVisit();
});

test("endListenSession is a no-op when nothing is playing", () => {
  const storage = createMemoryStorage();
  const { sendBeacon, calls } = createRecordingBeacon();
  const session = createAnalyticsSession({
    fetcher: async () => ({ ok: true, json: async () => ({}) }),
    storage,
    documentRef: { hidden: false, referrer: "" },
    sendBeacon,
  });

  session.endListenSession();
  assert.equal(calls.length, 0);
});

test("a failed visit request never throws and simply skips listen tracking", async () => {
  const storage = createMemoryStorage();
  const fetcher = async () => {
    throw new Error("network down");
  };
  const session = createAnalyticsSession({
    fetcher,
    storage,
    documentRef: { hidden: false, referrer: "" },
    sendBeacon: () => true,
  });

  await session.trackListenStart("channel-a");
  session.endListenSession();
  session.endVisit();
});
