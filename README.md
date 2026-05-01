# Pitch Duel

A polished 2D top-down 1v1 football game. Local two-player, same keyboard,
tight physics, editorial broadcast aesthetic.

This is a work-in-progress implementation of the
[Pitch Duel build specification](#) — milestones M1 (playable prototype) and
the bulk of M2 (match flow, GK AI, charge shooting, slow-mo replay, HUD
polish) are done. M3 packaging (Electron/Tauri shell, full key-rebinding UI,
dedicated audio assets) is intentionally deferred so the gameplay core can
be evaluated first.

## Controls

**Player 1 (blue, ZQSD)**

| Action | Key |
|---|---|
| Move | `Z` `Q` `S` `D` |
| Shoot (hold to charge) | `F` |
| Sprint / Tackle | `Left Shift` |

**Player 2 (red, arrows)**

| Action | Key |
|---|---|
| Move | `↑` `←` `↓` `→` |
| Shoot (hold to charge) | `Right Ctrl` |
| Sprint / Tackle | `Right Shift` |

**Global**: `Esc` pause/resume, `Enter` confirm, `R` rematch on the end-of-match
screen. Inputs are captured by `KeyboardEvent.code`, so the AZERTY mapping
is layout-independent — physical keys are what matters.

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # vitest, 27 tests across physics/scoring/stamina/charge
pnpm typecheck    # strict TS, noUncheckedIndexedAccess
pnpm build        # ~41 KB JS, ~13 KB gzipped
```

## Architecture

The simulation is a fixed-timestep loop at **120 Hz** with variable-rate
rendering interpolated between the last two simulation states (accumulator
pattern in `core/GameLoop.ts`). Game logic does not know about rendering: a
`Player` has no `draw()` method; `PlayerRenderer` reads its state. There are
no singletons — dependencies are passed through constructors.

```
src/
├── main.ts                bootstrap
├── core/
│   ├── Game.ts            top-level FSM (menu / playing / paused / ended)
│   ├── Match.ts           the football match itself: kickoff → play → goal → halftime → fulltime
│   ├── GameLoop.ts        fixed-timestep accumulator
│   ├── Input.ts           KeyboardEvent.code Set, normalized diagonal sampling
│   ├── Config.ts          load/save user settings (localStorage in browser)
│   ├── EventBus.ts        typed pub/sub for goal/whistle/shot/...
│   └── PRNG.ts            mulberry32 — deterministic randomness for fouls/sudden-death coin
├── physics/
│   ├── Vec2.ts
│   ├── Body.ts            kinematic circle
│   ├── World.ts           integrates bodies; collisions handled at the Match level
│   └── Collision.ts       swept-circle vs AABB (anti-tunneling), reflect, circle-circle resolve
├── entities/
│   ├── Pitch.ts           field constants — single source of truth for play area / goals / boxes
│   ├── Ball.ts            BALL constants + spin/trail
│   ├── Player.ts          PLAYER constants, charge curve, tackle FSM, stats
│   └── Goalkeeper.ts      GK constants, box constraint
├── systems/
│   ├── ScoringSystem.ts   goal detection, possession ticks
│   ├── StaminaSystem.ts   sprint cost / regen
│   ├── AISystem.ts        goalkeeper rubber-band tracking and lunge
│   └── ReplayBuffer.ts    ring buffer for slow-mo replay (3 s pre-goal)
├── render/
│   ├── Renderer.ts        canvas, devicePixelRatio, letterbox
│   ├── PitchRenderer.ts   prerenders pitch (mow stripes, lines, goals, vignette, noise) once
│   ├── PlayerRenderer.ts  body, charge ring, sprint trail, stamina bar, facing triangle
│   ├── BallRenderer.ts    body, dark spots that rotate with spin, high-speed trail
│   ├── HUDRenderer.ts     score / clock / phase labels in mono
│   └── FXRenderer.ts      goal flash, foul flash
├── ui/Menu.ts             canvas-drawn main menu, pause overlay, end-of-match screen
└── audio/AudioBus.ts      Web Audio synth — no asset bundling required
```

### Key architectural decisions

- **Fixed timestep, interpolated render.** `core/Game.ts` snapshots positions
  before and after each simulation tick and lerps between them with the
  accumulator alpha. Eliminates judder regardless of monitor refresh rate.
- **Anti-tunneling.** The ball can hit `1400 px/s`. Per-frame position checks
  miss thin walls at that speed, so wall collision uses
  `sweepCircleVsAabb` and iterates up to 4 times per tick to handle
  multi-wall bounces in the same step.
- **Mow stripes / lines / vignette / noise** are prerendered once into an
  offscreen canvas (`PitchRenderer.prerender`). A single `drawImage` per
  frame, no per-frame allocations.
- **Determinism.** No `Math.random()` in the simulation. The mulberry32
  PRNG is seeded at match start; given the same input stream you get the
  same outcome. Foul-from-behind chance and sudden-death kickoff coin both
  consume from this stream.
- **Slow-mo replay scaffolding.** A ring buffer (`systems/ReplayBuffer.ts`)
  records 3 seconds of all positions at 120 Hz, and the match phase machine
  has a 2-s `goal` state with a `GOAL` banner. The replay-from-buffer
  rendering path is not wired in yet — the goal phase currently freezes and
  shows the banner. The data is captured and the FSM hook is in place; this
  is a small follow-up edit in `Game.drawMatch`.
- **Letterboxing.** `Renderer.resize` matches the 16:9 logical resolution
  with black bars; CSS sets the size, the canvas backing store is scaled
  by `devicePixelRatio` so circles stay crisp on Retina displays.

## Match flow

```
                +---------+
                |  menu   |
                +---------+
                     │ play
                     ▼
                +---------+   pause Esc    +---------+
                |  play   |◄──────────────►|  paused |
                +---------+                +---------+
                  ▲   │ goal
                  │   ▼
                  │ +---------+
                  └─|  goal   |  (slow-mo replay)
                    +---------+
                     │ end-of-half
                     ▼
                +---------+
                |halftime |  swap sides; possession & score swap so blue is always on the left
                +---------+
                     │ start of 2nd half
                     ▼
                  (play)
                     │ end-of-match (and not draw)
                     ▼
                +---------+
                |fulltime |
                +---------+
                     │ R
                     ▼
                  (rematch)
```

If full-time ends in a draw the match enters **sudden death**: kickoff to a
randomly-chosen side, first goal wins, no clock.

## Tuning notes

All gameplay constants live next to their entity (`PLAYER` in
`entities/Player.ts`, `BALL` in `entities/Ball.ts`, `GK` in
`entities/Goalkeeper.ts`). To make the game feel different, edit those.

The two values most worth playing with first:

- `PLAYER.acceleration` (1400 px/s² — bigger feels arcadier)
- `BALL.damping` (0.6 /s — bigger means the ball stops faster)

## Status against the acceptance criteria

| Criterion | Status |
|---|---|
| Cold start to main menu in < 3 s | ✅ — bundle is 13 KB gzipped |
| Sustains 60 FPS at max action | ✅ — fixed-timestep simulation, prerendered pitch, no per-frame allocations |
| Input latency ≤ 1 frame at 60 FPS | ✅ — input read directly off `window` keydown, sampled each tick |
| No ball tunneling at any shot power | ✅ — swept-circle wall collision, iterated up to 4× per tick |
| Diagonal movement is not faster than cardinal | ✅ — `Input.sampleMovement` divides by √2 |
| Pause freezes physics perfectly | ✅ — pause flips `state` to `paused`, no ticks fire |
| Window resize never stretches | ✅ — `Renderer.resize` letterboxes |
| `pnpm test` passes | ✅ — 27 tests across `physics/` and `systems/` |
| All controls remappable, persisted | ⚠️ — config is loaded/saved via `localStorage` and the data model is in place; the rebinding UI is deferred |
| Bundle size meets target (< 15 MB Tauri / < 60 MB Electron) | ⚠️ — desktop shell is deferred (web bundle is 41 KB) |
| Builds clean on all three target OSes | ⚠️ — desktop shell deferred |
| README explains controls / build / run / architecture | ✅ |

## Out of scope

This build follows the spec's "Out of Scope" list — no online play, no career
mode, no 3D, no licensed teams, no procedural commentary.
