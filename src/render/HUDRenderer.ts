import { FIELD } from '../entities/Pitch.js';
import { ScoreState } from '../systems/ScoringSystem.js';
import { COLORS, FONTS } from './tokens.js';

export class HUDRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    score: ScoreState,
    timeRemaining: number,
    halfLabel: string,
  ): void {
    const cx = FIELD.width / 2;
    const yScore = 28;
    const yTime = yScore + 30;
    const yLabel = yTime + 18;

    // Subtle backdrop strip.
    const w = 240;
    const h = 64;
    ctx.fillStyle = 'rgba(10,10,11,0.55)';
    ctx.fillRect(cx - w / 2, 12, w, h);

    // Score in mono.
    ctx.font = `600 36px ${FONTS.mono}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.player1;
    ctx.fillText(String(score.left), cx - 50, yScore);
    ctx.fillStyle = COLORS.uiMuted;
    ctx.fillText('—', cx, yScore);
    ctx.fillStyle = COLORS.player2;
    ctx.fillText(String(score.right), cx + 50, yScore);

    // Time.
    ctx.font = `500 18px ${FONTS.mono}`;
    ctx.fillStyle = COLORS.uiFg;
    const m = Math.max(0, Math.floor(timeRemaining / 60));
    const s = Math.max(0, Math.floor(timeRemaining % 60));
    const tStr = `${m}:${s.toString().padStart(2, '0')}`;
    ctx.fillText(tStr, cx, yTime);

    // Half label.
    ctx.font = `500 11px ${FONTS.mono}`;
    ctx.fillStyle = COLORS.uiMuted;
    ctx.fillText(halfLabel.toUpperCase(), cx, yLabel);
  }

  /** Centered banner: `KICKOFF`, `GOAL`, `HALFTIME`, etc. */
  banner(
    ctx: CanvasRenderingContext2D,
    text: string,
    yFrac = 0.5,
    sizePx = 96,
    color: string = COLORS.uiFg,
    sub?: string,
  ): void {
    const cx = FIELD.width / 2;
    const cy = FIELD.height * yFrac;
    ctx.font = `700 ${sizePx}px ${FONTS.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, cx, cy);
    if (sub) {
      ctx.font = `500 14px ${FONTS.mono}`;
      ctx.fillStyle = COLORS.uiMuted;
      ctx.fillText(sub.toUpperCase(), cx, cy + sizePx * 0.7);
    }
  }
}
