import { Player, PLAYER } from '../entities/Player.js';

export class StaminaSystem {
  /**
   * Update stamina for one player. Returns true if the player is currently
   * able to sprint (driving the actual `sprinting` flag is the caller's job).
   */
  update(p: Player, dt: number, sprintRequested: boolean, isMoving: boolean): boolean {
    const canSprint = sprintRequested && p.stamina > PLAYER.staminaSprintFloor;
    if (canSprint) {
      p.stamina = Math.max(0, p.stamina - PLAYER.staminaSprintCost * dt);
    } else if (isMoving) {
      p.stamina = Math.min(PLAYER.staminaMax, p.stamina + PLAYER.staminaRegenWalk * dt);
    } else {
      p.stamina = Math.min(PLAYER.staminaMax, p.stamina + PLAYER.staminaRegenIdle * dt);
    }
    return canSprint;
  }
}
