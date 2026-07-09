import test from "node:test";
import assert from "node:assert/strict";

import { createAudioVisualizer } from "../src/audioVisualizer.js";

function createCanvas() {
  const calls = [];
  const context = {
    calls,
    clearRect: (...args) => calls.push(["clearRect", ...args]),
    fill: () => calls.push(["fill"]),
    beginPath: () => calls.push(["beginPath"]),
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    set fillStyle(value) {
      calls.push(["fillStyle", value]);
    },
  };

  return {
    clientWidth: 280,
    clientHeight: 46,
    width: 0,
    height: 0,
    ownerDocument: {
      defaultView: {
        devicePixelRatio: 1,
        getComputedStyle: () => ({
          getPropertyValue: () => "#16a34a",
        }),
      },
    },
    getContext: () => context,
  };
}

test("audio visualizer can resume the audio graph from a user gesture", async () => {
  const createdSources = [];
  let resumeCalls = 0;

  class FakeAudioContext {
    constructor() {
      this.state = "suspended";
      this.destination = {};
    }

    createMediaElementSource(audio) {
      createdSources.push(audio);
      return { connect: () => {} };
    }

    createAnalyser() {
      return {
        fftSize: 0,
        smoothingTimeConstant: 0,
        frequencyBinCount: 4,
        connect: () => {},
        getByteFrequencyData: () => {},
      };
    }

    resume() {
      resumeCalls += 1;
      this.state = "running";
      return Promise.resolve();
    }
  }

  const audio = { paused: false };
  const windowRef = {
    AudioContext: FakeAudioContext,
    cancelAnimationFrame: () => {},
    devicePixelRatio: 1,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
  };

  const visualizer = createAudioVisualizer({
    audio,
    canvas: createCanvas(),
    windowRef,
  });

  await visualizer.resume();
  visualizer.start();

  assert.equal(resumeCalls, 1);
  assert.deepEqual(createdSources, [audio]);
});
