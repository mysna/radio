import test from "node:test";
import assert from "node:assert/strict";

import {
  registerRadioMediaSessionActions,
  setMediaSessionActionHandler,
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
