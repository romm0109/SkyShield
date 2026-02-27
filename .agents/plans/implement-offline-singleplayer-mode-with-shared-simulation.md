# Feature: Implement Offline Singleplayer Mode With Shared Simulation

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement a true offline singleplayer game mode that runs fully in the browser with no socket dependency while preserving gameplay parity with multiplayer rules (spawn cadence, shooting, scoring, heavy last-hit, city HP, timer, and game-over semantics).

This closes a stated MVP gap and reduces rule drift risk by sharing one simulation engine between server authoritative multiplayer and client offline runtime.

## User Story

As a player without reliable internet
I want to launch and complete a full solo match directly in my browser
So that I can still play with consistent rules and feedback when multiplayer is unavailable.

## Problem Statement

The PRD requires offline singleplayer (`PRD.md:12`, `PRD.md:95-97`, `PRD.md:164-170`, `PRD.md:264`, `PRD.md:306-312`) but the current client flow is multiplayer-only (`README.md:83-90`, `apps/client/src/pages/LobbyPage.tsx`), and simulation logic exists only in server space (`apps/server/src/game-loop/simulation.ts:1-287`).

If offline is implemented as separate custom logic in client code, behavior will drift from multiplayer over time (explicitly called out as risk in `PRD.md:390-391`).

## Solution Statement

Create a shared pure simulation module inside `shared/types` and use it from both:

- server match lifecycle (existing Socket.IO authoritative path)
- new client offline runner hook driven by `requestAnimationFrame`

Add a dedicated offline route/page and an entry CTA from lobby. Reuse existing match rendering (`MatchView`) with a transport-agnostic shot callback so offline can render the same HUD/playfield while writing no network events.

## Feature Metadata

**Feature Type**: New Capability  
**Estimated Complexity**: High  
**Primary Systems Affected**: `apps/client`, `apps/server`, `shared/types`, docs/tests  
**Dependencies**: React 19, React Router 7, Socket.IO (multiplayer path unchanged), browser `requestAnimationFrame`

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `PRD.md` (`12`, `95-97`, `164-170`, `264`, `306-312`, `390-391`) - Offline mode is an MVP requirement and parity risk is explicitly documented.
- `README.md:62-90` - Current scope and controls are multiplayer-focused; docs need expansion for offline entry/flow.
- `apps/server/src/game-loop/simulation.ts:10-287` - Current canonical gameplay rules (spawn/move/collision/scoring/HP/leaderboard).
- `apps/server/src/game-loop/matchLifecycle.ts:38-285` - How simulation is consumed by lifecycle orchestration and game-over conditions.
- `apps/server/src/events/shootEvents.ts:12-75` - Existing 400ms reload rule and shoot validation boundary.
- `apps/client/src/game/MatchView.tsx:1-125` - Current renderer and shoot dispatch are socket-coupled.
- `apps/client/src/game/useMatchState.ts:24-91` - Socket subscription pattern and phase state model.
- `apps/client/src/game/types.ts:3-30` - Match/client snapshot contracts reused by UI.
- `apps/client/src/app/useSessionStore.ts:50-164` - Existing app-level state owner and socket lifecycle side effects.
- `apps/client/src/pages/LobbyPage.tsx:5-91` - Lobby control surface where offline entry CTA should be introduced.
- `apps/client/src/app/router.tsx:1-14` - Route map extension point.
- `shared/types/src/models.ts:1-79` - Domain types used by both server/client.
- `shared/types/src/index.ts:1-2` - Export surface to extend for shared simulation API.
- `apps/server/src/events/startGame.integration.spec.ts:25-216` - Integration harness style and time-bound event assertions.
- `apps/server/src/game-loop/simulation.spec.ts:49-148` - Deterministic unit-test style for rule correctness.
- `apps/client/src/game/MatchView.spec.ts:1-19` - Client Vitest style (focused pure helper assertions).

### New Files to Create

- `shared/types/src/simulation.ts` - Shared pure simulation engine and leaderboard helpers (moved from server).
- `shared/types/src/simulation.spec.ts` - Shared engine deterministic unit tests.
- `apps/client/src/offline/useOfflineMatchState.ts` - Local game-loop hook (countdown, tick, shot queue, end states).
- `apps/client/src/pages/OfflinePage.tsx` - Offline gameplay page with match/start/retry UX.
- `apps/client/src/offline/offlineConfig.ts` - Client-local balancing config defaults (mirrors server env defaults).

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [React `useEffect`](https://react.dev/reference/react/useEffect)
  - Specific section: setup/cleanup and StrictMode effect behavior.
  - Why: offline loop and event listeners must avoid duplicate timers.
- [React `useRef`](https://react.dev/reference/react/useRef)
  - Specific section: mutable refs for loop state and timestamps.
  - Why: maintain tick/shoot timestamps without re-render churn.
- [MDN `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
  - Specific section: frame timing callback usage.
  - Why: drive browser-side simulation with monotonic frame deltas.
- [React Router Declarative Routing](https://reactrouter.com/start/modes)
  - Specific section: declarative mode fit for URL-driven app state.
  - Why: add `/offline` path cleanly.
- [React Router `useNavigate`](https://reactrouter.com/api/hooks/useNavigate)
  - Specific section: imperative navigation after CTA actions.
  - Why: lobby CTA and exit behavior.
- [Socket.IO TypeScript](https://socket.io/docs/v4/typescript/)
  - Specific section: typing events does not replace runtime validation.
  - Why: keep multiplayer path unchanged while separating offline flow.
- [Socket.IO Client Options](https://socket.io/docs/v4/client-options/)
  - Specific section: `autoConnect` behavior.
  - Why: prevent accidental socket connection during offline mode.

### Patterns to Follow

**Naming Conventions:**
- Snake_case wire events are fixed (`shared/types/src/events.ts:32-67`).
- React component + hook naming: `PascalCase` component files, `useX` hooks (`apps/client/src/pages/RoomPage.tsx`, `apps/client/src/game/useMatchState.ts`).

**Error Handling:**
- Socket boundary guard + early return + `error_event` (`apps/server/src/events/lobbyEvents.ts:30-34`, `60-64`, `99-103`; `shootEvents.ts:29-56`).
- Client status text updates instead of thrown UI exceptions (`apps/client/src/app/useSessionStore.ts:79`, `98-100`, `122-124`, `135-137`).

**Logging Pattern:**
- Structured JSON logging in server handlers/lifecycle (`apps/server/src/main.ts:35-44`, `61-69`; `matchLifecycle.ts:102-103`, `185`).

**State Ownership Pattern:**
- Single owner for socket listeners in a top-level provider/hook (`apps/client/src/app/useSessionStore.ts:60-94`; `useMatchState.ts:48-80`).
- Cleanup symmetry mandatory in effects.

**Testing Pattern:**
- Server/shared deterministic tests with `node:test` + `assert` (`simulation.spec.ts:1-148`).
- Client utility tests in Vitest (`MatchView.spec.ts:1-19`).

**Anti-patterns to Avoid:**
- Duplicating gameplay formulas in both server and client.
- Running socket connect side effects when user is in offline mode.
- Mixing offline state into room socket state object in ways that leak into `/room/:roomCode` behavior.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Create a shared gameplay engine API and keep server behavior unchanged after migration.

**Tasks:**

- Move pure simulation and leaderboard helpers into `shared/types`.
- Export shared engine from `shared/types/src/index.ts`.
- Update server imports to consume shared engine module.
- Keep integration surface stable (`stepSimulation`, config types, queued shot type).

### Phase 2: Core Implementation

Add offline runtime with same gameplay semantics and no network dependency.

**Tasks:**

- Build `useOfflineMatchState` hook with countdown -> in_game -> game_over phases.
- Implement local shot queue + 400ms reload gate.
- Run simulation per frame using `requestAnimationFrame` with capped `dt` like server (`matchLifecycle.ts:196-200`).
- Derive solo leaderboard/stats from one local player identity.

### Phase 3: Integration

Wire offline route and user flow in existing client navigation/UI.

**Tasks:**

- Add `/offline` route.
- Add Lobby CTA to enter offline mode.
- Introduce transport-agnostic shot callback for `MatchView` so offline can inject local fire handler.
- Ensure room and offline routes remain isolated (no state bleed between flows).

### Phase 4: Testing & Validation

Lock parity and guard against regressions.

**Tasks:**

- Add shared simulation tests in `shared/types`.
- Update server tests to use shared simulation import path.
- Add client tests for offline helpers and state transitions.
- Validate manual behavior for offline start, full match completion, retry, and navigation transitions.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE `shared/types/src/index.ts`

- **IMPLEMENT**: Extend exports to include new simulation module.
- **PATTERN**: Flat export barrel style in `shared/types/src/index.ts:1-2`.
- **IMPORTS**: `./simulation.js`.
- **GOTCHA**: Keep existing `events`/`models` exports untouched.
- **VALIDATE**: `npm.cmd run build --workspace shared/types`

### CREATE `shared/types/src/simulation.ts`

- **IMPLEMENT**: Move pure gameplay logic from `apps/server/src/game-loop/simulation.ts` into shared package with identical behavior and signatures.
- **PATTERN**: Preserve deterministic ordering and delta accounting from `simulation.ts:130-260` and leaderboard tiebreak from `262-287`.
- **IMPORTS**: types from `./models.js` only.
- **GOTCHA**: Keep it runtime-agnostic (no `node:*` imports, no socket references).
- **VALIDATE**: `npm.cmd run typecheck --workspace shared/types`

### CREATE `shared/types/src/simulation.spec.ts`

- **IMPLEMENT**: Port deterministic tests now living at `apps/server/src/game-loop/simulation.spec.ts:49-148` into shared test suite.
- **PATTERN**: `node:test` + `assert` fixtures.
- **IMPORTS**: `stepSimulation`, `buildLeaderboard` from shared module.
- **GOTCHA**: Keep timestamps deterministic and avoid wall-clock dependence.
- **VALIDATE**: `npm.cmd run test --workspace shared/types`

### UPDATE `shared/types/src/run-tests.ts`

- **IMPLEMENT**: Include new shared simulation spec in test runner entrypoint.
- **PATTERN**: Existing explicit import pattern in `shared/types/src/run-tests.ts`.
- **IMPORTS**: `./simulation.spec.js`.
- **GOTCHA**: Preserve current output behavior for CI.
- **VALIDATE**: `npm.cmd run test --workspace shared/types`

### UPDATE `apps/server/src/game-loop/simulation.ts`

- **REFACTOR**: Replace implementation with re-export wrapper (or remove internal logic and update imports globally) so server uses shared source of truth.
- **PATTERN**: Keep consumer interface used by `matchLifecycle.ts:11,204,222`.
- **IMPORTS**: from `@skyshield/shared-types`.
- **GOTCHA**: Avoid accidental type widening that breaks `MatchLifecycleManager` compile.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/server`

### UPDATE `apps/server/src/game-loop/simulation.spec.ts`

- **UPDATE**: Point tests at shared simulation module or reduce to server-integration smoke if duplication remains.
- **PATTERN**: Existing deterministic cases in `apps/server/src/game-loop/simulation.spec.ts:49-148`.
- **IMPORTS**: shared module paths.
- **GOTCHA**: Do not keep two diverging canonical simulation tests long-term.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### CREATE `apps/client/src/offline/offlineConfig.ts`

- **CREATE**: Offline simulation config object mirroring server defaults from `apps/server/src/config/env.ts:1-19`.
- **PATTERN**: Keep numeric constants explicit and stable.
- **IMPORTS**: `SimulationConfig` type from shared module.
- **GOTCHA**: Keep values parity-locked with server defaults; document drift risk.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/client`

### CREATE `apps/client/src/offline/useOfflineMatchState.ts`

- **IMPLEMENT**: Hook managing offline lifecycle states with local countdown, RAF tick loop, shot queue, score/stats, and game-over.
- **PATTERN**: phase model from `apps/client/src/game/useMatchState.ts:25-67`; dt clamp from server `matchLifecycle.ts:196-200`.
- **IMPORTS**: shared `stepSimulation`, `buildLeaderboard`, match types, `offlineConfig`.
- **GOTCHA**: ensure effect cleanup cancels RAF and timeouts on unmount/route change.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/game/MatchView.tsx`

- **REFACTOR**: Accept optional `onShoot` callback and optional `shootCooldownMs` so offline mode can inject local shot handling while multiplayer remains socket-driven.
- **PATTERN**: Existing `fireShot` clamp/throttle semantics in `MatchView.tsx:30-41`.
- **IMPORTS**: no new runtime deps required.
- **GOTCHA**: preserve existing behavior when callback is not provided.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/game/MatchView.spec.ts`

- **ADD**: Tests for new pure helpers introduced for pluggable shooting behavior (if extracted), while preserving coordinate tests.
- **PATTERN**: focused deterministic Vitest tests (`MatchView.spec.ts:5-19`).
- **IMPORTS**: helper exports only.
- **GOTCHA**: avoid brittle DOM snapshot tests.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### CREATE `apps/client/src/pages/OfflinePage.tsx`

- **IMPLEMENT**: Offline route page rendering profile summary, local status, `MatchView`, and restart/back actions.
- **PATTERN**: page composition from `RoomPage.tsx:28-84` and card/layout classes in `page-layout.css:1-113`.
- **IMPORTS**: `useNavigate`, `MatchView`, `useOfflineMatchState`, `useSessionStore` (profile reuse only).
- **GOTCHA**: do not call `getSocket().emit` in offline path.
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### UPDATE `apps/client/src/app/router.tsx`

- **ADD**: route mapping for `/offline`.
- **PATTERN**: declarative routes in `router.tsx:8-12`.
- **IMPORTS**: `OfflinePage`.
- **GOTCHA**: keep existing `/room/:roomCode` and fallback semantics unchanged.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/client`

### UPDATE `apps/client/src/pages/LobbyPage.tsx`

- **ADD**: “Singleplayer (Offline)” CTA and navigation action.
- **PATTERN**: existing navigation effect style in `LobbyPage.tsx:21-26` and button row structure `58-66`.
- **IMPORTS**: `useNavigate` already present.
- **GOTCHA**: CTA must not trigger socket room actions.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/app/useSessionStore.ts`

- **UPDATE**: Add explicit helper to leave online room state when entering offline mode (clear active room/lobby/match status) without disconnecting global socket unless intentional.
- **PATTERN**: `clearSessionRoom` and reset logic in `useSessionStore.ts:39-45`, `142-145`.
- **IMPORTS**: existing only.
- **GOTCHA**: avoid breaking room rejoin flow after returning from offline page.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/client`

### UPDATE `apps/client/src/styles.css` and `apps/client/src/pages/page-layout.css`

- **ADD**: Offline page-specific classes and responsive layout adjustments.
- **PATTERN**: tokenized styling approach (`styles.css:4-25`) and page layout blocks (`page-layout.css:16-113`).
- **IMPORTS**: reuse existing token system; no new framework.
- **GOTCHA**: preserve playfield pointer interaction hit area and mobile breakpoints.
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### UPDATE `README.md`

- **UPDATE**: Document offline mode entry path, behavior, and current constraints.
- **PATTERN**: concise command-oriented sections (`README.md:37-50`, `81-90`, `92-104`).
- **IMPORTS**: none.
- **GOTCHA**: describe only implemented behavior; do not claim multiplayer socket behavior in offline mode.
- **VALIDATE**: `Get-Content README.md`

---

## TESTING STRATEGY

### Unit Tests

- `shared/types`: deterministic simulation tests (spawn cadence, collision, heavy last-hit scoring, city HP, leaderboard ordering).
- `apps/client`: offline hook helper tests (phase transitions, timer decrement, shot throttle, end conditions) and any extracted MatchView pure helpers.

### Integration Tests

- Server integration suites (`startGame.integration`, `shootEvents.integration`) must still pass unchanged to prove multiplayer parity was not regressed by extraction.
- Optional client-level integration: minimal hook-driven offline session progression test (if test complexity remains deterministic).

### Edge Cases

- Offline start with no network (`navigator.onLine === false` and true both should work).
- Route transition `/offline` -> `/room/:code` without stale state.
- Rapid tap spam should still respect 400ms reload.
- City HP reaches 0 before timer -> lose (`city_destroyed`).
- Timer reaches 0 with HP > 0 -> win (`timer_complete`).
- Retry after game-over fully resets counters/IDs/leaderboard.
- Tab backgrounding and large frame delta spikes (clamped dt to avoid simulation jumps).

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

### Level 4: Type + Build

- `npm.cmd run typecheck --workspace shared/types`
- `npm.cmd run typecheck --workspace apps/server`
- `npm.cmd run typecheck --workspace apps/client`
- `npm.cmd run build --workspace shared/types`
- `npm.cmd run build --workspace apps/server`
- `npm.cmd run build --workspace apps/client`

### Level 5: Workspace Regression

- `npm.cmd run test`
- `npm.cmd run build`

### Level 6: Manual Validation

1. Run app stack: `npm.cmd run dev`.
2. Open `http://localhost:4200/` and verify Lobby shows new `Singleplayer (Offline)` CTA.
3. Enter offline mode from lobby and verify no room code is required.
4. Start offline match and confirm countdown -> live gameplay -> game-over path.
5. Verify shooting and score increments reflect same rules as multiplayer.
6. Verify retry restarts a fresh 10-minute match.
7. Navigate back to lobby and create/join room; confirm multiplayer still behaves normally.
8. Validate mobile viewports (`390x844`, `360x640`) for playfield controls and readability.

### Level 7: Additional Validation (Optional)

- `npx.cmd nx run client:test`
- `npx.cmd nx run server:test:integration`

---

## ACCEPTANCE CRITERIA

- [ ] Offline singleplayer route exists and is reachable from lobby.
- [ ] Offline mode requires no socket event emissions for gameplay.
- [ ] Gameplay rules in offline mode match server simulation outcomes.
- [ ] Multiplayer mode remains fully functional and unchanged behaviorally.
- [ ] Shared simulation module is the single gameplay rules source.
- [ ] Lint, tests, typecheck, and builds pass for affected packages.
- [ ] README documents offline flow accurately.
- [ ] Mobile layout remains usable for lobby + offline gameplay screens.

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

- `CLAUDE.md` is not present in this repository root, so follow existing repo conventions from current code.
- Existing Hebrew `messageHe` appears mojibake in terminal output; keep file encoding consistent and avoid accidental re-encoding.
- Root `npm.cmd run test` currently excludes client tests (`package.json:14-15`), so run client test/typecheck/build explicitly.
- If sandboxed runs hit `spawn EPERM` (already documented in `IMPLEMENTED_SO_FAR.md`), rerun validations with approved unsandboxed command prefixes.

**Confidence Score**: 9/10 for one-pass implementation success.
