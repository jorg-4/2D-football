import { Body } from './Body.js';

export class World {
  readonly bodies: Body[] = [];

  add(body: Body): Body {
    this.bodies.push(body);
    return body;
  }

  /**
   * Integrate all bodies for `dt` seconds.
   * Damping is applied as exponential decay: v *= exp(-damping * dt).
   * Does not handle collisions — that's the caller's job.
   */
  integrate(dt: number): void {
    for (const b of this.bodies) {
      b.prevPos.copyFrom(b.pos);
      b.vel.x += b.acc.x * dt;
      b.vel.y += b.acc.y * dt;
      const dampFactor = Math.exp(-b.damping * dt);
      b.vel.x *= dampFactor;
      b.vel.y *= dampFactor;
      b.pos.x += b.vel.x * dt;
      b.pos.y += b.vel.y * dt;
      b.acc.x = 0;
      b.acc.y = 0;
    }
  }
}
