import { Body } from '../physics/Body.js';

export const BALL = {
  radius: 10,
  mass: 0.3,
  damping: 0.6,
  wallRestitution: 0.55,
  playerRestitution: 0.4,
  maxSpeed: 1400,
} as const;

export class Ball {
  readonly body: Body;
  /** Spin angle in radians, derived from velocity for visual rotation. */
  spin = 0;
  /** Trail recorded for high-speed visualization. */
  readonly trail: Array<{ x: number; y: number }> = [];

  constructor(x: number, y: number) {
    this.body = new Body(BALL.radius, BALL.mass, BALL.damping, x, y);
  }

  reset(x: number, y: number): void {
    this.body.pos.set(x, y);
    this.body.prevPos.set(x, y);
    this.body.vel.set(0, 0);
    this.spin = 0;
    this.trail.length = 0;
  }

  capSpeed(): void {
    const v = this.body.vel;
    const sp = Math.hypot(v.x, v.y);
    if (sp > BALL.maxSpeed) {
      const k = BALL.maxSpeed / sp;
      v.x *= k;
      v.y *= k;
    }
  }

  updateTrail(): void {
    const v = this.body.vel;
    const sp = Math.hypot(v.x, v.y);
    this.spin += sp * 0.0006;
    if (sp > 700) {
      this.trail.push({ x: this.body.pos.x, y: this.body.pos.y });
      if (this.trail.length > 6) this.trail.shift();
    } else if (this.trail.length > 0) {
      this.trail.shift();
    }
  }
}
