# Feature: Hebrew UI + Audio Toggle/SFX + Multiplayer Play Again + Basic Event Rate Limiting

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Deliver the remaining MVP gaps for PRD items 1/2/3/5 selected by product direction:
- Hebrew-only UI in all core client flows.
- Minimal audio effects with user on/off preference toggle.
- Multiplayer end-of-match results UX with low-friction "Play Again" flow.
- Basic anti-spam rate limiting for room/lobby control events (`create_room`, `join_room`, `start_game`) in addition to existing `shoot` throttling.
- Replace meteor visuals with missile sprite assets:
  - small/light meteors: `apps/client/src/assets/small_missile.png`
  - heavy meteors: `apps/client/src/assets/missile.png`

This is an implementation-hardening slice touching client UX/state, shared contracts usage, server socket handlers, and integration tests.

## User Story

As a mobile SkyShield player/host
I want Hebrew-first UX, clear end-of-match replay controls, and optional sound
So that sessions are clear, repeatable, and resilient to abuse without adding setup friction.

## Problem Statement

Current implementation is functionally close, but key PRD commitments remain incomplete:
- Core screens are still mostly English.
- `set_audio_pref` exists in contracts but has no implementation and no SFX toggle path.
- Game-over presentation is minimal overlay text, lacking dedicated end-screen/replay UX for multiplayer.
- Server throttles `shoot`, but does not apply comparable baseline throttling to lobby-control events, leaving easy event-spam vectors.
- Meteors are still rendered as CSS gradients instead of the requested missile sprite variants (small + heavy).

## Solution Statement

Implement a cohesive slice with five coordinated changes:
1. Introduce centralized Hebrew UI text dictionary and migrate core UI strings.
2. Add lightweight Web Audio utility and persistent audio preference wired through session store + optional server event.
3. Add game-over results panel and host-driven replay action within room flow using existing `start_game` lifecycle path.
4. Add reusable per-socket sliding-window or min-interval throttling utility for lobby control events with clear `error_event` codes and integration coverage.
5. Swap meteor rendering to missile image sprites by meteor type while preserving authoritative hitbox/position data.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: High
**Primary Systems Affected**: `apps/client` pages/game/session store, `apps/server` event handlers, server integration tests, docs
**Dependencies**: React 19, React Router 7, Socket.IO 4.8.x, Web Audio API (browser), existing Nx/npm scripts

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `PRD.md:44-55` - Why: MVP core requirements (Hebrew UI, end screen, profile persistence).
- `PRD.md:65` and `PRD.md:210-212` - Why: minimal SFX + simple on/off setting required.
- `PRD.md:110` - Why: explicit "Play Again" user story requirement.
- `shared/types/src/events.ts:21-37` - Why: existing socket contracts including `set_audio_pref`.
- `shared/types/src/events.ts:40-68` - Why: server/client event payload shapes to preserve.
- `apps/client/src/app/useSessionStore.ts:7-12` - Why: existing localStorage key and normalization pattern.
- `apps/client/src/app/useSessionStore.ts:59-101` - Why: socket lifecycle subscription/cleanup pattern (`on`/`off`) and status management.
- `apps/client/src/app/useSessionStore.ts:126-173` - Why: create/join/start action pattern and where audio preference emit should hook.
- `apps/client/src/pages/LobbyPage.tsx:31-123` - Why: core lobby UI strings and entry actions.
- `apps/client/src/pages/RoomPage.tsx:30-91` - Why: host controls and match shell placement.
- `apps/client/src/pages/OfflinePage.tsx:20-76` - Why: offline UI strings, button row, and profile copy.
- `apps/client/src/game/MatchView.tsx:91-181` - Why: HUD labels, game-over overlay, leaderboard UI; insertion point for end panel.
- `apps/client/src/game/MatchView.tsx:126-134` - Why: current meteor rendering loop to convert from CSS circle to image sprite.
- `apps/client/src/assets/missile.png` - Why: heavy meteor sprite target.
- `apps/client/src/assets/small_missile.png` - Why: small/light meteor sprite target.
- `apps/client/src/styles.css:189-215` - Why: existing `.meteor*` gradient styles to replace/simplify for sprite rendering.
- `apps/client/src/game/useMatchState.ts:51-80` - Why: `game_over` state transition behavior for replay reset expectations.
- `apps/server/src/events/lobbyEvents.ts:26-133` - Why: room control event validation and error emission pattern.
- `apps/server/src/events/shootEvents.ts:24-59` - Why: existing per-socket throttle pattern to mirror.
- `apps/server/src/game-loop/matchLifecycle.ts:266-286` - Why: authoritative `game_over` payload and replay compatibility constraints.
- `apps/server/src/events/startGame.integration.spec.ts:11-23` - Why: async event test helper pattern (`onceWithTimeout`).
- `apps/server/src/events/startGame.integration.spec.ts:88-216` - Why: existing `start_game` integration coverage extension point.
- `apps/server/src/events/lobbyEvents.integration.spec.ts:95-139` - Why: error-event assertion style for negative cases.
- `apps/server/src/events/shootEvents.integration.spec.ts:11-49` - Why: helper style for integration async waits/predicates.
- `apps/client/src/game/MatchView.spec.ts:1-38` - Why: client test style and deterministic helper assertions.
- `apps/client/src/offline/useOfflineMatchState.spec.ts:1-20` - Why: vitest unit style used for gameplay helpers.
- `README.md:78-83` - Why: known limitations section that must be updated after this feature.

### New Files to Create

- `apps/client/src/app/uiText.ts` - Centralized Hebrew text dictionary (and small typed accessor helpers).
- `apps/client/src/audio/sfx.ts` - Minimal Web Audio utility (`playShoot`, `playHit`, `playGameOver`, enable/disable control).
- `apps/server/src/events/rateLimit.ts` - Shared per-socket event limiter utility for lobby events.
- `apps/server/src/events/rateLimit.spec.ts` - Unit tests for rate-limiter utility.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Socket.IO Rooms](https://socket.io/docs/v4/rooms/)
  - Specific section: Joining/leaving and room broadcast semantics.
  - Why: Confirms existing room-scoped emit approach for replay/game-over updates.
- [Socket.IO Emitting events](https://socket.io/docs/v4/emitting-events/)
  - Specific section: Acknowledgements + timeout.
  - Why: Optional enhancement for `set_audio_pref` acknowledgement without adding hard dependency.
- [Socket.IO Listening to events](https://socket.io/docs/v4/listening-to-events/)
  - Specific section: `socket.off(...)` cleanup.
  - Why: Maintain leak-free listener lifecycle in `useSessionStore` and match hooks.
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
  - Specific section: `OscillatorNode`, `GainNode`, `AudioContext` basics.
  - Why: Implement minimal SFX without extra dependencies.
- [MDN AudioContext.resume()](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume)
  - Specific section: resume behavior and promise semantics.
  - Why: Handle autoplay restrictions after user interaction.
- [MDN Web Audio best practices](https://developer.mozilla.org/docs/Web/API/Web_Audio_API/Best_practices)
  - Specific section: autoplay policy and user gesture guidance.
  - Why: Prevent silent failures on mobile browsers.
- [MDN localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
  - Specific section: persistence behavior and `setItem/getItem` usage.
  - Why: Persist audio preference consistently with existing profile keys.
- [MDN `dir` global attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/dir)
  - Specific section: `rtl` usage.
  - Why: Ensure Hebrew UI directionality is explicit and stable.

### Patterns to Follow

**Naming Conventions:**
- Socket events are snake_case and typed centrally in `shared/types/src/events.ts`.
- Helper exports are verb-based and concise (`normalizeRoomCode`, `connectSocket`, `useMatchState`).
- Constants use uppercase snake case in module scope (`PLAYER_NAME_KEY`, `SHOT_COOLDOWN_MS`).

**Error Handling:**
- Server emits structured `error_event` with machine `code` + Hebrew message.
- Pattern example from `apps/server/src/events/shootEvents.ts:31-55`:
```ts
if (!isShootPayload(rawPayload)) {
  emitError(socket, { code: "INVALID_PAYLOAD", messageHe: "..." });
  return;
}
```

**Logging Pattern:**
- Server logs JSON lines with stable `event` names (`start_game_accepted`, `shoot_queued`) in event handlers.

**Socket Listener Lifecycle Pattern:**
- Register listeners in `useEffect` and always remove exact handler references in cleanup.
- Pattern example from `apps/client/src/app/useSessionStore.ts:91-101` and `apps/client/src/game/useMatchState.ts:73-79`.

**Test Pattern:**
- Server integration tests use ephemeral HTTP server + Socket.IO + `onceWithTimeout(...)` helper.
- Unit tests are deterministic and behavior-focused (`assert`/`vitest`) with minimal fixture setup.

**Anti-Patterns to Avoid:**
- Scattering raw UI strings across components (introduce centralized text source).
- Creating audio contexts repeatedly per sound effect.
- Adding event listeners without mirrored `off` cleanup.
- Implementing inconsistent throttle error codes across handlers.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Create shared primitives required by all four feature areas.

**Tasks:**
- Add client Hebrew text dictionary and typed key access.
- Add client audio preference state shape and storage key.
- Add server reusable per-socket limiter utility + tests.
- Define new/standardized error code(s) for throttled non-shoot events.

### Phase 2: Core Implementation

Implement each user-facing behavior end-to-end.

**Tasks:**
- Migrate core UI text in lobby/room/offline/match to Hebrew via dictionary.
- Add RTL direction where required.
- Implement SFX utility and wire sound playback to shoot/hit/game_over transitions.
- Implement audio toggle UI and persistence + `set_audio_pref` emit.
- Add multiplayer game-over panel with final leaderboard + host replay action.
- Replace CSS meteor gradients with missile PNG sprite rendering by meteor type (light/heavy).

### Phase 3: Integration

Wire feature interactions into existing lifecycle and networking.

**Tasks:**
- Ensure replay flow reuses existing `start_game` contract and room phase guards.
- Ensure status updates and offline/online mode transitions remain coherent.
- Apply server rate limits to `create_room`, `join_room`, `start_game` while preserving valid UX.
- Extend integration tests for throttling and replay semantics.

### Phase 4: Testing & Validation

Prove correctness with focused and full-suite validations.

**Tasks:**
- Add/extend unit tests for text helpers/audio util/rate limiter.
- Extend integration tests for throttled lobby actions.
- Extend client tests for end-panel render logic (or helper extraction assertions).
- Run lint/typecheck/tests/build for affected packages.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE `apps/client/src/app/uiText.ts`

- **IMPLEMENT**: Hebrew text map for lobby/room/offline/match/status/error labels; export typed constants/accessors.
- **PATTERN**: Mirror constants module style from `apps/client/src/app/useSessionStore.ts:7-12`.
- **IMPORTS**: none beyond TS types.
- **GOTCHA**: Keep keys stable to avoid repeated component rewrites.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/client`

### UPDATE `apps/client/src/pages/LobbyPage.tsx`

- **IMPLEMENT**: Replace hardcoded English strings with `uiText`; add Hebrew copy and directionality where needed.
- **PATTERN**: Existing controlled inputs/actions at `LobbyPage.tsx:39-94`.
- **IMPORTS**: `uiText` module.
- **GOTCHA**: Keep room-code placeholder compatible with uppercase entry flow.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/pages/RoomPage.tsx`

- **IMPLEMENT**: Hebrew labels for room header, host button states, wait-state text, player list units (`pts` replacement).
- **PATTERN**: Host guard logic at `RoomPage.tsx:25-40` must remain unchanged semantically.
- **IMPORTS**: `uiText` module.
- **GOTCHA**: Preserve navigation guards (`Navigate`) exactly.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/client`

### UPDATE `apps/client/src/pages/OfflinePage.tsx`

- **IMPLEMENT**: Hebrew strings for mode title, buttons, profile copy, intro copy.
- **PATTERN**: Keep phase-based button switch (`startMatch` vs `restartMatch`) at `OfflinePage.tsx:28-36`.
- **IMPORTS**: `uiText` module.
- **GOTCHA**: Offline mode should remain socket-free.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/game/MatchView.tsx`

- **IMPLEMENT**: Hebrew HUD labels; add dedicated game-over panel showing result, reason, and final leaderboard data from `gameOver.finalLeaderboard`; render meteors by type:
  - `light` -> `small_missile.png`
  - `heavy` -> `missile.png`
- **PATTERN**: Existing game-over condition at `MatchView.tsx:119-123`.
- **IMPORTS**: `uiText` module; `apps/client/src/assets/missile.png`; `apps/client/src/assets/small_missile.png`; optional audio hooks callbacks.
- **GOTCHA**: Do not break shot throttle/emit behavior (`MatchView.tsx:61-89`).
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/styles.css`

- **IMPLEMENT**: Replace `.meteor-light/.meteor-heavy/.meteor-core` gradient-based styles with sprite-friendly `.meteor` rules (`background-image`, sizing/object-fit/rotation if desired).
- **PATTERN**: Keep existing absolute positioning contract from `.meteor, .projectile` block.
- **IMPORTS**: none.
- **GOTCHA**: Preserve visual stacking (`z-index`) and center-origin transform used by hitbox positioning.
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### CREATE `apps/client/src/audio/sfx.ts`

- **IMPLEMENT**: Singleton `AudioContext` + helper tones for shoot/hit/game-over, with `setSfxEnabled(boolean)` and safe no-op on failures.
- **PATTERN**: Keep utility pure and framework-agnostic (similar to helper modules like `playerVisuals.ts`).
- **IMPORTS**: browser Web Audio types.
- **GOTCHA**: `AudioContext` may be suspended until gesture; call `resume()` in user-gesture paths before playback.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/client`

### UPDATE `apps/client/src/app/useSessionStore.ts`

- **IMPLEMENT**: Add audio preference state + localStorage key (`skyshield.audioEnabled`), emit `set_audio_pref` on toggle and connect, Hebrew-ready status messaging via `uiText`.
- **PATTERN**: Mirror profile persistence flow at `useSessionStore.ts:104-123`.
- **IMPORTS**: `uiText`, `sfx` helpers as needed.
- **GOTCHA**: Keep listener cleanup intact (`socket.off(...)`).
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/pages/LobbyPage.tsx` and `apps/client/src/pages/RoomPage.tsx` and `apps/client/src/pages/OfflinePage.tsx`

- **IMPLEMENT**: Add visible audio toggle control bound to session store preference.
- **PATTERN**: Reuse existing button row/control styling conventions from `page-layout.css`.
- **IMPORTS**: session store toggle getter/setter.
- **GOTCHA**: Toggle must work before room connection (offline-compatible).
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### UPDATE `apps/client/src/game/useMatchState.ts`

- **IMPLEMENT**: Trigger game-over SFX once on `game_over` transition; optionally clear/prepare replay UI state.
- **PATTERN**: Existing `onGameOver` handler at `useMatchState.ts:63-69`.
- **IMPORTS**: `sfx` utility.
- **GOTCHA**: Prevent repeated sound replay on repeated renders.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### CREATE `apps/server/src/events/rateLimit.ts`

- **IMPLEMENT**: Per-socket event limiter helper (min-interval or token-bucket) keyed by `(socketId,eventName)` with small TTL cleanup.
- **PATTERN**: Align simplicity with `SHOT_THROTTLE_MS` logic from `shootEvents.ts:11-59`.
- **IMPORTS**: none external.
- **GOTCHA**: Avoid unbounded map growth; include periodic stale entry pruning.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/server`

### CREATE `apps/server/src/events/rateLimit.spec.ts`

- **IMPLEMENT**: Deterministic tests: allows first event, blocks rapid repeat, allows after interval, independently keyed by event/socket.
- **PATTERN**: Node test style from `shared/types/src/events.spec.ts:1-94`.
- **IMPORTS**: `node:test`, `node:assert/strict`.
- **GOTCHA**: Use fakeable timestamp injection if utility supports it.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### UPDATE `apps/server/src/events/lobbyEvents.ts`

- **IMPLEMENT**: Apply new rate limiter for `create_room`, `join_room`, `start_game`; emit consistent throttle `error_event` code (e.g. `EVENT_THROTTLED`) with Hebrew message.
- **PATTERN**: Existing guard-return-emit pattern at `lobbyEvents.ts:26-133`.
- **IMPORTS**: `rateLimit` utility.
- **GOTCHA**: Throttle should not block first valid action.
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

### UPDATE `apps/server/src/events/shootEvents.ts`

- **IMPLEMENT**: Optional internal reuse of `rateLimit` utility (or keep current logic) for consistency; preserve external behavior/code.
- **PATTERN**: Existing `SHOT_THROTTLE_MS` semantics.
- **IMPORTS**: only if refactoring to shared limiter.
- **GOTCHA**: Do not change tested `SHOT_THROTTLED` behavior unexpectedly.
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

### UPDATE `apps/server/src/events/lobbyEvents.integration.spec.ts`

- **IMPLEMENT**: Add case asserting rapid duplicate `create_room`/`join_room` gets throttle `error_event` code.
- **PATTERN**: Existing invalid join test at `lobbyEvents.integration.spec.ts:95-139`.
- **IMPORTS**: none beyond existing.
- **GOTCHA**: Control timing (`setTimeout`) to avoid flaky tests.
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

### UPDATE `apps/server/src/events/startGame.integration.spec.ts`

- **IMPLEMENT**: Add case for rapid repeated `start_game` from host and assert throttle code (or existing phase error if second call occurs after phase transition; document intended behavior).
- **PATTERN**: Existing non-host and countdown assertions at `startGame.integration.spec.ts:111-123`.
- **IMPORTS**: none beyond existing.
- **GOTCHA**: Race between phase transition and throttle window; make assertion deterministic.
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

### UPDATE `apps/client/src/game/MatchView.spec.ts`

- **IMPLEMENT**: Add focused assertions for new end-panel derivation helper(s) if extracted (recommended).
- **PATTERN**: Deterministic helper-based tests currently used at `MatchView.spec.ts:6-38`.
- **IMPORTS**: helper exports from `MatchView` or new view-model module.
- **GOTCHA**: Avoid brittle DOM snapshot tests unless necessary.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `README.md`

- **IMPLEMENT**: Document Hebrew UI, audio toggle/SFX, multiplayer replay behavior, and lobby event throttling.
- **PATTERN**: Keep concise bullet structure used in current README sections.
- **IMPORTS**: none.
- **GOTCHA**: Remove obsolete limitation bullets once addressed.
- **VALIDATE**: `npm.cmd run build`

### UPDATE `IMPLEMENTED_SO_FAR.md`

- **IMPLEMENT**: Append new slice with changed files, tests, and validation outcomes.
- **PATTERN**: Follow existing section style and validation list format.
- **IMPORTS**: none.
- **GOTCHA**: Keep historical sections intact; append only.
- **VALIDATE**: `npm.cmd run lint`

---

## TESTING STRATEGY

### Unit Tests

- Client:
  - Validate new helper logic for end-panel text/state derivation (if extracted).
  - Validate audio utility behavior with deterministic guards where possible (fallback no-throw semantics).
- Server:
  - Rate limiter utility unit tests (`rateLimit.spec.ts`) for allow/block windows and key isolation.

### Integration Tests

- Extend lobby integration tests to verify throttle behavior for rapid repeated lobby actions.
- Extend start-game integration tests to verify replay + repeated start interaction handling.
- Keep existing shoot integration tests passing to ensure no regression in gameplay throttling.
- Client visual smoke check for missile sprite render in active match states.

### Edge Cases

- Audio toggled off during active match: no SFX should play after toggle.
- Audio enabled but context suspended: first user gesture resumes context, then playback succeeds.
- Host hits Play Again rapidly: one accepted start, subsequent attempts throttled or phase-rejected deterministically.
- Non-host in game-over state attempts replay: blocked by existing host checks.
- Rapid duplicate `join_room` from same socket within window: deterministic throttle response.
- Hebrew + RTL layout on narrow mobile widths does not break existing control alignment.
- Small/heavy missile sprites align to meteor authoritative position/radius and remain readable on mobile sizes.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

- `npm.cmd run lint --workspace shared/types`
- `npm.cmd run lint --workspace apps/server`
- `npm.cmd run lint --workspace apps/client`

### Level 2: Unit Tests

- `npm.cmd run test --workspace shared/types`
- `npm.cmd run test --workspace apps/server`
- `npm.cmd run test --workspace apps/client`

### Level 3: Integration Tests

- `npm.cmd run test:integration --workspace apps/server`

### Level 4: Manual Validation

1. Start app: `npm.cmd run dev`.
2. In lobby (`/`): verify all visible text is Hebrew and input flow unchanged.
3. Toggle audio off/on and refresh page: preference persists.
4. Create room with 2 clients, start match, score at least one hit, force game-over:
   - game-over panel shows result/reason/final ranking/accuracy.
   - meteors are rendered as missile sprites by type (small/light uses `small_missile.png`, heavy uses `missile.png`) and not legacy gradient circles.
5. As host, click Play Again in room after game-over:
   - countdown restarts and match starts without leaving room.
6. Trigger rapid repeated clicks on create/join/start:
   - server emits throttle error codes and app remains stable.

### Level 5: Additional Validation (Optional)

- `npm.cmd run build --workspace shared/types`
- `npm.cmd run build --workspace apps/server`
- `npm.cmd run build --workspace apps/client`
- `npm.cmd run build`

---

## ACCEPTANCE CRITERIA

- [ ] Core client flows (`/`, `/room/:roomCode`, `/offline`, in-match overlays/panels) are Hebrew-only.
- [ ] Audio toggle exists, persists in `localStorage`, and SFX obey toggle state.
- [ ] Multiplayer game-over shows full result/ranking/accuracy and supports host Play Again flow.
- [ ] Rapid spam on `create_room`/`join_room`/`start_game` is throttled with deterministic `error_event` codes.
- [ ] Existing shoot throttle and gameplay flow are not regressed.
- [ ] Light meteors render from `apps/client/src/assets/small_missile.png` and heavy meteors render from `apps/client/src/assets/missile.png`, both with correct on-screen positioning.
- [ ] All validation commands pass with zero errors.
- [ ] Unit and integration tests cover newly introduced paths.
- [ ] README and implementation log are updated.

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed immediately
- [ ] All validation commands executed successfully
- [ ] Full test suite passes (unit + integration)
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met
- [ ] Code reviewed for quality and maintainability

---

## NOTES

- Keep socket contract names unchanged (snake_case); do not introduce parallel event names.
- `set_audio_pref` server handling can remain lightweight in MVP (store in socket data/log/no-op) as long as client UX is complete and deterministic.
- For replay, prefer reusing `start_game` semantics rather than inventing a new server event unless product explicitly expands contract.
- If sandbox `spawn EPERM` appears during local validation, run the same commands with approved unsandboxed permissions (as documented in current repo notes).
- Phaser migration remains out-of-scope for this specific task set.

**Confidence Score**: 8.5/10 for one-pass implementation success.
