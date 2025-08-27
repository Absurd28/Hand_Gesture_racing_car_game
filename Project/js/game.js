import { Car } from "./car.js";
import { getControlState, stepHandTracking } from "./handGestures.js";

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.road = { x: 200, width: 400 }; // centered road
    this.car = new Car(this.road.x + this.road.width / 2 - 20, canvas.height - 90);

    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1.0; // seconds

    this.scroll = 0;
    this.scrollSpeed = 180; // px/sec, ties to car speed
    this.score = 0;
    this.distance = 0;

    this.running = false;
    this.paused = false;
    this.lastTime = 0;

    // UI references
    this.speedDisplay = document.getElementById("speedDisplay");
    this.scoreDisplay = document.getElementById("scoreDisplay");
    this.distanceDisplay = document.getElementById("distanceDisplay");
    this.gestureText = document.getElementById("gestureText");
    this.gestureIndicator = document.getElementById("gestureIndicator");
  }

  reset() {
    this.car = new Car(this.road.x + this.road.width / 2 - 20, this.canvas.height - 90);
    this.obstacles = [];
    this.spawnTimer = 0;
    this.scroll = 0;
    this.score = 0;
    this.distance = 0;
    this.running = false;
    this.paused = false;
    this.lastTime = performance.now();
  }

  spawnObstacle() {
    const laneCount = 3;
    const laneWidth = this.road.width / laneCount;
    const lane = Math.floor(Math.random() * laneCount);
    const width = 40 + Math.random() * 20;
    const height = 70;
    const x = this.road.x + lane * laneWidth + (laneWidth - width) / 2;
    const y = -height - 20;
    const color = ["#ff5555", "#ffaa00", "#55ff55"][lane];
    this.obstacles.push({ x, y, width, height, color });
  }

  update(dt) {
    if (!this.running || this.paused) return;

    // Controls from gestures
    const { steer, accelerate, brake, label } = getControlState();
    // Update gesture UI
    this.gestureText.textContent = label;
    this.gestureIndicator.className = "gesture-indicator";
    if (steer < -0.25) this.gestureIndicator.classList.add("left");
    else if (steer > 0.25) this.gestureIndicator.classList.add("right");
    if (brake) this.gestureIndicator.classList.add("brake");
    if (accelerate) this.gestureIndicator.classList.add("accelerate");

    // Car longitudinal speed target from accelerate/brake
    this.car.update(dt, steer, accelerate, brake, this.road);

    // Background scroll tied to speed
    this.scroll += (this.car.speed + this.scrollSpeed * 0.2) * dt;
    this.distance += (this.car.speed * dt) * 0.4;
    this.score += Math.max(0, Math.floor(this.car.speed * dt * 0.25));

    // Spawn obstacles
    this.spawnTimer += dt;
    const dynamicSpawn = Math.max(0.55, this.spawnInterval - this.car.speed / 1200);
    if (this.spawnTimer > dynamicSpawn) {
      this.spawnObstacle();
      this.spawnTimer = 0;
    }

    // Move obstacles
    for (const o of this.obstacles) {
      o.y += (220 + this.car.speed * 0.6) * dt;
    }
    // Remove off-screen
    this.obstacles = this.obstacles.filter((o) => o.y < this.canvas.height + 100);

    // Collisions
    for (const o of this.obstacles) {
      if (this.car.collideRect(o)) {
        this.car.alive = false;
        this.running = false;
        this.gestureText.textContent = "Crashed!";
        break;
      }
    }

    // Update UI numbers
    const kmh = Math.round((this.car.speed / 420) * this.car.maxSpeed);
    this.speedDisplay.textContent = kmh.toString();
    this.scoreDisplay.textContent = this.score.toString();
    this.distanceDisplay.textContent = Math.floor(this.distance).toString();
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = "#0b132b";
    ctx.fillRect(0, 0, w, h);

    // Road
    ctx.fillStyle = "#192b4d";
    ctx.fillRect(this.road.x, 0, this.road.width, h);

    // Lane markers scrolling
    const laneCount = 3;
    const laneWidth = this.road.width / laneCount;
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 16]);
    const offset = this.scroll % 34;
    for (let i = 1; i < laneCount; i++) {
      const x = this.road.x + i * laneWidth;
      ctx.beginPath();
      ctx.moveTo(x, -offset);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Obstacles
    for (const o of this.obstacles) {
      ctx.fillStyle = o.color;
      ctx.fillRect(o.x, o.y, o.width, o.height);
    }

    // Player car
    this.car.draw(ctx);

    // HUD if not running
    if (!this.running) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.font = "24px Arial";
      const msg = this.car.alive ? "Press Start to Play" : "Crashed! Press Reset";
      ctx.fillText(msg, w / 2, h / 2);
    }

    // Hand tracking step on draw timing
    stepHandTracking(performance.now());
  }
}
