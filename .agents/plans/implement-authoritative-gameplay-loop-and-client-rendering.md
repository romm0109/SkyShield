# Feature: Implement Server Authoritative Gameplay Loop And Client Match Renderer

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement the first fully playable multiplayer match slice: server-side meteor simulation, shooting and collision resolution, score/accuracy tracking, city HP loss, and loss condition handling (`city_destroyed`) with synchronized client rendering of live match state.

This feature extends the already-working room/lobby/start_game lifecycle into actual gameplay while preserving server authority and current Socket.IO contract style.

## User Story

As a player in a room
I want to shoot meteors in a synchronized match with live scoreboard and city HP
So that I can play a complete meaningful game session instead of only joining a lobby/countdown

## Problem Statement

The codebase currently supports room create/join and server timer lifecycle, but gameplay state is effectively static (`meteors`, `projectiles`, and leaderboard are placeholders). `shoot` exists in types but is not handled, there is no simulation, and the client has no in-game rendering/controls. This blocks MVP core value and prevents meaningful match outcomes before timer completion.

## Solution Statement

Add a deterministic room-scoped simulation pipeline in the server tick loop and wire client gameplay UI to authoritative `game_state` events:

- Process validated `shoot` inputs per room.
- Spawn/update meteors and projectiles each tick.
- Resolve collisions and scoring (including heavy meteor last-hit behavior).
- Apply city HP damage when meteors reach ground; emit `game_over` with `reason: "city_destroyed"` at HP=0.
- Track per-player shots/hits and return real final accuracy.
- Render real-time match state on client (playfield + HUD), while keeping server as source of truth.

## Feature Metadata

**Feature Type**: New Capability  
**Estimated Complexity**: High  
**Primary Systems Affected**: `apps/server`, `apps/client`, `shared/types`  
**Dependencies**: `socket.io`, `socket.io-client`, React, existing Nx workspace tooling

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `apps/server/src/game-loop/matchLifecycle.ts` (lines 35-188) - Existing countdown/timer loop orchestration and room-scoped `game_state` emission pattern to extend.
- `apps/server/src/events/lobbyEvents.ts` (lines 24-135) - Socket handler style (payload guard + early-return + `error_event`) and host/phase checks.
- `apps/server/src/rooms/roomStore.ts` (lines 43-170) - In-memory room state container and mutation helpers to evolve.
- `shared/types/src/events.ts` (lines 32-72, 82-122) - Event contracts and payload guard patterns.
- `shared/types/src/models.ts` (lines 17-54) - Shared runtime model primitives currently too minimal for gameplay behavior.
- `apps/client/src/app/App.tsx` (lines 15-111) - Current UI shell and socket event subscription pattern.
- `apps/client/src/net/socket.ts` (lines 1-27) - Typed singleton socket usage pattern.
- `apps/server/src/events/startGame.integration.spec.ts` (lines 11-199) - Integration test style for event sequencing and timeouts.
- `apps/server/src/game-loop/matchLifecycle.spec.ts` - Deterministic timer unit-testing approach with fake timers.
- `README.md` (MVP scope + limitations) - Must be updated after gameplay slice lands.

### New Files to Create

- `apps/server/src/game-loop/simulation.ts` - Core simulation step for meteors/projectiles/collisions/score/HP.
- `apps/server/src/game-loop/simulation.spec.ts` - Unit tests for deterministic gameplay rules.
- `apps/server/src/events/shootEvents.ts` - `shoot` handler registration and input validation/rate-limit checks.
- `apps/server/src/events/shootEvents.integration.spec.ts` - Integration coverage for accepted/rejected shot behavior.
- `apps/client/src/game/types.ts` - Client rendering view-model types derived from shared contracts.
- `apps/client/src/game/MatchView.tsx` - In-match renderer (HUD + playfield).
- `apps/client/src/game/useMatchState.ts` - Socket subscription and local derived state for active match.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Socket.IO Rooms](https://socket.io/docs/v4/rooms/)
  - Specific section: room broadcasting semantics
  - Why: gameplay events must remain room-scoped and isolated.
- [Socket.IO Delivery Guarantees](https://socket.io/docs/v4/delivery-guarantees/)
  - Specific section: at-most-once and ordering caveats
  - Why: informs client reconciliation assumptions.
- [Socket.IO TypeScript](https://socket.io/docs/v4/typescript/)
  - Specific section: typed events and runtime validation caveat
  - Why: keep strong typing while still validating payloads.
- [Node.js Timers](https://nodejs.org/api/timers.html)
  - Specific section: interval timing precision notes
  - Why: simulation step should use measured dt, not blind tick count.
- [Node.js perf_hooks](https://nodejs.org/api/perf_hooks.html)
  - Specific section: `performance.now()`
  - Why: monotonic elapsed-time calculations.
- [React `useEffect` Reference](https://react.dev/reference/react/useEffect)
  - Specific section: subscription cleanup
  - Why: avoid duplicate socket listeners in gameplay UI.
- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
  - Specific section: 2D context basics
  - Why: lightweight match rendering option before Phaser integration.

### Patterns to Follow

**Naming Conventions:**
- Socket events are snake_case (`start_game`, `game_state`) - see `shared/types/src/events.ts:32-72`.
- TS files use lower camel file names in server domains (`roomStore.ts`, `matchLifecycle.ts`).
- Strongly typed interfaces and explicit unions in shared contracts.

**Error Handling:**
- Validate at socket boundary and emit `error_event` with stable `code` + `messageHe`.
- Early-return guard style from `apps/server/src/events/lobbyEvents.ts:30-34`, `60-64`, `99-103`.

**Logging Pattern:**
- Structured JSON logs via `console.log(JSON.stringify({...}))`.
- Pattern examples in `apps/server/src/events/lobbyEvents.ts:49-51, 83, 92, 133` and `matchLifecycle.ts:76, 96, 139`.

**State and Mutation Pattern:**
- Mutate room through `RoomStore` methods and keep behavior centralized (`apps/server/src/rooms/roomStore.ts:146-164`).
- Room-scoped lifecycle manager owns intervals/timeouts (`matchLifecycle.ts:80-103`).

**Testing Pattern:**
- Unit: `node:test` + `assert` with deterministic fake timers (`matchLifecycle.spec.ts`).
- Integration: in-process Socket.IO server + client sockets + `onceWithTimeout` helper (`startGame.integration.spec.ts:11-23`).

**Anti-patterns to Avoid:**
- Do not trust client collision/scoring decisions.
- Do not emit global events outside room scope.
- Do not mix gameplay mutation logic directly inside socket handlers.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Define complete gameplay contracts and runtime state so simulation can be authoritative and testable.

**Tasks:**

- Extend shared models for meteor/projectile/player stats and game constants.
- Extend/clarify socket payload contracts for `shoot` and server emissions.
- Add env config values required for simulation balancing defaults.

### Phase 2: Core Implementation

Build deterministic simulation and integrate it with current lifecycle tick.

**Tasks:**

- Implement room-scoped shot input queue.
- Implement spawn/update/collision/damage/score pipeline.
- Wire simulation into `MatchLifecycleManager.tick()` with monotonic dt.
- Emit `hit_confirmed`, live leaderboard, and `game_over` on HP depletion.

### Phase 3: Integration

Connect gameplay networking with client rendering and controls.

**Tasks:**

- Register `shoot` handler in server composition path.
- Update client app state machine (lobby/countdown/in_game/game_over view modes).
- Render match HUD + playfield based on authoritative `game_state`.
- Emit `shoot` from client tap/click interaction with local throttling aligned to reload.

### Phase 4: Testing & Validation

Add deterministic rule tests plus socket integration tests for full path.

**Tasks:**

- Unit tests for simulation rule correctness and edge behavior.
- Integration tests for `shoot` validation, scoring, city destruction flow.
- Manual two-client validation across full match lifecycle.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE `shared/types/src/models.ts`

- **IMPLEMENT**: Expand `MeteorState` and `ProjectileState` with fields required for deterministic simulation (e.g., `type`, `radius`, `speed`, `ownerId`, `createdAtMs`) and add player stat model (shots/hits/accuracy inputs).
- **PATTERN**: Existing interface-first style in `shared/types/src/models.ts:17-54`.
- **IMPORTS**: Keep local and primitive-only; avoid server-only dependencies.
- **GOTCHA**: Preserve backward compatibility for existing `game_state` shape where practical.
- **VALIDATE**: `npm.cmd run build --workspace shared/types`

### UPDATE `shared/types/src/events.ts`

- **IMPLEMENT**: Tighten `ShootPayload` runtime guard (numeric bounds, room code format), add/adjust emitted payloads for score-relevant gameplay if needed.
- **PATTERN**: Guard style from `isJoinRoomPayload` and `isStartGamePayload` (`shared/types/src/events.ts:99-122`).
- **IMPORTS**: Reuse shared regex patterns and typed payload interfaces.
- **GOTCHA**: Keep snake_case event names and avoid introducing client-authoritative fields.
- **VALIDATE**: `npm.cmd run test --workspace shared/types`

### UPDATE `shared/types/src/events.spec.ts`

- **IMPLEMENT**: Add pass/fail tests for `shoot` payload validation (invalid coordinates, missing timestamp, malformed room code).
- **PATTERN**: Existing assert-based guard tests in `shared/types/src/run-tests.ts` and `events.spec.ts`.
- **IMPORTS**: New guard exports from `events.ts`.
- **GOTCHA**: Keep tests deterministic and non-networked.
- **VALIDATE**: `npm.cmd run test --workspace shared/types`

### UPDATE `apps/server/src/config/env.ts`

- **IMPLEMENT**: Add simulation-related env defaults and parsing (spawn cadence, projectile speed, meteor speed range, hit radii).
- **PATTERN**: `parsePositiveInt` and default object style in `apps/server/src/config/env.ts`.
- **IMPORTS**: No external libs; keep startup-time validation.
- **GOTCHA**: Reject invalid values early to avoid runtime NaN behavior.
- **VALIDATE**: `npm.cmd run build --workspace apps/server`

### CREATE `apps/server/src/game-loop/simulation.ts`

- **IMPLEMENT**: Pure `stepSimulation(room, dtMs, nowMs, queuedShots, config)` function returning next match patch + emitted domain events.
- **PATTERN**: Keep orchestration in lifecycle manager (`matchLifecycle.ts:142-187`), keep simulation logic isolated.
- **IMPORTS**: Shared model types + minimal helpers.
- **GOTCHA**: Use dt-based movement and deterministic ordering to avoid host-dependent outcomes.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/server`

### CREATE `apps/server/src/game-loop/simulation.spec.ts`

- **IMPLEMENT**: Unit tests for spawn progression, projectile/meteor collisions, heavy meteor 2-hit + last-hit scoring, HP decrement on ground hit.
- **PATTERN**: `node:test` + strict assertions, deterministic fixture states.
- **IMPORTS**: Simulation step function and shared types.
- **GOTCHA**: Do not depend on wall-clock time; inject deterministic time.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### CREATE `apps/server/src/events/shootEvents.ts`

- **IMPLEMENT**: Register `shoot` handler that validates payload, verifies socket is in room and phase is `in_game`, then appends to room input queue.
- **PATTERN**: Early-return + `error_event` from `lobbyEvents.ts:12-14`, `99-135`.
- **IMPORTS**: `isShootPayload` (or equivalent), `RoomStore`, queue API from lifecycle/simulation module.
- **GOTCHA**: Include per-socket fire-rate throttle (`400ms`) to limit spam and enforce MVP reload rule.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### UPDATE `apps/server/src/game-loop/matchLifecycle.ts`

- **IMPLEMENT**: Integrate simulation step into `tick()`, maintain per-room input queues, update leaderboard every tick, emit `hit_confirmed`, and emit `game_over` on `cityHp <= 0` with `reason: "city_destroyed"`.
- **PATTERN**: Existing room-loop ownership and teardown behavior (`matchLifecycle.ts:80-103`, `142-171`).
- **IMPORTS**: new `simulation.ts` and optional helper types.
- **GOTCHA**: Ensure timeout win path and city-destroyed loss path are mutually exclusive.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### UPDATE `apps/server/src/main.ts`

- **IMPLEMENT**: Register new shoot event wiring alongside lobby events and preserve disconnect cleanup semantics.
- **PATTERN**: Composition-root style in `apps/server/src/main.ts`.
- **IMPORTS**: `registerShootEvents` module and updated lifecycle API.
- **GOTCHA**: Do not leak intervals/queues when room empties.
- **VALIDATE**: `npm.cmd run build --workspace apps/server`

### CREATE `apps/server/src/events/shootEvents.integration.spec.ts`

- **IMPLEMENT**: Integration scenarios for invalid shoot payload, shoot while not in-game, valid shoot leading to `hit_confirmed`/score update.
- **PATTERN**: Harness from `startGame.integration.spec.ts:25-199`.
- **IMPORTS**: socket server/client typed setup helpers.
- **GOTCHA**: Keep timeouts explicit and small; avoid flaky sleeps.
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

### UPDATE `apps/server/src/events/startGame.integration.spec.ts`

- **IMPLEMENT**: Extend to assert city-destroyed loss flow (forced short HP test configuration), and real final accuracy values in `game_over` payload.
- **PATTERN**: Existing event sequencing assertions in lines `135-194`.
- **IMPORTS**: none beyond existing harness.
- **GOTCHA**: Avoid overlap between timer-complete and city-destroyed assertions in same test case.
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

### UPDATE `apps/server/src/run-integration-tests.ts`

- **IMPLEMENT**: Ensure new integration suite entrypoint is included in test runner.
- **PATTERN**: Existing explicit import/runner style in this file.
- **IMPORTS**: new `shootEvents.integration.spec` import.
- **GOTCHA**: Preserve current CI invocation contract.
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

### CREATE `apps/client/src/game/useMatchState.ts`

- **IMPLEMENT**: Encapsulate socket subscriptions for `game_countdown`, `game_state`, `hit_confirmed`, `game_over`, exposing a normalized client match state.
- **PATTERN**: Subscription cleanup style from `apps/client/src/app/App.tsx:23-46`.
- **IMPORTS**: `getSocket()` and shared types.
- **GOTCHA**: Ensure listeners are registered once and always removed on unmount.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/client`

### CREATE `apps/client/src/game/MatchView.tsx`

- **IMPLEMENT**: Add match HUD (timer, HP bar, score/leaderboard) and playfield renderer; capture pointer events and emit `shoot` with `targetX/targetY/clientTs`.
- **PATTERN**: Keep existing React function component style in `App.tsx`.
- **IMPORTS**: `useMatchState`, `getSocket`, shared types.
- **GOTCHA**: UI should read authoritative state only; local prediction visuals can be optional and clearly non-authoritative.
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### UPDATE `apps/client/src/app/App.tsx`

- **IMPLEMENT**: Add UI mode switching between lobby and in-game, mount `MatchView` during active match, keep profile persistence and room controls.
- **PATTERN**: Existing localStorage and socket status patterns (`App.tsx:5-79`).
- **IMPORTS**: `MatchView`, gameplay hooks.
- **GOTCHA**: Avoid regressing room create/join flow while introducing new state machine.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `README.md`

- **IMPLEMENT**: Document gameplay slice status, controls, known limitations, and any new env vars.
- **PATTERN**: Existing concise command-oriented style in root README.
- **IMPORTS**: N/A.
- **GOTCHA**: Keep PRD-aligned statements (do not claim offline mode done if not included in this slice).
- **VALIDATE**: `Get-Content README.md`

---

## TESTING STRATEGY

### Unit Tests

- `shared/types`: payload guards for `shoot` and any updated event contracts.
- `apps/server/game-loop/simulation`: deterministic rule tests for spawn, movement, collisions, scoring, HP logic, and leaderboard ranking.
- `apps/server/game-loop/matchLifecycle`: validate new loss path and no-timer-leak behavior.

### Integration Tests

- Full room flow: `create_room -> join_room -> start_game -> shoot -> hit_confirmed/game_state -> game_over`.
- Authorization and phase checks for shoot events.
- Game-over semantics:
  - `timer_complete` when HP > 0 at timeout.
  - `city_destroyed` when HP reaches 0 before timeout.

### Edge Cases

- Repeated rapid `shoot` packets (reload throttling).
- Shoot from socket not in room.
- Shoot in wrong phase (`lobby`/`countdown`/`game_over`).
- Host disconnect mid-match with remaining players.
- Empty-room cleanup while simulation loop active.
- Simultaneous hits on heavy meteor in same tick (last-hit scoring determinism).

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and feature correctness.

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

### Level 4: Type + Build Validation

- `npm.cmd run typecheck --workspace shared/types`
- `npm.cmd run typecheck --workspace apps/server`
- `npm.cmd run typecheck --workspace apps/client`
- `npm.cmd run build --workspace shared/types`
- `npm.cmd run build --workspace apps/server`
- `npm.cmd run build --workspace apps/client`

### Level 5: Workspace-Level Validation

- `npm.cmd run test`
- `npm.cmd run build`

### Level 6: Manual Validation

1. Run stack: `npm.cmd run dev`.
2. Open two clients at `http://localhost:4200`.
3. Host creates room; guest joins.
4. Host starts game; both clients observe synchronized countdown.
5. Both players shoot meteors; verify live score + HP updates in both clients.
6. Force city loss scenario (low HP test config) and verify `game_over.reason = city_destroyed`.
7. Run normal-duration scenario and verify `timer_complete` path still works.
8. Disconnect one player mid-match and verify server remains stable.

---

## ACCEPTANCE CRITERIA

- [ ] Server processes `shoot` during `in_game` with validation and reload throttling.
- [ ] Meteors spawn/move and projectiles move each tick from server authority.
- [ ] Collisions produce deterministic `hit_confirmed` and score updates.
- [ ] City HP decreases on meteor ground impact and triggers `game_over` (`city_destroyed`) at zero.
- [ ] Existing timeout win path (`timer_complete`) still functions.
- [ ] `game_over.finalLeaderboard` includes real score/accuracy values.
- [ ] Client renders live match HUD/playfield from authoritative state.
- [ ] All listed validation commands pass with no regressions.

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

- Keep this slice focused on multiplayer authoritative gameplay and client rendering.
- Offline singleplayer parity should be a follow-up feature that reuses the stabilized simulation module.
- Current PRD references Phaser for long-term rendering; this plan intentionally keeps rendering minimal and compatible with later Phaser migration.
- Existing Hebrew `messageHe` strings display as mojibake in some terminal outputs; verify file encoding when editing.

**Confidence Score**: 8/10 for one-pass implementation success.
