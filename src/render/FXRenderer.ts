import { FIELD } from '../entities/Pitch.js';
import { COLORS } from './tokens.js';

interface Flash {
  start: number;
  duration: number;
  color: string;
  peakAlpha: number;
}

export class FXRenderer {
  private flashes: Flash[] = [];

  triggerGoalFlash(now: number): void {
    this.flashes.push({
      start: now,
      duration: 0.08,
      color: COLORS.accent,
      peakAlpha: 0.85,
    });
  }

  triggerFoulFlash(now: number): void {
    this.flashes.push({
      start: now,
      duration: 0.25,
      color: COLORS.accent,
      peakAlpha: 0.4,
    });
  }

  draw(ctx: CanvasRenderingContext2D, now: number): void {
    this.flashes = this.flashes.filter((f) => now - f.start < f.duration);
    for (const f of this.flashes) {
      const t = (now - f.start) / f.duration;
      const alpha = (1 - t) * f.peakAlpha;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
    ctx.globalAlpha = 1;
  }
}
