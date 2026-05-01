import { AudioBus } from '../audio/AudioBus.js';
import { BallRenderer } from '../render/BallRenderer.js';
import { FXRenderer } from '../render/FXRenderer.js';
import { HUDRenderer } from '../render/HUDRenderer.js';
import { PitchRenderer } from '../render/PitchRenderer.js';
import { PlayerRenderer } from '../render/PlayerRenderer.js';
import { Renderer } from '../render/Renderer.js';
import { COLORS, FONTS } from '../render/tokens.js';
import { FIELD } from '../entities/Pitch.js';
import { EndMatchScreen, MainMenuScreen, PauseOverlay } from '../ui/Menu.js';
import { loadConfig, saveConfig, UserConfig } from './Config.js';
import { EventBus, GameEvents } from './EventBus.js';
import { GameLoop } from './GameLoop.js';
import { Input } from './Input.js';
import { Match } from './Match.js';

export type AppState = 'menu' | 'playing' | 'paused' | 'ended';

const VERSION = 'v0.1.0';

export class Game {
  readonly renderer: Renderer;
  readonly input = new Input();
  readonly audio = new AudioBus();
  readonly events = new EventBus<GameEvents>();
  readonly pitchRenderer = new PitchRenderer();
  readonly playerRenderer = new PlayerRenderer();
  readonly ballRenderer = new BallRenderer();
  readonly hudRenderer = new HUDRenderer();
  readonly fx = new FXRenderer();
  readonly mainMenu = new MainMenuScreen();
  readonly pauseOverlay = new PauseOverlay();
  readonly endScreen = new EndMatchScreen();
  config: UserConfig;
  match: Match | null = null;
  state: AppState = 'menu';
  private loop: GameLoop;
  private now = 0;
  /** State at the start and end of the current simulation step, for render interpolation. */
  private prevPositions: Map<string, { x: number; y: number }> = new Map();
  private currPositions: Map<string, { x: number; y: number }> = new Map();
  /** When > 0 we're in slow-mo replay; ticks are decimated. */
  private slowMoFactor = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.config = loadConfig();
    this.audio.setMaster(this.config.audio.master);
    this.audio.setSfx(this.config.audio.sfx);

    this.loop = new GameLoop(
      (dt) => this.tick(dt),
      (alpha) => this.render(alpha),
      120,
    );

    this.events.on('goal', () => this.fx.triggerGoalFlash(this.now));
    this.events.on('tackle', ({ foul }) => {
      if (foul) this.fx.triggerFoulFlash(this.now);
    });
  }

  start(): void {
    this.input.bind();
    this.loop.start();
    // Unlock audio on first input.
    const unlock = () => {
      this.audio.unlock();
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('pointerdown', unlock);
    };
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  private startMatch(): void {
    this.match = new Match({
      settings: this.config.match,
      bindings: this.config.controls,
      audio: this.audio,
      events: this.events,
      fixedDt: this.loop.fixedTickSeconds,
    });
    this.state = 'playing';
    this.snapshotForInterp(true);
  }

  private tick(dt: number): void {
    this.now += dt;

    switch (this.state) {
      case 'menu':
        this.mainMenu.update(dt);
        this.handleMenuInput();
        break;
      case 'playing':
        this.handlePlayingInput();
        if (this.state !== 'playing') break;
        this.snapshotForInterp(false);
        // Slow-mo: during goal phase ticks happen at 0.4× speed.
        if (this.match) {
          const phaseDt = this.match.phase === 'goal' ? dt * 0.4 : dt;
          this.match.tick(this.input, phaseDt);
          if (this.match.phase === 'fulltime') {
            this.state = 'ended';
          }
        }
        this.snapshotForInterp(true);
        break;
      case 'paused':
        this.pauseOverlay.update(dt);
        this.handlePauseInput();
        break;
      case 'ended':
        this.endScreen.update(dt);
        this.handleEndInput();
        break;
    }

    this.input.endFrame();
  }

  // ---------- Input handling per state ----------

  private handleMenuInput(): void {
    if (
      this.input.wasPressed('ArrowDown') ||
      this.input.wasPressed('KeyS') ||
      this.input.wasPressed('Tab')
    ) {
      this.mainMenu.menu.navigate(1);
      this.audio.play('menuTick');
    }
    if (this.input.wasPressed('ArrowUp') || this.input.wasPressed('KeyW') || this.input.wasPressed('KeyZ')) {
      this.mainMenu.menu.navigate(-1);
      this.audio.play('menuTick');
    }
    if (this.input.wasPressed('Enter') || this.input.wasPressed('NumpadEnter') || this.input.wasPressed('Space')) {
      const id = this.mainMenu.menu.current().id;
      if (id === 'play') {
        this.startMatch();
      } else if (id === 'quit') {
        // In a desktop wrapper we'd dispatch an IPC quit; in browser, no-op.
        window.close();
      }
      // 'settings' deferred — out of scope for the playable build.
    }
  }

  private handlePlayingInput(): void {
    if (this.input.wasPressed('Escape')) {
      this.state = 'paused';
      this.events.emit('pause', true);
    }
  }

  private handlePauseInput(): void {
    if (this.input.wasPressed('Escape')) {
      this.state = 'playing';
      this.events.emit('pause', false);
      return;
    }
    if (this.input.wasPressed('ArrowDown') || this.input.wasPressed('KeyS')) {
      this.pauseOverlay.menu.navigate(1);
      this.audio.play('menuTick');
    }
    if (this.input.wasPressed('ArrowUp') || this.input.wasPressed('KeyW')) {
      this.pauseOverlay.menu.navigate(-1);
      this.audio.play('menuTick');
    }
    if (this.input.wasPressed('Enter') || this.input.wasPressed('NumpadEnter') || this.input.wasPressed('Space')) {
      const id = this.pauseOverlay.menu.current().id;
      if (id === 'resume') {
        this.state = 'playing';
        this.events.emit('pause', false);
      } else if (id === 'restart') {
        this.startMatch();
      } else if (id === 'menu') {
        this.match = null;
        this.state = 'menu';
      }
    }
  }

  private handleEndInput(): void {
    if (this.input.wasPressed('KeyR')) {
      this.startMatch();
    } else if (this.input.wasPressed('Escape')) {
      this.match = null;
      this.state = 'menu';
    }
    if (this.input.wasPressed('ArrowDown') || this.input.wasPressed('KeyS')) {
      this.endScreen.menu.navigate(1);
    }
    if (this.input.wasPressed('ArrowUp') || this.input.wasPressed('KeyW')) {
      this.endScreen.menu.navigate(-1);
    }
    if (this.input.wasPressed('Enter') || this.input.wasPressed('NumpadEnter')) {
      const id = this.endScreen.menu.current().id;
      if (id === 'rematch') this.startMatch();
      else if (id === 'menu') {
        this.match = null;
        this.state = 'menu';
      }
    }
  }

  // ---------- Render ----------

  private render(alpha: number): void {
    this.renderer.beginFrame();
    const ctx = this.renderer.ctx;

    switch (this.state) {
      case 'menu': {
        this.pitchRenderer.draw(ctx);
        // Dim pitch behind menu for legibility.
        ctx.fillStyle = 'rgba(10,10,11,0.65)';
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
        this.mainMenu.draw(ctx, VERSION);
        break;
      }
      case 'playing':
      case 'paused':
      case 'ended':
        this.pitchRenderer.draw(ctx);
        if (this.match) {
          this.drawMatch(ctx, alpha);
          this.drawHUD(ctx);
          this.drawPhaseBanner(ctx);
        }
        this.fx.draw(ctx, this.now);
        if (this.state === 'paused') this.pauseOverlay.draw(ctx);
        if (this.state === 'ended' && this.match) {
          this.endScreen.draw(ctx, {
            winner: this.match.winner ?? 'draw',
            score: { left: this.match.scoring.score.left, right: this.match.scoring.score.right },
            possession: this.match.scoring.possessionPct(),
            stats: { p1: this.match.p1.stats, p2: this.match.p2.stats },
          });
        }
        break;
    }
  }

  private drawMatch(ctx: CanvasRenderingContext2D, alpha: number): void {
    const m = this.match!;
    const interp = (id: string, fallbackX: number, fallbackY: number) => {
      const prev = this.prevPositions.get(id);
      const curr = this.currPositions.get(id) ?? { x: fallbackX, y: fallbackY };
      if (!prev) return curr;
      return {
        x: prev.x + (curr.x - prev.x) * alpha,
        y: prev.y + (curr.y - prev.y) * alpha,
      };
    };

    const p1Pos = interp('p1', m.p1.body.pos.x, m.p1.body.pos.y);
    const p2Pos = interp('p2', m.p2.body.pos.x, m.p2.body.pos.y);
    const gkLPos = interp('gkL', m.gkLeft.body.pos.x, m.gkLeft.body.pos.y);
    const gkRPos = interp('gkR', m.gkRight.body.pos.x, m.gkRight.body.pos.y);
    const ballPos = interp('ball', m.ball.body.pos.x, m.ball.body.pos.y);

    // GKs first (under field players).
    this.playerRenderer.drawGoalkeeper(ctx, 'left', gkLPos.x, gkLPos.y, m.gkLeft.body.radius);
    this.playerRenderer.drawGoalkeeper(ctx, 'right', gkRPos.x, gkRPos.y, m.gkRight.body.radius);

    this.playerRenderer.draw(ctx, m.p1, p1Pos.x, p1Pos.y);
    this.playerRenderer.draw(ctx, m.p2, p2Pos.x, p2Pos.y);
    this.ballRenderer.draw(ctx, m.ball, ballPos.x, ballPos.y);
  }

  private drawHUD(ctx: CanvasRenderingContext2D): void {
    const m = this.match!;
    let label: string;
    if (m.inSuddenDeath) label = 'SUDDEN DEATH';
    else if (m.half === 1) label = 'FIRST HALF';
    else label = 'SECOND HALF';
    this.hudRenderer.draw(ctx, m.scoring.score, Math.max(0, m.clockRemaining), label);
  }

  private drawPhaseBanner(ctx: CanvasRenderingContext2D): void {
    const m = this.match!;
    if (m.phase === 'kickoff') {
      const t = Math.ceil(m.phaseTimer);
      this.hudRenderer.banner(ctx, t > 0 ? `${t}` : 'GO', 0.5, 110, COLORS.accent, 'GET READY');
    } else if (m.phase === 'goal') {
      const color = m.goalScoringSide === 'left' ? COLORS.player1 : COLORS.player2;
      this.hudRenderer.banner(ctx, 'GOAL', 0.42, 130, color);
      ctx.font = `500 14px ${FONTS.mono}`;
      ctx.fillStyle = COLORS.uiMuted;
      ctx.textAlign = 'center';
      ctx.fillText('REPLAY', FIELD.width / 2, FIELD.height * 0.42 + 90);
    } else if (m.phase === 'halftime') {
      const poss = m.scoring.possessionPct();
      this.hudRenderer.banner(
        ctx,
        'HALFTIME',
        0.42,
        96,
        COLORS.uiFg,
        `POSSESSION ${poss.left}% — ${poss.right}%`,
      );
    } else if (m.phase === 'fulltime') {
      // Handled by the EndMatchScreen overlay.
    }
  }

  private snapshotForInterp(curr: boolean): void {
    if (!this.match) return;
    const m = this.match;
    const target = curr ? this.currPositions : this.prevPositions;
    target.set('p1', { x: m.p1.body.pos.x, y: m.p1.body.pos.y });
    target.set('p2', { x: m.p2.body.pos.x, y: m.p2.body.pos.y });
    target.set('gkL', { x: m.gkLeft.body.pos.x, y: m.gkLeft.body.pos.y });
    target.set('gkR', { x: m.gkRight.body.pos.x, y: m.gkRight.body.pos.y });
    target.set('ball', { x: m.ball.body.pos.x, y: m.ball.body.pos.y });
    if (curr) {
      // After committing curr, also seed prev if empty (first frame).
      for (const [k, v] of this.currPositions) {
        if (!this.prevPositions.has(k)) this.prevPositions.set(k, { ...v });
      }
    }
  }

  saveConfig(): void {
    saveConfig(this.config);
  }
}
