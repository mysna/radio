const BAR_COUNT = 56;
const BAR_GAP = 4;
const MIN_BAR_HEIGHT = 3;
const IDLE_LEVEL = 0.05;
const IDLE_LEVELS = Array.from({ length: BAR_COUNT }, () => IDLE_LEVEL);

export function createAudioVisualizer({ audio, canvas, windowRef = window }) {
  const context = canvas.getContext("2d");
  const state = {
    analyser: null,
    data: null,
    frameId: 0,
    mediaSource: null,
    audioContext: null,
    isRunning: false,
    lastLiveSampleAt: 0,
  };

  function setupAudioGraph() {
    if (state.analyser || !windowRef.AudioContext && !windowRef.webkitAudioContext) {
      return;
    }

    try {
      const AudioContext = windowRef.AudioContext || windowRef.webkitAudioContext;
      state.audioContext = new AudioContext();
      state.mediaSource = state.audioContext.createMediaElementSource(audio);
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 256;
      state.analyser.smoothingTimeConstant = 0.72;
      state.data = new Uint8Array(state.analyser.frequencyBinCount);
      state.mediaSource.connect(state.analyser);
      state.analyser.connect(state.audioContext.destination);
    } catch {
      state.analyser = null;
      state.data = null;
      state.mediaSource = null;
      state.audioContext = null;
    }
  }

  function resume() {
    setupAudioGraph();

    if (state.audioContext?.state === "suspended") {
      return state.audioContext.resume().catch(() => {});
    }

    return Promise.resolve();
  }

  function start() {
    state.isRunning = true;
    resume();
    draw();
  }

  function stop() {
    state.isRunning = false;
    if (state.frameId) {
      windowRef.cancelAnimationFrame(state.frameId);
      state.frameId = 0;
    }
    drawIdle();
  }

  function draw() {
    resizeCanvas(canvas, windowRef);
    const levels = getLevels();
    drawBars(context, canvas, levels, getBarColor(canvas));

    if (state.isRunning) {
      state.frameId = windowRef.requestAnimationFrame(draw);
    }
  }

  function getLevels() {
    if (!state.analyser || !state.data || audio.paused) {
      return audio.paused ? IDLE_LEVELS : getAnimatedFallbackLevels(windowRef.performance.now());
    }

    state.analyser.getByteFrequencyData(state.data);
    const sourceLevels = [];
    const bucketSize = Math.max(1, Math.floor(state.data.length / BAR_COUNT));
    let liveTotal = 0;

    for (let index = 0; index < BAR_COUNT; index += 1) {
      let bucketTotal = 0;
      for (let offset = 0; offset < bucketSize; offset += 1) {
        bucketTotal += state.data[index * bucketSize + offset] || 0;
      }

      const level = bucketTotal / bucketSize / 255;
      liveTotal += level;
      sourceLevels.push(level);
    }

    const levels = createCenteredLevels(sourceLevels);

    if (liveTotal > 0.12) {
      state.lastLiveSampleAt = windowRef.performance.now();
      return levels;
    }

    return windowRef.performance.now() - state.lastLiveSampleAt > 1000
      ? getAnimatedFallbackLevels(windowRef.performance.now())
      : levels;
  }

  function drawIdle() {
    resizeCanvas(canvas, windowRef);
    drawBars(context, canvas, IDLE_LEVELS, getBarColor(canvas));
  }

  drawIdle();

  return { start, stop, resume };
}

function resizeCanvas(canvas, windowRef) {
  const pixelRatio = windowRef.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
  const height = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function getBarColor(canvas) {
  return canvas.ownerDocument.defaultView
    .getComputedStyle(canvas)
    .getPropertyValue("--visualizer-bar-color")
    .trim() || "#16a34a";
}

function getAnimatedFallbackLevels(time) {
  const phase = time / 145;

  return createCenteredLevels(Array.from({ length: BAR_COUNT }, (_, index) => {
    const primary = Math.sin(phase + index * 0.72);
    const secondary = Math.sin(phase * 0.43 + index * 1.37);
    return 0.34 + primary * 0.18 + secondary * 0.1;
  }));
}

function createCenteredLevels(sourceLevels) {
  return sourceLevels.map((level, index) => {
    const envelope = getCenterEnvelope(index);
    return Math.max(0.08, Math.min(1, level * envelope));
  });
}

function getCenterEnvelope(index) {
  const center = (BAR_COUNT - 1) / 2;
  const distance = Math.abs(index - center) / center;
  return 0.18 + (1 - distance) ** 1.8 * 1.95;
}

function drawBars(context, canvas, levels, color) {
  const width = canvas.width;
  const height = canvas.height;
  const pixelRatio = canvas.ownerDocument.defaultView.devicePixelRatio || 1;
  const gap = BAR_GAP * pixelRatio;
  const barWidth = Math.max(2, (width - gap * (BAR_COUNT - 1)) / BAR_COUNT);

  context.clearRect(0, 0, width, height);
  context.fillStyle = color;

  levels.slice(0, BAR_COUNT).forEach((level, index) => {
    const barHeight = Math.max(MIN_BAR_HEIGHT, Math.round(height * Math.min(1, level)));
    const x = index * (barWidth + gap);
    const y = (height - barHeight) / 2;
    const radius = Math.min(barWidth / 2, barHeight / 2);
    drawRoundRect(context, x, y, barWidth, barHeight, radius);
  });
}

function drawRoundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.fill();
}
