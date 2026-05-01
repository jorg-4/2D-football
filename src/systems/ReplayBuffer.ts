export interface ReplayFrame {
  ballX: number;
  ballY: number;
  p1X: number;
  p1Y: number;
  p2X: number;
  p2Y: number;
  gkLX: number;
  gkLY: number;
  gkRX: number;
  gkRY: number;
}

/**
 * Ring buffer recording the last `seconds * hz` simulation frames.
 * Used to play back the moments before a goal in slow motion.
 */
export class ReplayBuffer {
  private buf: ReplayFrame[] = [];
  private writeIdx = 0;
  private filled = 0;
  readonly capacity: number;

  constructor(seconds: number, hz: number) {
    this.capacity = Math.ceil(seconds * hz);
    for (let i = 0; i < this.capacity; i++) {
      this.buf.push({
        ballX: 0, ballY: 0,
        p1X: 0, p1Y: 0, p2X: 0, p2Y: 0,
        gkLX: 0, gkLY: 0, gkRX: 0, gkRY: 0,
      });
    }
  }

  push(frame: ReplayFrame): void {
    const slot = this.buf[this.writeIdx]!;
    slot.ballX = frame.ballX;
    slot.ballY = frame.ballY;
    slot.p1X = frame.p1X;
    slot.p1Y = frame.p1Y;
    slot.p2X = frame.p2X;
    slot.p2Y = frame.p2Y;
    slot.gkLX = frame.gkLX;
    slot.gkLY = frame.gkLY;
    slot.gkRX = frame.gkRX;
    slot.gkRY = frame.gkRY;
    this.writeIdx = (this.writeIdx + 1) % this.capacity;
    if (this.filled < this.capacity) this.filled++;
  }

  /** Read frames in chronological order (oldest first). */
  ordered(): ReplayFrame[] {
    if (this.filled < this.capacity) return this.buf.slice(0, this.filled);
    const out: ReplayFrame[] = [];
    for (let i = 0; i < this.capacity; i++) {
      const idx = (this.writeIdx + i) % this.capacity;
      out.push(this.buf[idx]!);
    }
    return out;
  }

  clear(): void {
    this.writeIdx = 0;
    this.filled = 0;
  }
}
