import { describe, expect, it } from 'vitest';
import { Player, PLAYER } from '../src/entities/Player.js';

describe('Charge curve', () => {
  it('returns 0 when not charging', () => {
    const p = new Player('left', 0, 0, 0);
    expect(p.chargePower()).toBe(0);
  });

  it('starts at chargeMinPower at t=0', () => {
    const p = new Player('left', 0, 0, 0);
    p.charging = true;
    p.chargeTime = 0;
    expect(p.chargePower()).toBeCloseTo(PLAYER.chargeMinPower);
  });

  it('reaches chargeMaxPower at chargeMaxTime', () => {
    const p = new Player('left', 0, 0, 0);
    p.charging = true;
    p.chargeTime = PLAYER.chargeMaxTime;
    expect(p.chargePower()).toBeCloseTo(PLAYER.chargeMaxPower);
  });

  it('caps at chargeMaxPower past chargeMaxTime', () => {
    const p = new Player('left', 0, 0, 0);
    p.charging = true;
    p.chargeTime = PLAYER.chargeMaxTime * 5;
    expect(p.chargePower()).toBeCloseTo(PLAYER.chargeMaxPower);
  });

  it('linear ramp at the midpoint', () => {
    const p = new Player('left', 0, 0, 0);
    p.charging = true;
    p.chargeTime = PLAYER.chargeMaxTime / 2;
    const expected = (PLAYER.chargeMinPower + PLAYER.chargeMaxPower) / 2;
    expect(p.chargePower()).toBeCloseTo(expected);
  });
});
