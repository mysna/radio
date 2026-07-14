import test from "node:test";
import assert from "node:assert/strict";

import {
  registerRadioMediaSessionActions,
  setLiveMediaSessionPosition,
  setProgramMediaSessionPosition,
  setMediaSessionActionHandler,
  createRadioMetadata,
} from "../src/mediaSession.js";

test("setMediaSessionActionHandler ignores unsupported browser media actions", () => {
  const mediaSession = {
    setActionHandler() {
      throw new TypeError("unsupported action");
    },
  };

  assert.doesNotThrow(() => {
    setMediaSessionActionHandler(mediaSession, "nexttrack", () => {});
  });
});

test("setMediaSessionActionHandler registers supported browser media actions", () => {
  const calls = [];
  const handler = () => {};
  const mediaSession = {
    setActionHandler(action, callback) {
      calls.push([action, callback]);
    },
  };

  setMediaSessionActionHandler(mediaSession, "nexttrack", handler);

  assert.deepEqual(calls, [["nexttrack", handler]]);
});

test("registerRadioMediaSessionActions maps seek controls to station navigation", () => {
  const calls = [];
  const handlers = {
    previous: () => {},
    next: () => {},
    play: () => {},
    pause: () => {},
  };
  const mediaSession = {
    setActionHandler(action, callback) {
      calls.push([action, callback]);
    },
  };

  registerRadioMediaSessionActions(mediaSession, handlers);

  assert.deepEqual(calls, [
    ["previoustrack", handlers.previous],
    ["nexttrack", handlers.next],
    ["seekbackward", handlers.previous],
    ["seekforward", handlers.next],
    ["play", handlers.play],
    ["pause", handlers.pause],
  ]);
});

test("setLiveMediaSessionPosition marks radio streams as live media", () => {
  const calls = [];
  const mediaSession = {
    setPositionState(state) {
      calls.push(state);
    },
  };

  setLiveMediaSessionPosition(mediaSession);

  assert.deepEqual(calls, [{
    duration: Infinity,
    playbackRate: 1,
    position: 0,
  }]);
});

test("setLiveMediaSessionPosition ignores unsupported browser position state", () => {
  const mediaSession = {
    setPositionState() {
      throw new TypeError("unsupported position state");
    },
  };

  assert.doesNotThrow(() => {
    setLiveMediaSessionPosition(mediaSession);
  });
});

test("setProgramMediaSessionPosition applies scheduled program progress", () => {
  const calls = [];
  setProgramMediaSessionPosition({ setPositionState: (state) => calls.push(state) }, {
    duration: 3600, playbackRate: 1, position: 900,
  });
  assert.deepEqual(calls, [{ duration: 3600, playbackRate: 1, position: 900 }]);
});

test("createRadioMetadata uses program title, channel artist, and artwork", () => {
  assert.deepEqual(createRadioMetadata({
    channelName: "KBS 1라디오",
    regionName: "부산",
    program: { title: "KBS 뉴스", programImageUrl: "https://example.test/news.jpg" },
  }), {
    title: "KBS 뉴스",
    artist: "KBS 1라디오",
    album: "부산",
    artwork: [{ src: "https://example.test/news.jpg", sizes: "512x512", type: "image/jpeg" }],
  });
});
