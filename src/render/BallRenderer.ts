import { BALL, Ball } from '../entities/Ball.js';
import { COLORS } from './tokens.js';

export class BallRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    ball: Ball,
    interpX: number,
    interpY: number,
  ): void {
    // Trail.
    for (let i = 0; i < ball.trail.length; i++) {
      const f = ball.trail[i]!;
      const t = (i + 1) / ball.trail.length;
      ctx.globalAlpha = t * 0.35;
      ctx.fillStyle = COLORS.ball;
      ctx.beginPath();
      ctx.arc(f.x, f.y, BALL.radius * (0.4 + t * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Body.
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(interpX, interpY, BALL.radius, 0, Math.PI * 2);
    ctx.fill();

    // Pentagonal markers — two small dark dots opposite each other,
    // rotating with spin.
    ctx.fillStyle = COLORS.ballSpot;
    const r = BALL.radius * 0.45;
    for (let i = 0; i < 2; i++) {
      const a = ball.spin + i * Math.PI;
      ctx.beginPath();
      ctx.arc(
        interpX + Math.cos(a) * r,
        interpY + Math.sin(a) * r,
        2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}
