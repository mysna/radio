import test from "node:test";
import assert from "node:assert/strict";
import { CHANNELS } from "../src/channels.js";

import {
  buildStreamUrl,
  getRegionOptions,
  getNextIndex,
  getPlaylist,
  getPreviousIndex,
  normalizeSelection,
  removeChannel,
  setAllSelected,
  setChannelsSelected,
  toggleChannel,
} from "../src/playerState.js";

const channels = [
  { id: "seoul-sbs-powerfm", name: "SBS 파워FM", stn: "sbs", ch: "powerfm", regionId: "seoul" },
  { id: "busan-knn-lovefm", name: "KNN 러브FM", stn: "sbs", ch: "lovefm", city: "busan", regionId: "busan" },
  { id: "seoul-obs", name: "OBS 라디오", stn: "obs", regionId: "seoul" },
];

test("catalog excludes MBC visible radio", () => {
  assert.equal(CHANNELS.some((channel) => channel.name === "MBC 보이는 라디오"), false);
});

test("catalog excludes community radio stations", () => {
  assert.equal(CHANNELS.some((channel) => channel.stn === "community"), false);
});

test("buildStreamUrl creates the fixed stream URL with optional parameters", () => {
  assert.equal(
    buildStreamUrl(channels[0]),
    "https://radio.bsod.kr/stream/?stn=sbs&ch=powerfm",
  );
  assert.equal(
    buildStreamUrl(channels[1]),
    "https://radio.bsod.kr/stream/?stn=sbs&ch=lovefm&city=busan",
  );
  assert.equal(
    buildStreamUrl(channels[2]),
    "https://radio.bsod.kr/stream/?stn=obs",
  );
});

test("normalizeSelection defaults to every channel when no saved selection exists", () => {
  assert.deepEqual([...normalizeSelection(null, channels)], channels.map((channel) => channel.id));
});

test("normalizeSelection keeps valid saved ids and drops stale ids", () => {
  assert.deepEqual([...normalizeSelection(["busan-knn-lovefm", "missing"], channels)], [
    "busan-knn-lovefm",
  ]);
});

test("toggleChannel updates one selected channel without mutating the original set", () => {
  const selected = new Set(["seoul-sbs-powerfm"]);
  const added = toggleChannel(selected, "busan-knn-lovefm", true);
  const removed = toggleChannel(added, "seoul-sbs-powerfm", false);

  assert.deepEqual([...selected], ["seoul-sbs-powerfm"]);
  assert.deepEqual([...added], ["seoul-sbs-powerfm", "busan-knn-lovefm"]);
  assert.deepEqual([...removed], ["busan-knn-lovefm"]);
});

test("removeChannel removes one playlist channel without mutating the original set", () => {
  const selected = new Set(["seoul-sbs-powerfm", "busan-knn-lovefm"]);
  const removed = removeChannel(selected, "seoul-sbs-powerfm");

  assert.deepEqual([...selected], ["seoul-sbs-powerfm", "busan-knn-lovefm"]);
  assert.deepEqual([...removed], ["busan-knn-lovefm"]);
});

test("setAllSelected selects or clears the whole catalog", () => {
  assert.deepEqual([...setAllSelected(channels, true)], channels.map((channel) => channel.id));
  assert.deepEqual([...setAllSelected(channels, false)], []);
});

test("setChannelsSelected updates only the displayed channel subset", () => {
  const selected = new Set(["busan-knn-lovefm"]);
  const seoulChannels = channels.filter((channel) => channel.regionId === "seoul");
  const added = setChannelsSelected(selected, seoulChannels, true);
  const removed = setChannelsSelected(added, seoulChannels, false);

  assert.deepEqual([...selected], ["busan-knn-lovefm"]);
  assert.deepEqual([...added], ["busan-knn-lovefm", "seoul-sbs-powerfm", "seoul-obs"]);
  assert.deepEqual([...removed], ["busan-knn-lovefm"]);
});

test("getRegionOptions adds nationwide first and shows channel counts", () => {
  const regions = [
    { id: "seoul", name: "수도권" },
    { id: "busan", name: "부산" },
  ];

  assert.deepEqual(getRegionOptions(regions, channels), [
    { id: "all", name: "전국 (3)" },
    { id: "seoul", name: "수도권 (2)" },
    { id: "busan", name: "부산 (1)" },
  ]);
});

test("getPlaylist returns channels in catalog order", () => {
  const selected = new Set(["seoul-obs", "seoul-sbs-powerfm"]);
  assert.deepEqual(
    getPlaylist(channels, selected).map((channel) => channel.id),
    ["seoul-sbs-powerfm", "seoul-obs"],
  );
});

test("previous and next indexes wrap inside the playlist", () => {
  assert.equal(getNextIndex(0, 3), 1);
  assert.equal(getNextIndex(2, 3), 0);
  assert.equal(getNextIndex(-1, 3), 0);
  assert.equal(getPreviousIndex(2, 3), 1);
  assert.equal(getPreviousIndex(0, 3), 2);
  assert.equal(getPreviousIndex(-1, 3), 2);
  assert.equal(getNextIndex(-1, 0), -1);
  assert.equal(getPreviousIndex(-1, 0), -1);
});
