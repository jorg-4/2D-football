export class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {}

  static of(x: number, y: number): Vec2 {
    return new Vec2(x, y);
  }

  static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  copy(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  copyFrom(v: Vec2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(v: Vec2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v: Vec2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  addScaled(v: Vec2, s: number): this {
    this.x += v.x * s;
    this.y += v.y * s;
    return this;
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): this {
    const len = this.length();
    if (len > 1e-9) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  clampLength(max: number): this {
    const len = this.length();
    if (len > max && len > 1e-9) {
      this.x = (this.x / len) * max;
      this.y = (this.y / len) * max;
    }
    return this;
  }

  dot(v: Vec2): number {
    return this.x * v.x + this.y * v.y;
  }

  static distance(a: Vec2, b: Vec2): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  static distanceSq(a: Vec2, b: Vec2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  static lerp(a: Vec2, b: Vec2, t: number, out: Vec2 = new Vec2()): Vec2 {
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    return out;
  }
}
