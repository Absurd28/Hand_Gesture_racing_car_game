let handLandmarker = null;
let running = false;
let videoEl = null;
let handCanvas = null;
let handCtx = null;
let lastVideoTime = -1;

const controlState = { steer: 0, accelerate: false, brake: false, label: "None" };
let steerEMA = 0;
const steerAlpha = 0.35;
const THUMB_X_LEFT = -0.28;
const THUMB_X_RIGHT = 0.28;

async function loadModel() {
  const { HandLandmarker, FilesetResolver } = window;
  // Important: use the official wasm base path
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  ); // CDN hosts both simd and non-simd bundles. [2]
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    },
    numHands: 1,
    runningMode: "VIDEO",
  }); // Use VIDEO mode for detectForVideo. [1]
}

export async function initHandTracking(video, canvas) {
  videoEl = video;
  handCanvas = canvas;
  handCtx = handCanvas.getContext("2d");
  await loadModel(); // load wasm + model
  // Ensure video is actually playing before detection
  if (videoEl.readyState < 2) {
    await videoEl.play();
  }
  // Some versions require an explicit setOptions to switch modes at runtime
  if (handLandmarker.setOptions) {
    await handLandmarker.setOptions({ runningMode: "VIDEO" });
  } // [1][9]
}

export async function startHandTracking() {
  running = true;
}

export function stopHandTracking() {
  running = false;
  controlState.steer = 0;
  controlState.accelerate = false;
  controlState.brake = false;
  controlState.label = "Stopped";
  drawOverlay(null);
}

export function getControlState() {
  return { ...controlState };
}

function drawOverlay(result) {
  const ctx = handCtx;
  const w = handCanvas.width;
  const h = handCanvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!result || !result.landmarks || result.landmarks.length === 0) return;
  const lm = result.landmarks;
  ctx.strokeStyle = "#00ffe1";
  ctx.lineWidth = 2;
  ctx.fillStyle = "#00ffe1";
  for (const p of lm) {
    ctx.beginPath();
    ctx.arc(p.x * w, p.y * h, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function attachCameraStream(video) {
  // Must be served on https or localhost for permissions to work. [12][10]
  return navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    return video.play();
  });
}

function classifyGesture(landmarks) {
  const tip = landmarks[13];
  const mcp = landmarks[14];
  const thumbVecX = tip.x - mcp.x;

  const fingerTipIdx = [8, 12, 16, 20];
  const fingerMcpIdx = [5, 9, 13, 17];
  let openness = 0;
  for (let i = 0; i < 4; i++) {
    const tipP = landmarks[fingerTipIdx[i]];
    const mcpP = landmarks[fingerMcpIdx[i]];
    openness += Math.hypot(tipP.x - mcpP.x, tipP.y - mcpP.y);
  }
  openness /= 4;
  const isPalmOpen = openness > 0.085;
  const isFist = openness < 0.055;

  let steer = 0;
  let label = "Neutral";
  if (thumbVecX < THUMB_X_LEFT) { steer = -1; label = "Thumb Left"; }
  else if (thumbVecX > THUMB_X_RIGHT) { steer = 1; label = "Thumb Right"; }

  return {
    steer,
    accelerate: isFist,
    brake: isPalmOpen,
    label: steer !== 0 ? label : isFist ? "Fist (Accel)" : isPalmOpen ? "Open Palm (Brake)" : "Neutral",
  };
}

export function stepHandTracking(ts) {
  if (!running || !handLandmarker || !videoEl) return;
  // detectForVideo must be called only when the video time has advanced. [9]
  if (videoEl.currentTime === lastVideoTime) return;

  const result = handLandmarker.detectForVideo(videoEl, ts);
  lastVideoTime = videoEl.currentTime;

  drawOverlay(result);

  if (result && result.landmarks && result.landmarks.length > 0) {
    const g = classifyGesture(result.landmarks);
    steerEMA = steerAlpha * g.steer + (1 - steerAlpha) * steerEMA;
    controlState.steer = Math.max(-1, Math.min(1, steerEMA));
    controlState.accelerate = g.accelerate;
    controlState.brake = g.brake;
    controlState.label = g.label;
  } else {
    steerEMA = steerAlpha * 0 + (1 - steerAlpha) * steerEMA;
    if (Math.abs(steerEMA) < 0.02) steerEMA = 0;
    controlState.steer = steerEMA;
    controlState.accelerate = false;
    controlState.brake = false;
    controlState.label = "No hand";
  }
}
