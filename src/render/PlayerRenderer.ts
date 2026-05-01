import { PLAYER, Player } from '../entities/Player.js';
import { COLORS } from './tokens.js';

export class PlayerRenderer {
  /** Draw a goalkeeper: same circle treatment, no stamina bar/charge ring. */
  drawGoalkeeper(
    ctx: CanvasRenderingContext2D,
    side: 'left' | 'right',
    interpX: number,
    interpY: number,
    radius: number,
  ): void {
    const color = side === 'left' ? COLORS.player1 : COLORS.player2;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(interpX, interpY, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS.lineWhiteSolid;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Glove indicator: small white dot.
    ctx.fillStyle = COLORS.lineWhiteSolid;
    ctx.beginPath();
    ctx.arc(interpX, interpY, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  draw(
    ctx: CanvasRenderingContext2D,
    p: Player,
    interpX: number,
    interpY: number,
  ): void {
    const color = p.side === 'left' ? COLORS.player1 : COLORS.player2;

    // Sprint motion blur trail.
    if (p.sprinting) {
      const speed = Math.hypot(p.body.vel.x, p.body.vel.y);
      if (speed > 240) {
        const ux = -p.body.vel.x / speed;
        const uy = -p.body.vel.y / speed;
        for (let i = 1; i <= 3; i++) {
          ctx.globalAlpha = 0.25 - i * 0.06;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(
            interpX + ux * i * 8,
            interpY + uy * i * 8,
            PLAYER.radius - i * 1.5,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1.0;
      }
    }

    // Charge ring.
    if (p.charging) {
      const t = Math.min(p.chargeTime, PLAYER.chargeMaxTime) / PLAYER.chargeMaxTime;
      const ringRadius = PLAYER.radius + 6;
      // Color ramp white → yellow → red.
      let ringColor: string;
      if (t < 0.5) {
        const k = t / 0.5;
        ringColor = lerpHex('#FFFFFF', COLORS.accent, k);
      } else {
        const k = (t - 0.5) / 0.5;
        ringColor = lerpHex(COLORS.accent, COLORS.player2, k);
      }
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(interpX, interpY, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
      ctx.stroke();
    }

    // Body.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(interpX, interpY, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.lineWhiteSolid;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Facing triangle.
    const fx = p.facingX;
    const fy = p.facingY;
    if (fx !== 0 || fy !== 0) {
      const angle = Math.atan2(fy, fx);
      ctx.save();
      ctx.translate(interpX, interpY);
      ctx.rotate(angle);
      ctx.fillStyle = COLORS.lineWhiteSolid;
      ctx.beginPath();
      ctx.moveTo(PLAYER.radius - 2, 0);
      ctx.lineTo(PLAYER.radius - 10, -5);
      ctx.lineTo(PLAYER.radius - 10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Stamina bar.
    const barWidth = 40;
    const barX = interpX - barWidth / 2;
    const barY = interpY + PLAYER.radius + 8;
    const ratio = Math.max(0, Math.min(1, p.stamina / PLAYER.staminaMax));
    ctx.fillStyle = color;
    ctx.fillRect(barX, barY, barWidth * ratio, 4);

    // Foul-advantage glow.
    if (p.freezeAdvantageTimer > 0) {
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(interpX, interpY, PLAYER.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function lerpHex(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}
