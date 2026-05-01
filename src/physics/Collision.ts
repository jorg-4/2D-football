import { Vec2 } from './Vec2.js';

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Sweep a circle of `radius` from `from` to `to` against an axis-aligned
 * rectangle. Returns the time-of-impact in [0,1] and the surface normal,
 * or null if no hit. Handles the rect's expansion by `radius` on all sides
 * and clamps the corners properly.
 */
export interface SweepHit {
  t: number;
  nx: number;
  ny: number;
}

export function sweepCircleVsAabb(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
  rect: AABB,
): SweepHit | null {
  const dx = toX - fromX;
  const dy = toY - fromY;

  // Expand rect by radius (Minkowski-sum approximation; corners are not
  // perfectly rounded, but adequate for an axis-aligned playing field).
  const ex0 = rect.minX - radius;
  const ey0 = rect.minY - radius;
  const ex1 = rect.maxX + radius;
  const ey1 = rect.maxY + radius;

  // Trivial reject: starting point already past the box and moving away.
  let tEnter = -Infinity;
  let tExit = Infinity;
  let nx = 0;
  let ny = 0;

  // X slab.
  if (Math.abs(dx) < 1e-9) {
    if (fromX < ex0 || fromX > ex1) return null;
  } else {
    const inv = 1 / dx;
    let t0 = (ex0 - fromX) * inv;
    let t1 = (ex1 - fromX) * inv;
    let snx = -1;
    if (t0 > t1) {
      const tmp = t0;
      t0 = t1;
      t1 = tmp;
      snx = 1;
    }
    if (t0 > tEnter) {
      tEnter = t0;
      nx = snx;
      ny = 0;
    }
    if (t1 < tExit) tExit = t1;
    if (tEnter > tExit) return null;
  }

  // Y slab.
  if (Math.abs(dy) < 1e-9) {
    if (fromY < ey0 || fromY > ey1) return null;
  } else {
    const inv = 1 / dy;
    let t0 = (ey0 - fromY) * inv;
    let t1 = (ey1 - fromY) * inv;
    let sny = -1;
    if (t0 > t1) {
      const tmp = t0;
      t0 = t1;
      t1 = tmp;
      sny = 1;
    }
    if (t0 > tEnter) {
      tEnter = t0;
      nx = 0;
      ny = sny;
    }
    if (t1 < tExit) tExit = t1;
    if (tEnter > tExit) return null;
  }

  if (tEnter < 0 || tEnter > 1) return null;
  return { t: tEnter, nx, ny };
}

/** Resolve two overlapping circles by separating along the contact normal. */
export function resolveCircleCircle(
  ax: number,
  ay: number,
  ar: number,
  am: number,
  avx: number,
  avy: number,
  bx: number,
  by: number,
  br: number,
  bm: number,
  bvx: number,
  bvy: number,
  restitution: number,
): {
  ax: number;
  ay: number;
  avx: number;
  avy: number;
  bx: number;
  by: number;
  bvx: number;
  bvy: number;
} | null {
  const dx = bx - ax;
  const dy = by - ay;
  const distSq = dx * dx + dy * dy;
  const minDist = ar + br;
  if (distSq >= minDist * minDist || distSq < 1e-12) {
    return null;
  }
  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = minDist - dist;

  const totalMass = am + bm;
  const aPush = bm / totalMass;
  const bPush = am / totalMass;

  const newAx = ax - nx * overlap * aPush;
  const newAy = ay - ny * overlap * aPush;
  const newBx = bx + nx * overlap * bPush;
  const newBy = by + ny * overlap * bPush;

  // Relative velocity along normal.
  const rvx = bvx - avx;
  const rvy = bvy - avy;
  const velAlongNormal = rvx * nx + rvy * ny;

  let avxOut = avx;
  let avyOut = avy;
  let bvxOut = bvx;
  let bvyOut = bvy;
  if (velAlongNormal < 0) {
    const e = restitution;
    const j = -(1 + e) * velAlongNormal / (1 / am + 1 / bm);
    const ix = j * nx;
    const iy = j * ny;
    avxOut = avx - ix / am;
    avyOut = avy - iy / am;
    bvxOut = bvx + ix / bm;
    bvyOut = bvy + iy / bm;
  }

  return {
    ax: newAx,
    ay: newAy,
    avx: avxOut,
    avy: avyOut,
    bx: newBx,
    by: newBy,
    bvx: bvxOut,
    bvy: bvyOut,
  };
}

export function reflect(vx: number, vy: number, nx: number, ny: number, restitution: number): { vx: number; vy: number } {
  const dot = vx * nx + vy * ny;
  return {
    vx: vx - (1 + restitution) * dot * nx,
    vy: vy - (1 + restitution) * dot * ny,
  };
}

export function clampPointToRect(x: number, y: number, rect: AABB): { x: number; y: number } {
  return {
    x: Math.max(rect.minX, Math.min(rect.maxX, x)),
    y: Math.max(rect.minY, Math.min(rect.maxY, y)),
  };
}

export const Vec2Helpers = Vec2;
