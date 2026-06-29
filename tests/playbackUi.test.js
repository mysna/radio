import test from "node:test";
import assert from "node:assert/strict";

import {
  getPlaybackFailureMessage,
  getPlaybackButtonState,
  shouldAutoplayRestoredChannel,
} from "../src/playbackUi.js";

test("getPlaybackButtonState shows play when a channel can start", () => {
  assert.deepEqual(getPlaybackButtonState({
    hasPlayableChannel: true,
    isPlaying: false,
  }), {
    label: "재생",
    ariaLabel: "재생",
    disabled: false,
  });
});

test("getPlaybackButtonState shows stop while audio is playing", () => {
  assert.deepEqual(getPlaybackButtonState({
    hasPlayableChannel: true,
    isPlaying: true,
  }), {
    label: "정지",
    ariaLabel: "정지",
    disabled: false,
  });
});

test("getPlaybackButtonState disables playback without playable channels", () => {
  assert.deepEqual(getPlaybackButtonState({
    hasPlayableChannel: false,
    isPlaying: false,
  }), {
    label: "재생",
    ariaLabel: "재생할 채널이 없습니다",
    disabled: true,
  });
});

test("shouldAutoplayRestoredChannel allows startup playback for saved channels in the playlist", () => {
  const selectedIds = new Set(["kbs-1radio"]);
  const channels = [{ id: "kbs-1radio" }];

  assert.equal(shouldAutoplayRestoredChannel("kbs-1radio", channels, selectedIds), true);
});

test("shouldAutoplayRestoredChannel skips startup playback without a saved playlist channel", () => {
  const selectedIds = new Set(["kbs-1radio"]);
  const channels = [{ id: "kbs-1radio" }, { id: "mbc-fm4u" }];

  assert.equal(shouldAutoplayRestoredChannel("", channels, selectedIds), false);
  assert.equal(shouldAutoplayRestoredChannel("mbc-fm4u", channels, selectedIds), false);
});

test("getPlaybackFailureMessage explains browser autoplay blocking for restored channels", () => {
  assert.equal(
    getPlaybackFailureMessage({ name: "NotAllowedError" }, { isRestoredStartup: true }),
    "브라우저 자동재생 제한으로 멈춰 있습니다. 재생을 눌러 마지막 채널을 이어 들으세요.",
  );
});

test("getPlaybackFailureMessage keeps the generic message for normal playback failures", () => {
  assert.equal(
    getPlaybackFailureMessage(new Error("network"), { isRestoredStartup: false }),
    "재생이 시작되지 않으면 채널을 다시 선택해 주세요.",
  );
});
