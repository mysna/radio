import test from "node:test";
import assert from "node:assert/strict";
import { fetchCurrentPrograms, imageUrl, nextRefreshDelay, normalizeNowResponse, progressAt } from "../src/epg.js";

const current = {
  title: "KBS 뉴스", starts_at: "2026-07-14T00:00:00Z", ends_at: "2026-07-14T01:00:00Z",
  program_image_url: "/v1/images/news/medium",
};

test("normalizes current program and resolves image URLs", () => {
  const programs = normalizeNowResponse({ results: [{ radio_id: "radio-1", current }] }, "https://epg.test");
  assert.equal(programs.get("radio-1").title, "KBS 뉴스");
  assert.equal(programs.get("radio-1").programImageUrl, "https://epg.test/v1/images/news/medium");
});

test("clamps progress and refreshes no later than the API cache window", () => {
  const program = { startsAt: new Date("2026-07-14T00:00:00Z"), endsAt: new Date("2026-07-14T01:00:00Z") };
  assert.equal(progressAt(program, new Date("2026-07-14T00:30:00Z")), 50);
  assert.equal(progressAt(program, new Date("2026-07-14T02:00:00Z")), 100);
  assert.ok(nextRefreshDelay(program, new Date("2026-07-14T00:59:59Z")) <= 30_000);
});

test("imageUrl accepts empty values", () => {
  assert.equal(imageUrl("", "https://epg.test"), "");
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

test("fetchCurrentPrograms isolates unknown aliases from a rejected batch", async () => {
  const requested = [];
  const programs = await fetchCurrentPrograms(["known", "unknown"], async (url) => {
    const ids = new URL(url).searchParams.get("radio_ids").split(",");
    requested.push(ids);
    if (ids.includes("unknown")) return { ok: false, status: 404 };
    return {
      ok: true,
      json: async () => ({ results: [{ radio_id: "known", current }] }),
    };
  }, "https://epg.test");
  assert.equal(programs.get("known").title, "KBS 뉴스");
  assert.deepEqual(requested, [["known", "unknown"], ["known"], ["unknown"]]);
});
