/**
 * Fixed-timestep simulation, variable-rate render. The render callback
 * receives an interpolation alpha in [0,1] for blending between the last
 * two simulation states.
 */
export class GameLoop {
  private readonly fixedDt: number;
  private accumulator = 0;
  private lastTime = 0;
  private rafHandle = 0;
  private running = false;

  constructor(
    private readonly tick: (dt: number) => void,
    private readonly render: (alpha: number) => void,
    fixedHz = 120,
    private readonly maxFrameTime = 0.25,
  ) {
    this.fixedDt = 1 / fixedHz;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    const frame = (now: number) => {
      if (!this.running) return;
      let dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      if (dt > this.maxFrameTime) dt = this.maxFrameTime;
      this.accumulator += dt;
      while (this.accumulator >= this.fixedDt) {
        this.tick(this.fixedDt);
        this.accumulator -= this.fixedDt;
      }
      const alpha = this.accumulator / this.fixedDt;
      this.render(alpha);
      this.rafHandle = requestAnimationFrame(frame);
    };
    this.rafHandle = requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafHandle);
  }

  get fixedTickSeconds(): number {
    return this.fixedDt;
  }
}
