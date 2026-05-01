import { describe, expect, it } from 'vitest';
import { Ball } from '../src/entities/Ball.js';
import { LEFT_GOAL, RIGHT_GOAL } from '../src/entities/Pitch.js';
import { ScoringSystem } from '../src/systems/ScoringSystem.js';

describe('ScoringSystem', () => {
  it('detects a goal in the right net', () => {
    const s = new ScoringSystem();
    const b = new Ball(RIGHT_GOAL.innerX + 5, (RIGHT_GOAL.mouthMinY + RIGHT_GOAL.mouthMaxY) / 2);
    expect(s.detectGoal(b)).toBe('right');
    expect(s.score.left).toBe(1);
    expect(s.score.right).toBe(0);
  });

  it('detects a goal in the left net', () => {
    const s = new ScoringSystem();
    const b = new Ball(LEFT_GOAL.innerX - 5, (LEFT_GOAL.mouthMinY + LEFT_GOAL.mouthMaxY) / 2);
    expect(s.detectGoal(b)).toBe('left');
    expect(s.score.right).toBe(1);
  });

  it('does not score on a wide ball', () => {
    const s = new ScoringSystem();
    const b = new Ball(RIGHT_GOAL.innerX + 5, RIGHT_GOAL.mouthMinY - 50);
    expect(s.detectGoal(b)).toBeNull();
    expect(s.score.left).toBe(0);
  });

  it('possession percent sums to 100 with rounding tolerance', () => {
    const s = new ScoringSystem();
    for (let i = 0; i < 60; i++) s.recordPossession('left');
    for (let i = 0; i < 40; i++) s.recordPossession('right');
    const p = s.possessionPct();
    expect(p.left + p.right).toBeGreaterThanOrEqual(99);
    expect(p.left + p.right).toBeLessThanOrEqual(101);
    expect(p.left).toBe(60);
  });

  it('swap exchanges score and possession', () => {
    const s = new ScoringSystem();
    s.score.left = 2;
    s.score.right = 5;
    for (let i = 0; i < 30; i++) s.recordPossession('left');
    for (let i = 0; i < 70; i++) s.recordPossession('right');
    s.swap();
    expect(s.score.left).toBe(5);
    expect(s.score.right).toBe(2);
    expect(s.possessionPct().left).toBe(70);
  });
});
