export interface ControlBindings {
  up: string;
  left: string;
  down: string;
  right: string;
  shoot: string;
  sprint: string;
}

export const DEFAULT_BINDINGS_P1: ControlBindings = {
  up: 'KeyZ',
  left: 'KeyQ',
  down: 'KeyS',
  right: 'KeyD',
  shoot: 'KeyF',
  sprint: 'ShiftLeft',
};

export const DEFAULT_BINDINGS_P2: ControlBindings = {
  up: 'ArrowUp',
  left: 'ArrowLeft',
  down: 'ArrowDown',
  right: 'ArrowRight',
  shoot: 'ControlRight',
  sprint: 'ShiftRight',
};

export class Input {
  private held = new Set<string>();
  private justPressed = new Set<string>();
  private listeners: Array<(code: string) => void> = [];
  private bound = false;
  private keyDownHandler = (e: KeyboardEvent) => {
    if (!this.held.has(e.code)) {
      this.justPressed.add(e.code);
      for (const fn of this.listeners) fn(e.code);
    }
    this.held.add(e.code);
    if (
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight' ||
      e.code === 'Space' ||
      e.code === 'Tab'
    ) {
      e.preventDefault();
    }
  };
  private keyUpHandler = (e: KeyboardEvent) => {
    this.held.delete(e.code);
  };
  private blurHandler = () => {
    this.held.clear();
  };

  bind(): void {
    if (this.bound) return;
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    window.addEventListener('blur', this.blurHandler);
    this.bound = true;
  }

  unbind(): void {
    if (!this.bound) return;
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    window.removeEventListener('blur', this.blurHandler);
    this.bound = false;
  }

  isDown(code: string): boolean {
    return this.held.has(code);
  }

  /** Consumes the just-pressed flag; subsequent calls in the same frame return false. */
  wasPressed(code: string): boolean {
    if (this.justPressed.has(code)) {
      this.justPressed.delete(code);
      return true;
    }
    return false;
  }

  /** Subscribe to the next keydown (used for rebinding). */
  onceAnyKey(fn: (code: string) => void): void {
    const wrapper = (code: string) => {
      this.listeners = this.listeners.filter((l) => l !== wrapper);
      fn(code);
    };
    this.listeners.push(wrapper);
  }

  endFrame(): void {
    this.justPressed.clear();
  }

  /**
   * Sample movement from a binding, returning a unit-length direction (or zero).
   * Diagonal movement is normalized so total speed equals cardinal speed.
   */
  sampleMovement(bindings: ControlBindings): { x: number; y: number } {
    let x = 0;
    let y = 0;
    if (this.held.has(bindings.up)) y -= 1;
    if (this.held.has(bindings.down)) y += 1;
    if (this.held.has(bindings.left)) x -= 1;
    if (this.held.has(bindings.right)) x += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.SQRT2;
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }
}
