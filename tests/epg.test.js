import test from "node:test";
import assert from "node:assert/strict";
import { fetchCurrentPrograms, formatProgramTime, nextRefreshDelay, normalizeNowResponse, parseUnknownEpgIds, prioritizeRadioIds, programPositionState, progressAt, serializeUnknownEpgIds } from "../src/epg.js";

const current = {
  title: "KBS 뉴스", starts_at: "2026-07-14T00:00:00Z", ends_at: "2026-07-14T01:00:00Z",
  program_image_url: "/v1/images/news/medium",
};

test("normalizes current program without image metadata", () => {
  const programs = normalizeNowResponse({ results: [{ radio_id: "radio-1", current, next: {
    title: "오전 프로그램", starts_at: "2026-07-14T01:00:00Z", ends_at: "2026-07-14T02:00:00Z",
  } }] }, "https://epg.test");
  assert.equal(programs.get("radio-1").title, "KBS 뉴스");
  assert.equal("programImageUrl" in programs.get("radio-1"), false);
  assert.equal(programs.get("radio-1").nextProgram.title, "오전 프로그램");
});

test("clamps progress and refreshes no later than the API cache window", () => {
  const program = { startsAt: new Date("2026-07-14T00:00:00Z"), endsAt: new Date("2026-07-14T01:00:00Z") };
  assert.equal(progressAt(program, new Date("2026-07-14T00:30:00Z")), 50);
  assert.equal(progressAt(program, new Date("2026-07-14T02:00:00Z")), 100);
  assert.ok(nextRefreshDelay(program, new Date("2026-07-14T00:59:59Z")) <= 30_000);
});

test("formats schedule times as fixed 24-hour HH:mm labels", () => {
  assert.equal(formatProgramTime(new Date("2026-07-14T00:05:00Z")), "09:05");
});

test("builds finite Media Session progress from the current program", () => {
  const program = { startsAt: new Date("2026-07-14T00:00:00Z"), endsAt: new Date("2026-07-14T01:00:00Z") };
  assert.deepEqual(programPositionState(program, new Date("2026-07-14T00:15:00Z")), {
    duration: 3600,
    playbackRate: 1,
    position: 900,
  });
});

test("fetchCurrentPrograms splits requests at the API limit", async () => {
  const ids = Array.from({ length: 101 }, (_, index) => `radio-${index}`);
  const requested = [];
  const programs = await fetchCurrentPrograms(ids, async (url) => {
    requested.push(new URL(url).searchParams.get("radio_ids").split(",").length);
    return { ok: true, json: async () => ({ results: [] }) };
  }, "https://epg.test");
  assert.deepEqual(requested, [100, 1]);
  assert.equal(programs.size, 0);
});

test("fetchCurrentPrograms keeps mixed results in request order without retries", async () => {
  const requested = [];
  const unknownIds = [];
  const programs = await fetchCurrentPrograms(["known", "unknown", "unavailable"], async (url) => {
    const ids = new URL(url).searchParams.get("radio_ids").split(",");
    requested.push(ids);
    return {
      ok: true,
      json: async () => ({ results: [
        { radio_id: "known", status: "ok", current },
        { radio_id: "unknown", status: "not_found", current: null, next: null },
        { radio_id: "unavailable", status: "unavailable", current: null, next: null },
      ] }),
    };
  }, "https://epg.test", {
    onUnknownId(id) {
      unknownIds.push(id);
    },
  });
  assert.equal(programs.get("known").title, "KBS 뉴스");
  assert.equal(programs.get("unknown"), null);
  assert.equal(programs.get("unavailable"), null);
  assert.deepEqual([...programs.keys()], ["known", "unknown", "unavailable"]);
  assert.deepEqual(requested, [["known", "unknown", "unavailable"]]);
  assert.deepEqual(unknownIds, ["unknown"]);
});

test("fetchCurrentPrograms reports each successful batch as it arrives", async () => {
  const updates = [];
  await fetchCurrentPrograms(["known"], async () => {
    return { ok: true, json: async () => ({ results: [{ radio_id: "known", status: "ok", current }] }) };
  }, "https://epg.test", {
    onUpdate(programs) {
      updates.push([...programs.keys()]);
    },
  });
  assert.deepEqual(updates, [["known"]]);
});

test("prioritizeRadioIds separates the active channel from background requests", () => {
  assert.deepEqual(prioritizeRadioIds(["one", "active", "two"], "active"), {
    priority: ["active"],
    background: ["one", "two"],
  });
});

test("unknown EPG IDs are cached for one day", () => {
  const cached = serializeUnknownEpgIds(new Set(["unknown"]), 1_000);
  assert.deepEqual([...parseUnknownEpgIds(cached, 2_000)], ["unknown"]);
  assert.deepEqual([...parseUnknownEpgIds(cached, 86_401_001)], []);
});
