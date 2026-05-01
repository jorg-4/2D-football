import { FIELD } from '../entities/Pitch.js';

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not acquire 2D context');
    this.ctx = ctx;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const wW = window.innerWidth;
    const wH = window.innerHeight;
    const targetAspect = FIELD.width / FIELD.height;
    const windowAspect = wW / wH;
    let cssW: number;
    let cssH: number;
    if (windowAspect > targetAspect) {
      cssH = wH;
      cssW = cssH * targetAspect;
    } else {
      cssW = wW;
      cssH = cssW / targetAspect;
    }
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.scale = (cssW / FIELD.width) * dpr;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  beginFrame(): void {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0a0b';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
}
