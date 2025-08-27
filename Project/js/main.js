import { Game } from "./game.js";
import { initHandTracking, attachCameraStream, startHandTracking, stopHandTracking } from "./handGestures.js";

(async function bootstrap() {
  const gameCanvas = document.getElementById("gameCanvas");
  const webcam = document.getElementById("webcam");
  const handCanvas = document.getElementById("handCanvas");
  const loadingScreen = document.getElementById("loadingScreen");

  const startBtn = document.getElementById("startBtn");
  const pauseBtn = document.getElementById("pauseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const toggleHandBtn = document.getElementById("toggleHandBtn");

  const game = new Game(gameCanvas);

  // Initialize camera and hand model
  loadingScreen.classList.remove("hidden");
  try {
    await attachCameraStream(webcam);
    await initHandTracking(webcam, handCanvas);
    await startHandTracking();
  } catch (e) {
    console.error("Camera/Model error:", e);
    alert("Failed to initialize camera or hand model. Check permissions.");
  } finally {
    loadingScreen.classList.add("hidden");
  }

  // Controls
  startBtn.addEventListener("click", () => {
    if (!game.car.alive) return;
    game.running = true;
    game.paused = false;
  });

  pauseBtn.addEventListener("click", () => {
    if (!game.running) return;
    game.paused = !game.paused;
  });

  resetBtn.addEventListener("click", () => {
    game.reset();
  });

  let handOn = true;
  toggleHandBtn.addEventListener("click", () => {
    handOn = !handOn;
    if (handOn) startHandTracking();
    else stopHandTracking();
    toggleHandBtn.textContent = handOn ? "Toggle Hand Tracking" : "Enable Hand Tracking";
  });

  // Game loop
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    game.update(dt);
    game.draw();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
