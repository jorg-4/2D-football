import { AudioBus } from '../audio/AudioBus.js';
import { Ball, BALL } from '../entities/Ball.js';
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
import { PLAYER, Player, Side } from '../entities/Player.js';
import { Goalkeeper } from '../entities/Goalkeeper.js';
import { reflect, sweepCircleVsAabb } from '../physics/Collision.js';
import { World } from '../physics/World.js';
import { AISystem } from '../systems/AISystem.js';
import { ReplayBuffer, ReplayFrame } from '../systems/ReplayBuffer.js';
import { ScoringSystem } from '../systems/ScoringSystem.js';
import { StaminaSystem } from '../systems/StaminaSystem.js';
import { ControlBindings } from './Input.js';
import { Input } from './Input.js';
import { PRNG } from './PRNG.js';
import { EventBus, GameEvents } from './EventBus.js';
import type { MatchSettings } from './Config.js';

export type MatchPhase = 'kickoff' | 'play' | 'goal' | 'halftime' | 'fulltime';

export interface MatchOptions {
  settings: MatchSettings;
  bindings: { p1: ControlBindings; p2: ControlBindings };
  audio: AudioBus;
  events: EventBus<GameEvents>;
  fixedDt: number;
}

const KICKOFF_COUNTDOWN = 2.0;
const GOAL_REPLAY_DURATION = 2.0;
const HALFTIME_DURATION = 5.0;

export class Match {
  readonly world = new World();
  readonly p1: Player;
  readonly p2: Player;
  readonly gkLeft: Goalkeeper;
  readonly gkRight: Goalkeeper;
  readonly ball: Ball;
  readonly scoring = new ScoringSystem();
  readonly stamina = new StaminaSystem();
  readonly ai = new AISystem();
  readonly replay: ReplayBuffer;
  readonly prng: PRNG;
  /** Sides players defend. p1 always controls left bindings; sides swap at halftime. */
  p1Side: Side = 'left';

  half = 1;
  phase: MatchPhase = 'kickoff';
  /** When true the match is in extra time after a regulation draw. */
  inSuddenDeath = false;
  /** Game-clock seconds remaining in the current half. */
  clockRemaining: number;
  /** Sudden-death elapsed; only used when inSuddenDeath. */
  suddenDeathElapsed = 0;
  /** Phase-local timer for kickoff countdown / goal replay / halftime. */
  phaseTimer = 0;
  /** Side that gets the kickoff next. */
  kickoffSide: Side = 'left';
  /** Captured for end screen. */
  finalStatsCaptured = false;
  /** Full-screen "GOAL" banner data — visible during goal phase. */
  goalScoringSide: Side | null = null;
  /** Full-time winner: 'left' | 'right' | 'draw' (only valid in fulltime phase) */
  winner: Side | 'draw' | null = null;

  constructor(private readonly opts: MatchOptions) {
    this.prng = new PRNG(0xdeadbeef);
    this.clockRemaining = opts.settings.halfLengthSeconds;

    this.p1 = new Player('left', 0, PLAY_AREA.minX + 200, CENTER_Y);
    this.p2 = new Player('right', 1, PLAY_AREA.maxX - 200, CENTER_Y);
    this.world.add(this.p1.body);
    this.world.add(this.p2.body);

    this.gkLeft = new Goalkeeper('left', LEFT_PENALTY.minX + 30, CENTER_Y, LEFT_PENALTY);
    this.gkRight = new Goalkeeper('right', RIGHT_PENALTY.maxX - 30, CENTER_Y, RIGHT_PENALTY);
    this.world.add(this.gkLeft.body);
    this.world.add(this.gkRight.body);

    this.ball = new Ball(CENTER_X, CENTER_Y);
    this.world.add(this.ball.body);

    const replayHz = Math.round(1 / opts.fixedDt);
    this.replay = new ReplayBuffer(3, replayHz);

    this.startKickoff('left');
  }

  // ---------------------------------------------------------------------
  // State transitions

  private startKickoff(side: Side): void {
    this.phase = 'kickoff';
    this.phaseTimer = KICKOFF_COUNTDOWN;
    this.kickoffSide = side;
    this.placeForKickoff(side);
    this.opts.events.emit('kickoff', { side });
    this.opts.events.emit('whistle', 'kickoff');
    this.opts.audio.play('whistle');
  }

  private placeForKickoff(side: Side): void {
    this.ball.reset(CENTER_X, CENTER_Y);
    // P1 always defends p1Side; place each within their half.
    const p1Left = this.p1Side === 'left';
    if (side === this.p1Side) {
      // P1 is the kicker — sits on/near the spot.
      this.p1.reset(p1Left ? CENTER_X - 30 : CENTER_X + 30, CENTER_Y);
      this.p2.reset(p1Left ? CENTER_X + 200 : CENTER_X - 200, CENTER_Y);
    } else {
      this.p2.reset(p1Left ? CENTER_X + 30 : CENTER_X - 30, CENTER_Y);
      this.p1.reset(p1Left ? CENTER_X - 200 : CENTER_X + 200, CENTER_Y);
    }
    this.gkLeft.reset(LEFT_PENALTY.minX + 30, CENTER_Y);
    this.gkRight.reset(RIGHT_PENALTY.maxX - 30, CENTER_Y);
  }

  private endHalf(): void {
    if (this.half === 1) {
      this.phase = 'halftime';
      this.phaseTimer = HALFTIME_DURATION;
      this.opts.events.emit('halftime', undefined);
      this.opts.events.emit('whistle', 'halftime');
      this.opts.audio.play('whistle');
    } else {
      // End of regulation.
      if (this.scoring.score.left === this.scoring.score.right) {
        this.inSuddenDeath = true;
        this.startKickoff(this.prng.next() < 0.5 ? 'left' : 'right');
      } else {
        this.enterFulltime();
      }
    }
  }

  private enterFulltime(): void {
    this.phase = 'fulltime';
    this.opts.events.emit('fullTime', undefined);
    this.opts.events.emit('whistle', 'fulltime');
    this.opts.audio.play('whistle');
    if (this.scoring.score.left > this.scoring.score.right) this.winner = 'left';
    else if (this.scoring.score.right > this.scoring.score.left) this.winner = 'right';
    else this.winner = 'draw';
    this.finalStatsCaptured = true;
  }

  swapSidesForHalftime(): void {
    // Swap which side P1 defends. Score and possession swap with it so the
    // HUD remains color-correct (left scoreboard is still P1).
    this.p1Side = this.p1Side === 'left' ? 'right' : 'left';
    this.scoring.swap();
    // Conceding-side rule: kickoff to the side that did not score most
    // recently. Standard convention: alternate at halftime, so give it to
    // whichever side is on the right of the field now (arbitrary).
  }

  // ---------------------------------------------------------------------
  // Tick

  tick(input: Input, dt: number): void {
    switch (this.phase) {
      case 'kickoff':
        this.tickKickoff(dt);
        // During kickoff countdown, freeze physics but allow input sampling
        // for facing direction (cheap UX).
        this.tickGameplay(input, dt, true);
        return;
      case 'play':
        this.tickGameplay(input, dt, false);
        if (this.inSuddenDeath) {
          this.suddenDeathElapsed += dt;
        } else {
          this.clockRemaining -= dt;
          if (this.clockRemaining <= 0) {
            this.clockRemaining = 0;
            this.endHalf();
          }
        }
        return;
      case 'goal':
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) {
          // Sudden-death goal: match ends.
          if (this.inSuddenDeath) {
            this.enterFulltime();
            return;
          }
          // Conceding side gets the next kickoff.
          const conceder: Side = this.goalScoringSide === 'left' ? 'right' : 'left';
          this.goalScoringSide = null;
          if (this.clockRemaining <= 0) {
            this.endHalf();
          } else {
            this.startKickoff(conceder);
          }
        }
        return;
      case 'halftime':
        this.phaseTimer -= dt;
        if (this.phaseTimer <= 0) {
          this.half = 2;
          this.clockRemaining = this.opts.settings.halfLengthSeconds;
          this.swapSidesForHalftime();
          this.startKickoff(this.kickoffSide === 'left' ? 'right' : 'left');
        }
        return;
      case 'fulltime':
        return;
    }
  }

  private tickKickoff(dt: number): void {
    this.phaseTimer -= dt;
    if (this.phaseTimer <= 0) {
      this.phase = 'play';
    }
  }

  private tickGameplay(input: Input, dt: number, frozen: boolean): void {
    // 1. Sample input for both players.
    this.applyPlayerInput(this.p1, input, this.opts.bindings.p1, frozen, dt);
    this.applyPlayerInput(this.p2, input, this.opts.bindings.p2, frozen, dt);

    if (frozen) {
      // Freeze velocities to zero; only input-derived facing is updated.
      this.p1.body.vel.set(0, 0);
      this.p2.body.vel.set(0, 0);
      this.gkLeft.body.vel.set(0, 0);
      this.gkRight.body.vel.set(0, 0);
      this.ball.body.vel.set(0, 0);
      // Still write replay frames during kickoff for continuity? No, skip.
      return;
    }

    // 2. Goalkeeper AI.
    if (this.opts.settings.goalkeeperEnabled) {
      const lk = this.ai.update(this.gkLeft, this.ball, dt);
      if (lk.kick) {
        this.ball.body.vel.set(lk.kick.vx, lk.kick.vy);
        this.opts.audio.play('kick', { power: 0.8 });
      }
      const rk = this.ai.update(this.gkRight, this.ball, dt);
      if (rk.kick) {
        this.ball.body.vel.set(rk.kick.vx, rk.kick.vy);
        this.opts.audio.play('kick', { power: 0.8 });
      }
    } else {
      this.gkLeft.body.vel.set(0, 0);
      this.gkRight.body.vel.set(0, 0);
    }

    // Track distance covered before integrating.
    const prevP1 = { x: this.p1.body.pos.x, y: this.p1.body.pos.y };
    const prevP2 = { x: this.p2.body.pos.x, y: this.p2.body.pos.y };

    // 3. Integrate.
    this.world.integrate(dt);

    // 4. Ball wall + goal post collisions (swept-circle anti-tunneling).
    this.collideBallWithWalls();

    // 5. Player vs player and player/GK vs ball overlap resolution.
    this.collidePlayers();
    this.collideBallVsActors();

    // 6. Constrain players to play area; constrain GKs to their boxes.
    this.clampPlayer(this.p1);
    this.clampPlayer(this.p2);
    this.clampGoalkeeper(this.gkLeft);
    this.clampGoalkeeper(this.gkRight);

    // 7. Ball speed cap and trail.
    this.ball.capSpeed();
    this.ball.updateTrail();

    // 8. Possession heuristic: nearest field player to ball within 50 px.
    const possessor = this.computePossessor();
    this.scoring.recordPossession(possessor);
    this.p1.hasBall = possessor === this.p1.side;
    this.p2.hasBall = possessor === this.p2.side;

    // 9. Stats: distance covered.
    this.p1.stats.distanceCovered += Math.hypot(
      this.p1.body.pos.x - prevP1.x,
      this.p1.body.pos.y - prevP1.y,
    );
    this.p2.stats.distanceCovered += Math.hypot(
      this.p2.body.pos.x - prevP2.x,
      this.p2.body.pos.y - prevP2.y,
    );

    // 10. Replay frame.
    const f: ReplayFrame = {
      ballX: this.ball.body.pos.x,
      ballY: this.ball.body.pos.y,
      p1X: this.p1.body.pos.x,
      p1Y: this.p1.body.pos.y,
      p2X: this.p2.body.pos.x,
      p2Y: this.p2.body.pos.y,
      gkLX: this.gkLeft.body.pos.x,
      gkLY: this.gkLeft.body.pos.y,
      gkRX: this.gkRight.body.pos.x,
      gkRY: this.gkRight.body.pos.y,
    };
    this.replay.push(f);

    // 11. Goal detection.
    const conceder = this.scoring.detectGoal(this.ball);
    if (conceder !== null) {
      const scoringSide: Side = conceder === 'left' ? 'right' : 'left';
      this.goalScoringSide = scoringSide;
      // Track shot-on-target stat for the scoring P1/P2.
      const scorer = this.matchSideToPlayer(scoringSide);
      if (scorer) scorer.stats.shotsOnTarget += 1;
      this.opts.events.emit('goal', { scoringSide });
      this.opts.audio.play('goal');
      this.phase = 'goal';
      this.phaseTimer = GOAL_REPLAY_DURATION;
    }
  }

  private applyPlayerInput(
    p: Player,
    input: Input,
    b: ControlBindings,
    frozen: boolean,
    dt: number,
  ): void {
    if (p.freezeAdvantageTimer > 0) {
      p.freezeAdvantageTimer = Math.max(0, p.freezeAdvantageTimer - dt);
    }

    const mv = input.sampleMovement(b);
    p.inputX = mv.x;
    p.inputY = mv.y;
    if (mv.x !== 0 || mv.y !== 0) {
      p.facingX = mv.x;
      p.facingY = mv.y;
    }
    if (frozen) return;

    const moving = mv.x !== 0 || mv.y !== 0;
    const sprintHeld = input.isDown(b.sprint);
    const canSprint = this.stamina.update(p, dt, sprintHeld && moving, moving);
    p.sprinting = canSprint && moving;

    // Tackle: pressing sprint key while sprinting and within range of opponent
    // triggers a tackle commit. We use wasPressed for the trigger.
    if (input.wasPressed(b.sprint) && p.sprinting && p.tackleState === 'idle') {
      const opp = p.index === 0 ? this.p2 : this.p1;
      const dist = Math.hypot(opp.body.pos.x - p.body.pos.x, opp.body.pos.y - p.body.pos.y);
      if (dist < (PLAYER.radius * 2) + PLAYER.tackleRange) {
        this.startTackle(p, opp);
      }
    }

    // Tackle FSM update.
    if (p.tackleState === 'committing') {
      p.tackleTimer -= dt;
      if (p.tackleTimer <= 0) {
        p.tackleState = 'recovering';
        p.tackleTimer = PLAYER.tackleRecovery;
      }
    } else if (p.tackleState === 'recovering') {
      p.tackleTimer -= dt;
      if (p.tackleTimer <= 0) p.tackleState = 'idle';
    }

    // Movement.
    const speed = p.sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    if (p.tackleState === 'committing') {
      // Lunge along facing.
      const targetVx = p.facingX * PLAYER.sprintSpeed * 1.05;
      const targetVy = p.facingY * PLAYER.sprintSpeed * 1.05;
      const k = Math.min(1, PLAYER.acceleration * dt / Math.max(1, Math.hypot(targetVx, targetVy)));
      p.body.vel.x += (targetVx - p.body.vel.x) * k;
      p.body.vel.y += (targetVy - p.body.vel.y) * k;
    } else if (p.tackleState === 'recovering') {
      // No input thrust; damping handles it.
    } else {
      const targetVx = mv.x * speed;
      const targetVy = mv.y * speed;
      const dvx = targetVx - p.body.vel.x;
      const dvy = targetVy - p.body.vel.y;
      const dvLen = Math.hypot(dvx, dvy);
      if (dvLen > 1e-3) {
        const maxStep = PLAYER.acceleration * dt;
        const k = Math.min(maxStep / dvLen, 1);
        p.body.vel.x += dvx * k;
        p.body.vel.y += dvy * k;
      }
    }

    // Charge & shoot.
    const shootHeld = input.isDown(b.shoot);
    if (shootHeld && !p.charging && p.tackleState === 'idle') {
      p.charging = true;
      p.chargeTime = 0;
    }
    if (p.charging) {
      if (shootHeld) {
        p.chargeTime += dt;
      } else {
        // Release: fire if ball is within reach.
        this.releaseShot(p);
        p.charging = false;
        p.chargeTime = 0;
      }
    }
  }

  private startTackle(attacker: Player, victim: Player): void {
    attacker.tackleState = 'committing';
    attacker.tackleTimer = PLAYER.tackleCommit;
    this.opts.audio.play('tackle');

    // Determine if from behind: dot of victim->attacker direction with
    // victim facing should be negative (attacker behind victim).
    const vx = attacker.body.pos.x - victim.body.pos.x;
    const vy = attacker.body.pos.y - victim.body.pos.y;
    const fx = victim.facingX;
    const fy = victim.facingY;
    const fromBehind = (vx * fx + vy * fy) < 0;
    let foul = false;
    if (fromBehind && this.prng.next() < PLAYER.foulFromBehindChance) {
      foul = true;
    }

    if (foul) {
      // Free kick to victim: freeze attacker briefly, give victim uncontested
      // possession via freezeAdvantage timer.
      victim.freezeAdvantageTimer = PLAYER.foulFreezeDuration;
      attacker.tackleState = 'recovering';
      attacker.tackleTimer = PLAYER.tackleRecovery;
      // Park ball at victim's feet.
      this.ball.body.pos.set(
        victim.body.pos.x + victim.facingX * (PLAYER.radius + BALL.radius + 2),
        victim.body.pos.y + victim.facingY * (PLAYER.radius + BALL.radius + 2),
      );
      this.ball.body.vel.set(0, 0);
      this.opts.events.emit('tackle', { foul: true });
    } else {
      // Successful tackle: if victim had ball, kick it loose toward attacker's
      // facing direction with modest power.
      if (victim.hasBall) {
        attacker.stats.tacklesWon += 1;
        const dirX = attacker.facingX;
        const dirY = attacker.facingY;
        this.ball.body.vel.set(dirX * 240, dirY * 240);
      }
      this.opts.events.emit('tackle', { foul: false });
    }
  }

  private releaseShot(p: Player): void {
    const bx = this.ball.body.pos.x;
    const by = this.ball.body.pos.y;
    const dx = bx - p.body.pos.x;
    const dy = by - p.body.pos.y;
    const dist = Math.hypot(dx, dy);
    const reach = PLAYER.radius + BALL.radius + 6;
    if (dist > reach) return;
    const power = p.chargePower();
    // Direction: facing.
    let fx = p.facingX;
    let fy = p.facingY;
    const fl = Math.hypot(fx, fy);
    if (fl < 1e-3) {
      // Default toward opponent goal.
      fx = p.side === 'left' ? 1 : -1;
      fy = 0;
    } else {
      fx /= fl;
      fy /= fl;
    }
    this.ball.body.vel.set(fx * power, fy * power);
    p.stats.shots += 1;
    this.opts.events.emit('shot', { power, side: p.side });
    this.opts.audio.play('kick', { power: power / PLAYER.chargeMaxPower });
  }

  // ---------------------------------------------------------------------
  // Collisions

  private collideBallWithWalls(): void {
    const b = this.ball.body;
    const r = b.radius;

    // Build the four wall rectangles, BUT cut openings for the goal mouths.
    const goalTopY = LEFT_GOAL.mouthMinY;
    const goalBotY = LEFT_GOAL.mouthMaxY;

    // Top, bottom, and the two end-line segments above/below the goal.
    const walls = [
      { minX: PLAY_AREA.minX - 100, minY: PLAY_AREA.minY - 50, maxX: PLAY_AREA.maxX + 100, maxY: PLAY_AREA.minY }, // top
      { minX: PLAY_AREA.minX - 100, minY: PLAY_AREA.maxY, maxX: PLAY_AREA.maxX + 100, maxY: PLAY_AREA.maxY + 50 }, // bottom
      // Left endline above goal
      { minX: PLAY_AREA.minX - 50, minY: PLAY_AREA.minY - 50, maxX: PLAY_AREA.minX, maxY: goalTopY },
      // Left endline below goal
      { minX: PLAY_AREA.minX - 50, minY: goalBotY, maxX: PLAY_AREA.minX, maxY: PLAY_AREA.maxY + 50 },
      // Right endline above goal
      { minX: PLAY_AREA.maxX, minY: PLAY_AREA.minY - 50, maxX: PLAY_AREA.maxX + 50, maxY: goalTopY },
      // Right endline below goal
      { minX: PLAY_AREA.maxX, minY: goalBotY, maxX: PLAY_AREA.maxX + 50, maxY: PLAY_AREA.maxY + 50 },
      // Goal back walls
      { minX: LEFT_GOAL.outerX - 5, minY: goalTopY, maxX: LEFT_GOAL.outerX, maxY: goalBotY },
      { minX: RIGHT_GOAL.innerX + FIELD.goalDepth, minY: goalTopY, maxX: RIGHT_GOAL.innerX + FIELD.goalDepth + 5, maxY: goalBotY },
    ];

    // Iterate up to 4 times in case of multi-wall bounces in one tick.
    for (let iter = 0; iter < 4; iter++) {
      let earliest: { t: number; nx: number; ny: number } | null = null;
      const fromX = b.prevPos.x;
      const fromY = b.prevPos.y;
      const toX = b.pos.x;
      const toY = b.pos.y;
      for (const w of walls) {
        const hit = sweepCircleVsAabb(fromX, fromY, toX, toY, r, w);
        if (hit && (!earliest || hit.t < earliest.t)) {
          earliest = hit;
        }
      }
      if (!earliest) break;
      // Step ball to impact, reflect velocity, then continue along remaining
      // movement (post-impact slide).
      const dx = toX - fromX;
      const dy = toY - fromY;
      const ix = fromX + dx * earliest.t;
      const iy = fromY + dy * earliest.t;
      // Nudge slightly along normal to avoid re-trigger.
      b.pos.x = ix + earliest.nx * 0.1;
      b.pos.y = iy + earliest.ny * 0.1;
      const r2 = reflect(b.vel.x, b.vel.y, earliest.nx, earliest.ny, BALL.wallRestitution);
      b.vel.x = r2.vx;
      b.vel.y = r2.vy;
      // Update prevPos to impact so subsequent iterations sweep the remainder.
      b.prevPos.set(b.pos.x, b.pos.y);
      this.opts.audio.play('wallBounce');
    }
  }

  private collidePlayers(): void {
    const a = this.p1.body;
    const b = this.p2.body;
    const dx = b.pos.x - a.pos.x;
    const dy = b.pos.y - a.pos.y;
    const distSq = dx * dx + dy * dy;
    const minDist = a.radius + b.radius;
    if (distSq < minDist * minDist && distSq > 1e-6) {
      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;
      a.pos.x -= nx * overlap * 0.5;
      a.pos.y -= ny * overlap * 0.5;
      b.pos.x += nx * overlap * 0.5;
      b.pos.y += ny * overlap * 0.5;
      // Light velocity exchange.
      const va = a.vel.x * nx + a.vel.y * ny;
      const vb = b.vel.x * nx + b.vel.y * ny;
      const exchange = (vb - va) * 0.5;
      a.vel.x += nx * exchange;
      a.vel.y += ny * exchange;
      b.vel.x -= nx * exchange;
      b.vel.y -= ny * exchange;
    }
  }

  private collideBallVsActors(): void {
    // Check ball vs each actor.
    const actors: Array<{ body: { pos: { x: number; y: number }; vel: { x: number; y: number }; radius: number; mass: number }; player?: Player }> = [
      { body: this.p1.body, player: this.p1 },
      { body: this.p2.body, player: this.p2 },
      { body: this.gkLeft.body },
      { body: this.gkRight.body },
    ];
    const ball = this.ball.body;
    for (const a of actors) {
      // If a player has a foul-advantage freeze, the ball is parked at their
      // feet — skip resolution that would push them apart.
      if (a.player && a.player.freezeAdvantageTimer > 0) continue;
      const dx = ball.pos.x - a.body.pos.x;
      const dy = ball.pos.y - a.body.pos.y;
      const distSq = dx * dx + dy * dy;
      const minDist = ball.radius + a.body.radius;
      if (distSq < minDist * minDist && distSq > 1e-6) {
        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;
        // Push ball out along normal.
        ball.pos.x += nx * overlap;
        ball.pos.y += ny * overlap;
        // Reflect ball velocity relative to actor along normal with restitution.
        const rvx = ball.vel.x - a.body.vel.x;
        const rvy = ball.vel.y - a.body.vel.y;
        const dot = rvx * nx + rvy * ny;
        if (dot < 0) {
          const e = BALL.playerRestitution;
          const j = -(1 + e) * dot;
          ball.vel.x += j * nx;
          ball.vel.y += j * ny;
          // Add a little of actor's velocity for a "push" feel.
          ball.vel.x += a.body.vel.x * 0.35;
          ball.vel.y += a.body.vel.y * 0.35;
        }
        if (a.player && a.player.tackleState === 'committing') {
          // A committing tackler punches the ball harder.
          ball.vel.x += a.player.facingX * 180;
          ball.vel.y += a.player.facingY * 180;
        }
      }
    }
  }

  private clampPlayer(p: Player): void {
    const pos = p.body.pos;
    const r = p.body.radius;
    if (pos.x < PLAY_AREA.minX + r) {
      pos.x = PLAY_AREA.minX + r;
      p.body.vel.x = Math.max(0, p.body.vel.x);
    }
    if (pos.x > PLAY_AREA.maxX - r) {
      pos.x = PLAY_AREA.maxX - r;
      p.body.vel.x = Math.min(0, p.body.vel.x);
    }
    if (pos.y < PLAY_AREA.minY + r) {
      pos.y = PLAY_AREA.minY + r;
      p.body.vel.y = Math.max(0, p.body.vel.y);
    }
    if (pos.y > PLAY_AREA.maxY - r) {
      pos.y = PLAY_AREA.maxY - r;
      p.body.vel.y = Math.min(0, p.body.vel.y);
    }
  }

  private clampGoalkeeper(g: Goalkeeper): void {
    const pos = g.body.pos;
    const r = g.body.radius;
    if (pos.x < g.box.minX + r) {
      pos.x = g.box.minX + r;
      g.body.vel.x = Math.max(0, g.body.vel.x);
    }
    if (pos.x > g.box.maxX - r) {
      pos.x = g.box.maxX - r;
      g.body.vel.x = Math.min(0, g.body.vel.x);
    }
    if (pos.y < g.box.minY + r) {
      pos.y = g.box.minY + r;
      g.body.vel.y = Math.max(0, g.body.vel.y);
    }
    if (pos.y > g.box.maxY - r) {
      pos.y = g.box.maxY - r;
      g.body.vel.y = Math.min(0, g.body.vel.y);
    }
  }

  private computePossessor(): Side | null {
    const bx = this.ball.body.pos.x;
    const by = this.ball.body.pos.y;
    const d1 = Math.hypot(this.p1.body.pos.x - bx, this.p1.body.pos.y - by);
    const d2 = Math.hypot(this.p2.body.pos.x - bx, this.p2.body.pos.y - by);
    const threshold = PLAYER.radius + BALL.radius + 18;
    const closest = d1 < d2 ? d1 : d2;
    if (closest > threshold) return null;
    return d1 < d2 ? this.p1.side : this.p2.side;
  }

  private matchSideToPlayer(s: Side): Player | null {
    if (this.p1.side === s) return this.p1;
    if (this.p2.side === s) return this.p2;
    return null;
  }
}
