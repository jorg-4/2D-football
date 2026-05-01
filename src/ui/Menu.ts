import { COLORS, FONTS } from '../render/tokens.js';
import { FIELD } from '../entities/Pitch.js';

export interface MenuItem {
  id: string;
  label: string;
}

export class Menu {
  selectedIndex = 0;
  private underlineProgress: number[];
  /** Animated 0..1 width of selection underline. */

  constructor(public items: MenuItem[]) {
    this.underlineProgress = items.map(() => 0);
  }

  navigate(delta: number): void {
    this.selectedIndex =
      (this.selectedIndex + delta + this.items.length) % this.items.length;
  }

  current(): MenuItem {
    return this.items[this.selectedIndex]!;
  }

  update(dt: number): void {
    for (let i = 0; i < this.items.length; i++) {
      const target = i === this.selectedIndex ? 1 : 0;
      const cur = this.underlineProgress[i] ?? 0;
      const speed = 5;
      const next = cur + (target - cur) * Math.min(1, speed * dt);
      this.underlineProgress[i] = next;
    }
  }

  draw(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    options: { itemHeight?: number; sizePx?: number } = {},
  ): void {
    const itemHeight = options.itemHeight ?? 56;
    const sizePx = options.sizePx ?? 32;
    ctx.font = `500 ${sizePx}px ${FONTS.display}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i]!;
      const cy = y + i * itemHeight;
      const isSelected = i === this.selectedIndex;
      // Caret.
      if (isSelected) {
        ctx.fillStyle = COLORS.uiMuted;
        ctx.font = `400 ${sizePx}px ${FONTS.mono}`;
        ctx.fillText('>', x - 28, cy);
        ctx.font = `500 ${sizePx}px ${FONTS.display}`;
      }
      ctx.fillStyle = COLORS.uiFg;
      ctx.fillText(item.label, x, cy);
      // Animated underline.
      const w = ctx.measureText(item.label).width;
      const prog = this.underlineProgress[i] ?? 0;
      if (prog > 0.01) {
        ctx.fillStyle = COLORS.uiFg;
        ctx.fillRect(x, cy + sizePx * 0.6, w * prog, 1);
      }
    }
  }
}

export class MainMenuScreen {
  readonly menu = new Menu([
    { id: 'play', label: 'PLAY' },
    { id: 'settings', label: 'SETTINGS' },
    { id: 'quit', label: 'QUIT' },
  ]);
  /** Background ball drift. */
  private ballX = FIELD.width * 0.3;
  private ballY = FIELD.height * 0.55;
  private ballVx = 60;
  private ballVy = 25;

  update(dt: number): void {
    this.menu.update(dt);
    this.ballX += this.ballVx * dt;
    this.ballY += this.ballVy * dt;
    if (this.ballX < 100 || this.ballX > FIELD.width - 100) this.ballVx = -this.ballVx;
    if (this.ballY < 100 || this.ballY > FIELD.height - 100) this.ballVy = -this.ballVy;
  }

  draw(ctx: CanvasRenderingContext2D, version: string): void {
    // Idle ball drifts behind menu.
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Wordmark.
    ctx.font = `700 64px ${FONTS.display}`;
    ctx.fillStyle = COLORS.uiFg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PITCH DUEL', 80, 80);

    // Menu.
    this.menu.draw(ctx, 80, 240, { itemHeight: 56, sizePx: 28 });

    // Version.
    ctx.font = `400 11px ${FONTS.mono}`;
    ctx.fillStyle = COLORS.uiMuted;
    ctx.textBaseline = 'bottom';
    ctx.fillText(version, 80, FIELD.height - 24);

    // Controls hint.
    ctx.textAlign = 'right';
    ctx.fillText('ENTER · CONFIRM   ↑↓ · NAVIGATE   ESC · BACK', FIELD.width - 80, FIELD.height - 24);
  }
}

export class PauseOverlay {
  readonly menu = new Menu([
    { id: 'resume', label: 'RESUME' },
    { id: 'restart', label: 'RESTART' },
    { id: 'menu', label: 'MAIN MENU' },
  ]);

  update(dt: number): void {
    this.menu.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(10,10,11,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.font = `700 56px ${FONTS.display}`;
    ctx.fillStyle = COLORS.uiFg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PAUSED', FIELD.width / 2 - 200, FIELD.height / 2 - 140);
    this.menu.draw(ctx, FIELD.width / 2 - 200, FIELD.height / 2 - 50, { itemHeight: 48, sizePx: 24 });
  }
}

export class EndMatchScreen {
  readonly menu = new Menu([
    { id: 'rematch', label: 'REMATCH (R)' },
    { id: 'menu', label: 'MAIN MENU (ESC)' },
  ]);

  update(dt: number): void {
    this.menu.update(dt);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    payload: {
      winner: 'left' | 'right' | 'draw';
      score: { left: number; right: number };
      possession: { left: number; right: number };
      stats: {
        p1: { shots: number; shotsOnTarget: number; tacklesWon: number; distanceCovered: number };
        p2: { shots: number; shotsOnTarget: number; tacklesWon: number; distanceCovered: number };
      };
    },
  ): void {
    ctx.fillStyle = 'rgba(10,10,11,0.92)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    let banner: string;
    let bannerColor: string = COLORS.uiFg;
    if (payload.winner === 'left') {
      banner = 'BLUE WINS';
      bannerColor = COLORS.player1;
    } else if (payload.winner === 'right') {
      banner = 'RED WINS';
      bannerColor = COLORS.player2;
    } else {
      banner = 'DRAW';
    }

    ctx.font = `800 96px ${FONTS.display}`;
    ctx.fillStyle = bannerColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(banner, FIELD.width / 2, 130);

    ctx.font = `600 56px ${FONTS.mono}`;
    ctx.fillStyle = COLORS.uiFg;
    ctx.fillText(`${payload.score.left}  —  ${payload.score.right}`, FIELD.width / 2, 210);

    // Stats table.
    const tx = FIELD.width / 2 - 280;
    const ty = 290;
    const rowH = 28;
    ctx.font = `500 14px ${FONTS.mono}`;
    ctx.textAlign = 'left';
    const rows: Array<[string, string, string]> = [
      ['', 'BLUE', 'RED'],
      ['SHOTS', String(payload.stats.p1.shots), String(payload.stats.p2.shots)],
      ['ON TARGET', String(payload.stats.p1.shotsOnTarget), String(payload.stats.p2.shotsOnTarget)],
      ['TACKLES WON', String(payload.stats.p1.tacklesWon), String(payload.stats.p2.tacklesWon)],
      ['DISTANCE (M)', (payload.stats.p1.distanceCovered / 100).toFixed(0), (payload.stats.p2.distanceCovered / 100).toFixed(0)],
      ['POSSESSION %', String(payload.possession.left), String(payload.possession.right)],
    ];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const y = ty + i * rowH;
      ctx.fillStyle = i === 0 ? COLORS.uiMuted : COLORS.uiFg;
      ctx.textAlign = 'left';
      ctx.fillText(r[0], tx, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = i === 0 ? COLORS.uiMuted : COLORS.player1;
      ctx.fillText(r[1], tx + 320, y);
      ctx.fillStyle = i === 0 ? COLORS.uiMuted : COLORS.player2;
      ctx.fillText(r[2], tx + 480, y);
      // Row separator.
      if (i > 0) {
        ctx.strokeStyle = 'rgba(138,138,142,0.2)';
        ctx.beginPath();
        ctx.moveTo(tx, y + 14);
        ctx.lineTo(tx + 480, y + 14);
        ctx.stroke();
      }
    }

    this.menu.draw(ctx, FIELD.width / 2 - 120, 540, { itemHeight: 40, sizePx: 18 });
  }
}
