import { describe, expect, it } from 'vitest';
import { Player, PLAYER } from '../src/entities/Player.js';
import { StaminaSystem } from '../src/systems/StaminaSystem.js';

describe('StaminaSystem', () => {
  it('drains while sprinting', () => {
    const p = new Player('left', 0, 0, 0);
    p.stamina = 100;
    const s = new StaminaSystem();
    const dt = 1.0;
    const can = s.update(p, dt, true, true);
    expect(can).toBe(true);
    expect(p.stamina).toBeCloseTo(100 - PLAYER.staminaSprintCost);
  });

  it('cannot sprint below the floor', () => {
    const p = new Player('left', 0, 0, 0);
    p.stamina = PLAYER.staminaSprintFloor;
    const s = new StaminaSystem();
    const can = s.update(p, 1.0, true, true);
    expect(can).toBe(false);
  });

  it('regenerates faster when idle than walking', () => {
    const p = new Player('left', 0, 0, 0);
    p.stamina = 50;
    const s = new StaminaSystem();
    s.update(p, 1.0, false, true);
    const walked = p.stamina;
    p.stamina = 50;
    s.update(p, 1.0, false, false);
    const idled = p.stamina;
    expect(idled).toBeGreaterThan(walked);
  });

  it('clamps at staminaMax', () => {
    const p = new Player('left', 0, 0, 0);
    p.stamina = PLAYER.staminaMax - 1;
    const s = new StaminaSystem();
    s.update(p, 5.0, false, false);
    expect(p.stamina).toBe(PLAYER.staminaMax);
  });
});
