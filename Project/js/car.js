export class Car {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 70;
    this.maxSpeed = 260; // km/h display
    this.speed = 0; // internal px/sec scaled
    this.accel = 220; // px/s^2
    this.brakeAccel = 400;
    this.friction = 120; // px/s^2
    this.lateralSpeed = 300; // px/sec at full steer
    this.color = "#00d9ff";
    this.alive = true;
  }

  update(dt, steer, accelerate, brake, bounds) {
    if (!this.alive) return;

    // Longitudinal dynamics
    if (accelerate) this.speed += this.accel * dt;
    if (brake) this.speed -= this.brakeAccel * dt;

    // Natural friction
    if (!accelerate && !brake) {
      if (this.speed > 0) this.speed = Math.max(0, this.speed - this.friction * dt);
      else if (this.speed < 0) this.speed = Math.min(0, this.speed + this.friction * dt);
    }

    // Clamp speed
    const maxPxSpeed = 420; // px/sec corresponding to ~260 km/h UI
    this.speed = Math.max(0, Math.min(maxPxSpeed, this.speed));

    // Lateral movement from steering in [-1,1]
    this.x += steer * this.lateralSpeed * dt;

    // Forward motion simulated by background scrolling in game.js

    // Keep car within road bounds
    if (bounds) {
      const minX = bounds.x + 10;
      const maxX = bounds.x + bounds.width - this.width - 10;
      this.x = Math.max(minX, Math.min(maxX, this.x));
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Simple windshield
    ctx.fillStyle = "#003b47";
    ctx.fillRect(this.x + 6, this.y + 10, this.width - 12, 16);

    // Wheels
    ctx.fillStyle = "#111";
    ctx.fillRect(this.x - 6, this.y + 8, 6, 14);
    ctx.fillRect(this.x + this.width, this.y + 8, 6, 14);
    ctx.fillRect(this.x - 6, this.y + this.height - 22, 6, 14);
    ctx.fillRect(this.x + this.width, this.y + this.height - 22, 6, 14);
    ctx.restore();
  }

  collideRect(r) {
    return !(
      this.x + this.width < r.x ||
      this.x > r.x + r.width ||
      this.y + this.height < r.y ||
      this.y > r.y + r.height
    );
  }
}
