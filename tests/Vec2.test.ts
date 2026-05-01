import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/physics/Vec2.js';

describe('Vec2', () => {
  it('adds and subtracts', () => {
    const a = new Vec2(1, 2).add(new Vec2(3, 4));
    expect(a.x).toBe(4);
    expect(a.y).toBe(6);
  });

  it('normalizes a non-zero vector', () => {
    const v = new Vec2(3, 4).normalize();
    expect(v.length()).toBeCloseTo(1);
  });

  it('handles zero-length normalize without NaN', () => {
    const v = new Vec2(0, 0).normalize();
    expect(v.x).toBe(0);
    expect(v.y).toBe(0);
  });

  it('clamps length', () => {
    const v = new Vec2(10, 0).clampLength(5);
    expect(v.length()).toBeCloseTo(5);
  });

  it('addScaled', () => {
    const v = new Vec2(1, 1).addScaled(new Vec2(2, 3), 2);
    expect(v.x).toBe(5);
    expect(v.y).toBe(7);
  });
});
