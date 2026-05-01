import { Body } from '../physics/Body.js';
import { Side } from './Player.js';

export const GK = {
  radius: 22,
  mass: 1.2,
  damping: 6.0,
  trackingStiffness: 6.0,
  lungeSpeed: 360,
  clearPower: 1000,
  /** Trigger lunge when ball moving toward goal at this minimum speed */
  lungeThresholdSpeed: 800,
} as const;

export class Goalkeeper {
  readonly body: Body;
  readonly side: Side;
  /** GK is constrained to this rectangle. */
  readonly box: { minX: number; maxX: number; minY: number; maxY: number };

  constructor(side: Side, x: number, y: number, box: Goalkeeper['box']) {
    this.side = side;
    this.body = new Body(GK.radius, GK.mass, GK.damping, x, y);
    this.box = box;
  }

  reset(x: number, y: number): void {
    this.body.pos.set(x, y);
    this.body.prevPos.set(x, y);
    this.body.vel.set(0, 0);
  }
}
