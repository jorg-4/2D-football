import { Ball } from '../entities/Ball.js';
import { LEFT_GOAL, RIGHT_GOAL } from '../entities/Pitch.js';
import { Side } from '../entities/Player.js';

export interface ScoreState {
  left: number;
  right: number;
}

export class ScoringSystem {
  readonly score: ScoreState = { left: 0, right: 0 };
  /** Possession in tick units; ratio computed at end. */
  private possessionTicks: { left: number; right: number; total: number } = {
    left: 0,
    right: 0,
    total: 0,
  };

  reset(): void {
    this.score.left = 0;
    this.score.right = 0;
    this.possessionTicks.left = 0;
    this.possessionTicks.right = 0;
    this.possessionTicks.total = 0;
  }

  /** Return the conceding side if a goal occurred, otherwise null. */
  detectGoal(ball: Ball): Side | null {
    const x = ball.body.pos.x;
    const y = ball.body.pos.y;
    if (
      x <= LEFT_GOAL.innerX &&
      y >= LEFT_GOAL.mouthMinY &&
      y <= LEFT_GOAL.mouthMaxY
    ) {
      this.score.right += 1;
      return 'left';
    }
    if (
      x >= RIGHT_GOAL.innerX &&
      y >= RIGHT_GOAL.mouthMinY &&
      y <= RIGHT_GOAL.mouthMaxY
    ) {
      this.score.left += 1;
      return 'right';
    }
    return null;
  }

  recordPossession(possessor: Side | null): void {
    this.possessionTicks.total += 1;
    if (possessor === 'left') this.possessionTicks.left += 1;
    else if (possessor === 'right') this.possessionTicks.right += 1;
  }

  possessionPct(): { left: number; right: number } {
    const t = this.possessionTicks.total;
    if (t === 0) return { left: 50, right: 50 };
    const l = (this.possessionTicks.left / t) * 100;
    const r = (this.possessionTicks.right / t) * 100;
    return { left: Math.round(l), right: Math.round(r) };
  }

  swap(): void {
    const tmp = this.score.left;
    this.score.left = this.score.right;
    this.score.right = tmp;
    const pl = this.possessionTicks.left;
    this.possessionTicks.left = this.possessionTicks.right;
    this.possessionTicks.right = pl;
  }
}
