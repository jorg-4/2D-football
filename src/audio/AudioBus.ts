/**
 * Web Audio bus that synthesizes short SFX procedurally — no asset bundling
 * required. Each play() schedules an Oscillator/Gain pair so the cost is
 * tiny and unlock is handled on first user input.
 */
export type Sfx =
  | 'kick'
  | 'wallBounce'
  | 'tackle'
  | 'goal'
  | 'whistle'
  | 'menuTick';

export class AudioBus {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  masterVolume = 1.0;
  sfxVolume = 1.0;
  unlocked = false;

  unlock(): void {
    if (this.unlocked) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.masterVolume;
      this.master.connect(this.ctx.destination);
      this.sfx = this.ctx.createGain();
      this.sfx.gain.value = this.sfxVolume;
      this.sfx.connect(this.master);
      this.unlocked = true;
    } catch {
      this.ctx = null;
    }
  }

  setMaster(v: number): void {
    this.masterVolume = v;
    if (this.master) this.master.gain.value = v;
  }
  setSfx(v: number): void {
    this.sfxVolume = v;
    if (this.sfx) this.sfx.gain.value = v;
  }

  play(kind: Sfx, params: { power?: number } = {}): void {
    if (!this.unlocked || !this.ctx || !this.sfx) return;
    const ctx = this.ctx;
    const dest = this.sfx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(dest);

    switch (kind) {
      case 'kick': {
        const power = params.power ?? 0.5;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220 + power * 160, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.18);
        gain.gain.setValueAtTime(0.55, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }
      case 'wallBounce': {
        osc.type = 'square';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
      case 'tackle': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }
      case 'goal': {
        // Layered cheer: noise burst + tone sweep.
        const buf = ctx.createBuffer(1, ctx.sampleRate * 1.4, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          const env = Math.exp(-i / data.length * 1.8);
          data[i] = (Math.random() * 2 - 1) * env * 0.5;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const ngain = ctx.createGain();
        ngain.gain.value = 0.6;
        noise.connect(ngain);
        ngain.connect(dest);
        noise.start(now);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.linearRampToValueAtTime(660, now + 0.4);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.3);
        break;
      }
      case 'whistle': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200, now);
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
        gain.gain.linearRampToValueAtTime(0.0, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.36);
        break;
      }
      case 'menuTick': {
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.06);
        break;
      }
    }
  }
}
