import { Body } from '../physics/Body.js';

export const PLAYER = {
  radius: 22,
  mass: 1.0,
  walkSpeed: 200,
  sprintSpeed: 340,
  acceleration: 1400,
  damping: 8.0,
  staminaMax: 100,
  staminaSprintCost: 30,
  staminaRegenWalk: 18,
  staminaRegenIdle: 35,
  staminaSprintFloor: 10,
  /** Charge curve */
  chargeMinPower: 400,
  chargeMaxPower: 1200,
  chargeMaxTime: 1.2,
  /** Tackle */
  tackleRange: 22,
  tackleCommit: 0.4,
  tackleRecovery: 0.8,
  foulFromBehindChance: 0.3,
  foulFreezeDuration: 1.5,
} as const;

export type Side = 'left' | 'right';

export class Player {
  readonly body: Body;
  readonly side: Side;
  readonly index: 0 | 1;
  /** Last non-zero movement direction (unit vector). Default points toward field center. */
  facingX: number;
  facingY = 0;
  /** Current intended unit input vector (set from input each tick). */
  inputX = 0;
  inputY = 0;
  /** True while sprint key is held and stamina permits. */
  sprinting = false;
  stamina: number;
  /** Charge state */
  charging = false;
  chargeTime = 0;
  /** Tackle FSM */
  tackleState: 'idle' | 'committing' | 'recovering' = 'idle';
  tackleTimer = 0;
  /** While > 0, player is frozen by a foul against them and given uncontested possession. */
  freezeAdvantageTimer = 0;
  /** True if player currently controls the ball. */
  hasBall = false;
  /** Stats */
  stats = {
    shots: 0,
    shotsOnTarget: 0,
    tacklesWon: 0,
    distanceCovered: 0,
  };

  constructor(side: Side, index: 0 | 1, x: number, y: number) {
    this.side = side;
    this.index = index;
    this.body = new Body(PLAYER.radius, PLAYER.mass, PLAYER.damping, x, y);
    this.stamina = PLAYER.staminaMax;
    this.facingX = side === 'left' ? 1 : -1;
  }

  reset(x: number, y: number): void {
    this.body.pos.set(x, y);
    this.body.prevPos.set(x, y);
    this.body.vel.set(0, 0);
    this.charging = false;
    this.chargeTime = 0;
    this.tackleState = 'idle';
    this.tackleTimer = 0;
    this.sprinting = false;
    this.freezeAdvantageTimer = 0;
  }

  chargePower(): number {
    if (!this.charging) return 0;
    const t = Math.min(this.chargeTime, PLAYER.chargeMaxTime) / PLAYER.chargeMaxTime;
    return PLAYER.chargeMinPower + (PLAYER.chargeMaxPower - PLAYER.chargeMinPower) * t;
  }
}
