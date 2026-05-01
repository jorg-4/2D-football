type Listener<T> = (payload: T) => void;

export class EventBus<EventMap extends Record<string, unknown>> {
  private listeners: { [K in keyof EventMap]?: Set<Listener<EventMap[K]>> } = {};

  on<K extends keyof EventMap>(event: K, fn: Listener<EventMap[K]>): () => void {
    let set = this.listeners[event];
    if (!set) {
      set = new Set();
      this.listeners[event] = set;
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const set = this.listeners[event];
    if (!set) return;
    for (const fn of set) fn(payload);
  }
}

export interface GameEvents extends Record<string, unknown> {
  goal: { scoringSide: 'left' | 'right' };
  kickoff: { side: 'left' | 'right' };
  halftime: void;
  fullTime: void;
  pause: boolean;
  shot: { power: number; side: 'left' | 'right' };
  tackle: { foul: boolean };
  whistle: 'kickoff' | 'halftime' | 'fulltime';
}
