import test from "node:test";
import assert from "node:assert/strict";

import {
  createAudioVisualizer,
  createVisualizerFramesFromAudioBuffer,
  parseHlsSegments,
} from "../src/audioVisualizer.js";

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

test("parseHlsSegments resolves media segment URLs from a live playlist", () => {
  const segments = parseHlsSegments(`#EXTM3U
#EXT-X-VERSION:3
#EXTINF:3.989,
first.aac?m=1
#EXTINF:4.011,
https://cdn.example.test/live/second.aac?m=2
`, "https://cdn.example.test/live/radio.m3u8?token=abc");

  assert.deepEqual(segments, [
    {
      duration: 3.989,
      url: "https://cdn.example.test/live/first.aac?m=1",
    },
    {
      duration: 4.011,
      url: "https://cdn.example.test/live/second.aac?m=2",
    },
  ]);
});

test("createVisualizerFramesFromAudioBuffer converts decoded audio into level frames", () => {
  const samples = Float32Array.from({ length: 4410 }, (_, index) => (
    index < 2205 ? 0.05 : Math.sin(index / 4) * 0.75
  ));

  const frames = createVisualizerFramesFromAudioBuffer({
    duration: 0.1,
    sampleRate: 44100,
    getChannelData: () => samples,
  });

  assert.ok(frames.length > 0);
  assert.equal(frames[0].length, 56);
  assert.ok(frames.at(-1).some((level) => level > 0.2));
});

test("audio visualizer fetches HLS segments when the media analyser stays silent", async () => {
  const fetchedUrls = [];
  const decodedBuffers = [];
  let now = 1_500;

  class FakeAudioContext {
    constructor() {
      this.state = "running";
      this.destination = {};
    }

    createMediaElementSource() {
      return { connect: () => {} };
    }

    createAnalyser() {
      return {
        fftSize: 0,
        smoothingTimeConstant: 0,
        frequencyBinCount: 4,
        connect: () => {},
        getByteFrequencyData: (data) => data.fill(0),
      };
    }

    decodeAudioData(arrayBuffer) {
      decodedBuffers.push(arrayBuffer);
      return Promise.resolve({
        duration: 0.1,
        sampleRate: 44100,
        getChannelData: () => Float32Array.from({ length: 4410 }, (_, index) => (
          Math.sin(index / 3) * 0.6
        )),
      });
    }
  }

  const audio = {
    currentSrc: "https://radio.example.test/stream",
    paused: false,
    src: "https://radio.example.test/stream",
  };
  const windowRef = {
    AudioContext: FakeAudioContext,
    cancelAnimationFrame: () => {},
    devicePixelRatio: 1,
    fetch: (url) => {
      fetchedUrls.push(String(url));
      if (fetchedUrls.length === 1) {
        return Promise.resolve({
          text: () => Promise.resolve(`#EXTM3U
#EXTINF:4,
segment-1.aac
`),
          url: "https://cdn.example.test/live/radio.m3u8",
        });
      }

      return Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
    },
    performance: { now: () => now },
    requestAnimationFrame: () => 1,
  };

  const visualizer = createAudioVisualizer({
    audio,
    canvas: createCanvas(),
    windowRef,
  });

  visualizer.start();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(fetchedUrls, [
    "https://radio.example.test/stream",
    "https://cdn.example.test/live/segment-1.aac",
  ]);
  assert.equal(decodedBuffers.length, 1);
});

test("audio visualizer fetches HLS segments when media element source setup fails", async () => {
  const fetchedUrls = [];

  class FakeAudioContext {
    constructor() {
      this.state = "running";
      this.destination = {};
    }

    createMediaElementSource() {
      throw new Error("media element source unavailable");
    }

    createAnalyser() {
      throw new Error("not reached");
    }

    decodeAudioData() {
      return Promise.resolve({
        duration: 0.1,
        sampleRate: 44100,
        getChannelData: () => Float32Array.from({ length: 4410 }, (_, index) => (
          Math.sin(index / 5) * 0.5
        )),
      });
    }
  }

  const windowRef = {
    AudioContext: FakeAudioContext,
    cancelAnimationFrame: () => {},
    devicePixelRatio: 1,
    fetch: (url) => {
      fetchedUrls.push(String(url));
      if (fetchedUrls.length === 1) {
        return Promise.resolve({
          text: () => Promise.resolve(`#EXTM3U
#EXTINF:4,
segment-1.aac
`),
          url: "https://cdn.example.test/live/radio.m3u8",
        });
      }

      return Promise.resolve({
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
      });
    },
    performance: { now: () => 1_500 },
    requestAnimationFrame: () => 1,
  };

  const visualizer = createAudioVisualizer({
    audio: {
      currentSrc: "https://radio.example.test/stream",
      paused: false,
      src: "https://radio.example.test/stream",
    },
    canvas: createCanvas(),
    windowRef,
  });

  visualizer.start();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(fetchedUrls, [
    "https://radio.example.test/stream",
    "https://cdn.example.test/live/segment-1.aac",
  ]);
});
