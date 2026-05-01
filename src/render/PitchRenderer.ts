import {
  CENTER_X,
  CENTER_Y,
  FIELD,
  LEFT_GOAL,
  LEFT_PENALTY,
  PLAY_AREA,
  RIGHT_GOAL,
  RIGHT_PENALTY,
} from '../entities/Pitch.js';
import { COLORS } from './tokens.js';

/**
 * Pre-renders the static pitch (turf, mow stripes, lines, goals, noise) to
 * an offscreen canvas once. Drawing the pitch each frame then becomes a
 * single drawImage call — fast and stable.
 */
export class PitchRenderer {
  private offscreen: HTMLCanvasElement | null = null;

  prerender(): HTMLCanvasElement {
    if (this.offscreen) return this.offscreen;
    const cv = document.createElement('canvas');
    cv.width = FIELD.width;
    cv.height = FIELD.height;
    const ctx = cv.getContext('2d')!;

    // Base.
    ctx.fillStyle = COLORS.pitchDeep;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Mow stripes (alternating, 80 px wide, vertical).
    const stripeWidth = 80;
    ctx.fillStyle = COLORS.pitchLight;
    for (let x = PLAY_AREA.minX; x < PLAY_AREA.maxX; x += stripeWidth * 2) {
      ctx.fillRect(
        x,
        PLAY_AREA.minY,
        Math.min(stripeWidth, PLAY_AREA.maxX - x),
        PLAY_AREA.maxY - PLAY_AREA.minY,
      );
    }

    // Vignette.
    const grd = ctx.createRadialGradient(
      FIELD.width / 2,
      FIELD.height / 2,
      Math.min(FIELD.width, FIELD.height) * 0.35,
      FIELD.width / 2,
      FIELD.height / 2,
      Math.max(FIELD.width, FIELD.height) * 0.7,
    );
    grd.addColorStop(0, 'rgba(0,0,0,0)');
    grd.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    // Subtle noise — sparse, low alpha.
    const imgData = ctx.getImageData(0, 0, FIELD.width, FIELD.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if ((i & 0xfc) === 0 || Math.random() < 0.02) {
        const n = (Math.random() - 0.5) * 18;
        data[i] = Math.max(0, Math.min(255, (data[i] ?? 0) + n));
        data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] ?? 0) + n));
        data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] ?? 0) + n));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Lines.
    ctx.strokeStyle = COLORS.lineWhite;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    // Touchlines / outer rectangle.
    ctx.strokeRect(
      PLAY_AREA.minX,
      PLAY_AREA.minY,
      PLAY_AREA.maxX - PLAY_AREA.minX,
      PLAY_AREA.maxY - PLAY_AREA.minY,
    );

    // Halfway line.
    ctx.beginPath();
    ctx.moveTo(CENTER_X, PLAY_AREA.minY);
    ctx.lineTo(CENTER_X, PLAY_AREA.maxY);
    ctx.stroke();

    // Center circle + spot.
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, FIELD.centerRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.lineWhite;
    ctx.beginPath();
    ctx.arc(CENTER_X, CENTER_Y, 3, 0, Math.PI * 2);
    ctx.fill();

    // Penalty boxes.
    ctx.strokeRect(
      LEFT_PENALTY.minX,
      LEFT_PENALTY.minY,
      LEFT_PENALTY.maxX - LEFT_PENALTY.minX,
      LEFT_PENALTY.maxY - LEFT_PENALTY.minY,
    );
    ctx.strokeRect(
      RIGHT_PENALTY.minX,
      RIGHT_PENALTY.minY,
      RIGHT_PENALTY.maxX - RIGHT_PENALTY.minX,
      RIGHT_PENALTY.maxY - RIGHT_PENALTY.minY,
    );

    // Goal frames (drawn behind the goal line so balls visually settle in).
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    // Left goal.
    ctx.strokeRect(
      LEFT_GOAL.outerX,
      LEFT_GOAL.mouthMinY,
      FIELD.goalDepth,
      LEFT_GOAL.mouthMaxY - LEFT_GOAL.mouthMinY,
    );
    // Right goal.
    ctx.strokeRect(
      RIGHT_GOAL.innerX,
      RIGHT_GOAL.mouthMinY,
      FIELD.goalDepth,
      RIGHT_GOAL.mouthMaxY - RIGHT_GOAL.mouthMinY,
    );

    // Net hatching inside goals.
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    const drawNet = (gx: number) => {
      for (let i = 0; i < 6; i++) {
        const y = LEFT_GOAL.mouthMinY + (i / 5) * (LEFT_GOAL.mouthMaxY - LEFT_GOAL.mouthMinY);
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx + FIELD.goalDepth, y);
        ctx.stroke();
      }
      for (let i = 1; i < 5; i++) {
        const x = gx + (i / 5) * FIELD.goalDepth;
        ctx.beginPath();
        ctx.moveTo(x, LEFT_GOAL.mouthMinY);
        ctx.lineTo(x, LEFT_GOAL.mouthMaxY);
        ctx.stroke();
      }
    };
    drawNet(LEFT_GOAL.outerX);
    drawNet(RIGHT_GOAL.innerX);

    this.offscreen = cv;
    return cv;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cv = this.prerender();
    ctx.drawImage(cv, 0, 0);
  }
}
