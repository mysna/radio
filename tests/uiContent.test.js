import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");

test("player panel uses the Korean service title without the old heading", () => {
  assert.match(indexHtml, />대한민국 라디오</);
  assert.doesNotMatch(indexHtml, />라디오 플레이어</);
});
