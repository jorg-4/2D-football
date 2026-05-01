import { Ball } from '../entities/Ball.js';
import { Goalkeeper, GK } from '../entities/Goalkeeper.js';
import { CENTER_X, CENTER_Y } from '../entities/Pitch.js';

/**
 * Goalkeeper AI: rubber-band tracks the ball Y-position, lunges along
 * predicted intercept on hard shots, sprints to the ball if it enters
 * the box and clears toward midfield on contact.
 */
export class AISystem {
  /**
   * Update goalkeeper movement and return a clearance impulse if the GK
   * should kick the ball this tick.
   */
  update(
    gk: Goalkeeper,
    ball: Ball,
    dt: number,
  ): { kick: { vx: number; vy: number } | null } {
    const ownGoalSide = gk.side;
    const ballX = ball.body.pos.x;
    const ballY = ball.body.pos.y;
    const ballVx = ball.body.vel.x;
    const ballVy = ball.body.vel.y;
    const ballSpeed = Math.hypot(ballVx, ballVy);

    const inOwnHalf =
      (ownGoalSide === 'left' && ballX < CENTER_X) ||
      (ownGoalSide === 'right' && ballX > CENTER_X);
    const movingTowardGoal =
      (ownGoalSide === 'left' && ballVx < 0) ||
      (ownGoalSide === 'right' && ballVx > 0);

    let targetY = ballY;
    let targetX = (gk.box.minX + gk.box.maxX) / 2;
    let lunge = false;

    if (inOwnHalf && movingTowardGoal && ballSpeed > GK.lungeThresholdSpeed) {
      const goalLineX = ownGoalSide === 'left' ? gk.box.minX + 8 : gk.box.maxX - 8;
      const dx = goalLineX - ballX;
      const t = ballVx !== 0 ? dx / ballVx : 0;
      if (t > 0 && t < 0.6) {
        targetY = ballY + ballVy * t;
        targetX = goalLineX;
        lunge = true;
      }
    }

    // Ball in own box: sprint to it.
    const ballInBox =
      ballX >= gk.box.minX &&
      ballX <= gk.box.maxX &&
      ballY >= gk.box.minY &&
      ballY <= gk.box.maxY;
    if (ballInBox) {
      targetX = ballX;
      targetY = ballY;
      lunge = true;
    }

    // Clamp target to box.
    targetX = Math.max(gk.box.minX, Math.min(gk.box.maxX, targetX));
    targetY = Math.max(gk.box.minY, Math.min(gk.box.maxY, targetY));

    if (lunge) {
      const dx = targetX - gk.body.pos.x;
      const dy = targetY - gk.body.pos.y;
      const len = Math.hypot(dx, dy);
      if (len > 1e-3) {
        gk.body.vel.x = (dx / len) * GK.lungeSpeed;
        gk.body.vel.y = (dy / len) * GK.lungeSpeed;
      }
    } else {
      // Spring damping toward target.
      const k = GK.trackingStiffness;
      gk.body.vel.x += (targetX - gk.body.pos.x) * k * dt - gk.body.vel.x * Math.min(1, k * dt);
      gk.body.vel.y += (targetY - gk.body.pos.y) * k * dt - gk.body.vel.y * Math.min(1, k * dt);
    }

    // Constrain GK to box (post-integration also clamps, but predict here).
    const dxBall = ballX - gk.body.pos.x;
    const dyBall = ballY - gk.body.pos.y;
    const distToBall = Math.hypot(dxBall, dyBall);
    if (
      ballInBox &&
      distToBall < gk.body.radius + ball.body.radius + 4
    ) {
      // Clear toward midfield: away from own goal, slight Y nudge to cross it.
      const dirX = ownGoalSide === 'left' ? 1 : -1;
      const dirY = (CENTER_Y - ballY) * 0.0006;
      const norm = Math.hypot(dirX, dirY);
      return {
        kick: {
          vx: (dirX / norm) * GK.clearPower,
          vy: (dirY / norm) * GK.clearPower,
        },
      };
    }

    return { kick: null };
  }
}
