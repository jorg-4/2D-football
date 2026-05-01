import { describe, expect, it } from 'vitest';
import {
  reflect,
  resolveCircleCircle,
  sweepCircleVsAabb,
} from '../src/physics/Collision.js';

describe('sweepCircleVsAabb', () => {
  it('hits a wall directly in front', () => {
    const hit = sweepCircleVsAabb(0, 0, 100, 0, 5, {
      minX: 50,
      minY: -50,
      maxX: 60,
      maxY: 50,
    });
    expect(hit).not.toBeNull();
    expect(hit!.t).toBeCloseTo((50 - 5) / 100);
    expect(hit!.nx).toBe(-1);
    expect(hit!.ny).toBe(0);
  });

  it('returns null when path misses the box', () => {
    const hit = sweepCircleVsAabb(0, 0, 100, 0, 5, {
      minX: 50,
      minY: 100,
      maxX: 60,
      maxY: 200,
    });
    expect(hit).toBeNull();
  });

  it('does not tunnel through a wall at high speed', () => {
    // Ball jumping from x=0 to x=200 should still register a hit on a wall at 50–60.
    const hit = sweepCircleVsAabb(0, 0, 200, 0, 5, {
      minX: 50,
      minY: -50,
      maxX: 60,
      maxY: 50,
    });
    expect(hit).not.toBeNull();
    expect(hit!.t).toBeLessThan(1);
  });
});

describe('reflect', () => {
  it('inverts normal-aligned velocity with full restitution', () => {
    const r = reflect(10, 0, -1, 0, 1.0);
    expect(r.vx).toBeCloseTo(-10);
    expect(r.vy).toBeCloseTo(0);
  });

  it('reduces magnitude at restitution < 1', () => {
    const r = reflect(10, 0, -1, 0, 0.5);
    expect(r.vx).toBeCloseTo(-5);
  });

  it('preserves tangential velocity', () => {
    const r = reflect(10, 5, 0, -1, 1.0);
    expect(r.vx).toBeCloseTo(10);
    expect(r.vy).toBeCloseTo(-5);
  });
});

describe('resolveCircleCircle', () => {
  it('returns null when circles are not overlapping', () => {
    const out = resolveCircleCircle(
      0, 0, 5, 1, 0, 0,
      20, 0, 5, 1, 0, 0,
      0.5,
    );
    expect(out).toBeNull();
  });

  it('separates overlapping circles', () => {
    const out = resolveCircleCircle(
      0, 0, 5, 1, 0, 0,
      8, 0, 5, 1, 0, 0,
      0.5,
    );
    expect(out).not.toBeNull();
    const dx = out!.bx - out!.ax;
    expect(dx).toBeGreaterThanOrEqual(10 - 1e-6);
  });
});
