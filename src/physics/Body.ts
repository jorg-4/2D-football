import { Vec2 } from './Vec2.js';

export class Body {
  readonly pos = new Vec2();
  readonly prevPos = new Vec2();
  readonly vel = new Vec2();
  readonly acc = new Vec2();

  constructor(
    public radius: number,
    public mass: number,
    public damping: number,
    x: number,
    y: number,
  ) {
    this.pos.set(x, y);
    this.prevPos.set(x, y);
  }

  applyImpulse(ix: number, iy: number): void {
    this.vel.x += ix / this.mass;
    this.vel.y += iy / this.mass;
  }
}
