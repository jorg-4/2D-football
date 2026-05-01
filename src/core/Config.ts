import { ControlBindings, DEFAULT_BINDINGS_P1, DEFAULT_BINDINGS_P2 } from './Input.js';

export interface MatchSettings {
  halfLengthSeconds: number;
  goalkeeperEnabled: boolean;
  penaltyBoxesEnabled: boolean;
}

export interface AudioSettings {
  master: number;
  sfx: number;
}

export interface UserConfig {
  controls: { p1: ControlBindings; p2: ControlBindings };
  audio: AudioSettings;
  match: MatchSettings;
}

const STORAGE_KEY = 'pitch-duel:config:v1';

export const DEFAULT_CONFIG: UserConfig = {
  controls: { p1: DEFAULT_BINDINGS_P1, p2: DEFAULT_BINDINGS_P2 },
  audio: { master: 1.0, sfx: 1.0 },
  match: { halfLengthSeconds: 180, goalkeeperEnabled: true, penaltyBoxesEnabled: true },
};

export function loadConfig(): UserConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_CONFIG);
    const parsed = JSON.parse(raw) as Partial<UserConfig>;
    return {
      controls: {
        p1: { ...DEFAULT_BINDINGS_P1, ...(parsed.controls?.p1 ?? {}) },
        p2: { ...DEFAULT_BINDINGS_P2, ...(parsed.controls?.p2 ?? {}) },
      },
      audio: { ...DEFAULT_CONFIG.audio, ...(parsed.audio ?? {}) },
      match: { ...DEFAULT_CONFIG.match, ...(parsed.match ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

export function saveConfig(cfg: UserConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {
    // Best-effort.
  }
}
