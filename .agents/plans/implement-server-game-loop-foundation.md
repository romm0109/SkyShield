# Feature: Server Authoritative Match Lifecycle (start_game + countdown + timer tick)

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement the first gameplay runtime milestone on the backend: transition rooms from lobby into a server-driven match lifecycle with host-only start, pre-game countdown, authoritative match timer, periodic game_state emission, and deterministic game-over-on-timeout behavior.

This preserves the current architecture (Socket.IO + in-memory RoomStore + shared event contracts) while creating the backbone needed for meteors, shooting, scoring, and offline parity later.

## User Story

As a room host
I want to start a match that runs on an authoritative server timer
So that all players see synchronized countdown and game progression, and matches end reliably without client clock drift.

## Problem Statement

Current code supports room creation/joining and lobby synchronization, but there is no implemented `start_game` behavior, no room phase model, and no authoritative match loop. The absence of lifecycle state causes ambiguity for event acceptance/rejection and blocks gameplay features that rely on a canonical room state.

## Solution Statement

Add an explicit server-side match lifecycle layer:

- Extend room/domain types with lifecycle phase + runtime match snapshot.
- Introduce a dedicated game-loop manager that owns timers/intervals per room.
- Keep socket handlers thin: validate input, authorize host action, delegate lifecycle transitions.
- Emit `game_countdown`, `game_state`, and `game_over` from server clock.
- Cover lifecycle behavior with unit + integration tests aligned with existing Node test patterns.

## Feature Metadata

**Feature Type**: New Capability
**Estimated Complexity**: Medium
**Primary Systems Affected**: `apps/server`, `shared/types`
**Dependencies**: `socket.io@^4.8.1`, Node timers, `node:test`, existing in-memory `RoomStore`

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `apps/server/src/events/lobbyEvents.ts` (lines 23-96) - Existing event registration/validation/emission style and error_event pattern.
- `apps/server/src/rooms/roomStore.ts` (lines 22-120) - In-memory room model and mutation API to extend with phase/runtime state.
- `apps/server/src/main.ts` (lines 8-46) - Composition root for env, RoomStore, socket lifecycle, disconnect behavior.
- `apps/server/src/config/env.ts` (lines 1-57) - Existing runtime config source for timer values and numeric parsing.
- `shared/types/src/events.ts` (lines 12-113) - Event payload interfaces + runtime guards pattern.
- `shared/types/src/models.ts` (lines 1-35) - Core room/player model surface to evolve.
- `apps/server/src/events/lobbyEvents.integration.spec.ts` (lines 31-100) - Integration test harness pattern using ephemeral HTTP+Socket.IO server.
- `apps/server/src/rooms/roomStore.spec.ts` (lines 5-53) - RoomStore unit test style and assertions.
- `shared/types/src/events.spec.ts` (lines 5-35) - Guard testing pattern for payload validators.
- `README.md` (lines 62-78) - Locked conventions: snake_case events + current MVP scope/limitations.
- `package.json` (lines 10-15) - Workspace validation command entrypoints.

### New Files to Create

- `apps/server/src/game-loop/matchLifecycle.ts` - Lifecycle orchestration (countdown, tick scheduling, timeout game-over).
- `apps/server/src/game-loop/matchLifecycle.spec.ts` - Unit tests for phase transitions and timer computations.
- `apps/server/src/events/startGame.integration.spec.ts` - Integration tests for host authorization and emitted lifecycle events.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Socket.IO TypeScript](https://socket.io/docs/v4/typescript/)
  - Specific section: typed `Server<ClientToServerEvents, ...>` generics + runtime validation caveat.
  - Why: Project already uses typed Socket.IO; new lifecycle events must preserve this pattern.

- [Socket.IO Server API](https://socket.io/docs/v4/server-api/)
  - Specific sections: `io.to(...).emit(...)`, `socket.join(...)`, room broadcast semantics.
  - Why: Lifecycle events are room-scoped broadcasts and must use existing room membership mechanics.

- [Socket.IO Delivery Guarantees](https://socket.io/docs/v4/delivery-guarantees)
  - Specific sections: message ordering + default at-most-once delivery.
  - Why: Plan must account for missed events/reconnect limitations in MVP (no persistence).

- [Socket.IO Testing](https://socket.io/docs/v4/testing/)
  - Specific sections: integration testing patterns with in-process server + client sockets.
  - Why: Mirrors existing test strategy in this repo for event workflows.

- [Node.js Timers API](https://nodejs.org/api/timers.html)
  - Specific section: callback timing is approximate, not exact.
  - Why: Match timer should be computed from elapsed server clock, not by counting interval iterations.

- [Node.js perf_hooks](https://nodejs.org/api/perf_hooks.html)
  - Specific section: `performance.now()` high-resolution monotonic timing.
  - Why: Stable elapsed-time measurement for countdown/tick calculations.

- [Node.js Test Runner](https://nodejs.org/api/test.html)
  - Specific section: stable `node:test` API.
  - Why: Repository already uses `describe/it` from `node:test`.

### Patterns to Follow

**Naming Conventions:**

- Socket events in snake_case (README.md lines 77-78).
- Types/interfaces in PascalCase (`shared/types/src/events.ts`, `models.ts`).
- File/module names in lower camel within directories (`roomStore.ts`, `lobbyEvents.ts`).

**Error Handling:**

- Invalid payloads return early and emit `error_event` with code + `messageHe`.
- Pattern reference:
  - `apps/server/src/events/lobbyEvents.ts` lines 28-32, 58-62, 75-83.

**Logging Pattern:**

- Structured JSON logs via `console.log(JSON.stringify({...}))`.
- Pattern reference:
  - `apps/server/src/main.ts` lines 29, 34-36, 49-55.
  - `apps/server/src/events/lobbyEvents.ts` lines 47-49, 81, 90.

**State Container Pattern:**

- In-memory `Map` keyed by room code in `RoomStore`.
- Mutating methods return room snapshot or error object union.
- Pattern reference:
  - `apps/server/src/rooms/roomStore.ts` lines 23-24, 53-75, 104-115.

**Testing Pattern:**

- Integration tests spin up ephemeral HTTP server and Socket.IO server.
- Use Promise wrappers with explicit timeouts for event waits.
- Pattern reference:
  - `apps/server/src/events/lobbyEvents.integration.spec.ts` lines 31-66, 90-99.

**Anti-patterns to Avoid:**

- Do not run lifecycle timing logic directly inside socket handler callbacks.
- Do not derive remaining time by decrementing mutable counters per tick only (drift risk).
- Do not trust TypeScript event types as runtime validation substitute (Socket.IO docs caution).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Define explicit lifecycle and runtime state in shared contracts and room store.

**Tasks:**

- Add room lifecycle enums/types and runtime match snapshot interfaces.
- Extend `RoomState` to include `phase` and `match` data.
- Add guard for `start_game` payload validation in shared types.
- Update RoomStore creation/join behavior to initialize and preserve lifecycle defaults.

### Phase 2: Core Implementation

Introduce authoritative match lifecycle manager and wire host-only start flow.

**Tasks:**

- Implement `matchLifecycle` module responsible for countdown, tick loop, and teardown.
- Compute elapsed time from monotonic source (`performance.now()`), then derive remaining seconds.
- Emit room-scoped `game_countdown` and `game_state` packets.
- Emit `game_over` with `result: "win"` + `reason: "timer_complete"` at timeout.

### Phase 3: Integration

Connect lifecycle manager to event registration and disconnect handling.

**Tasks:**

- Extend lobby event registration to handle `start_game`.
- Enforce authorization (host-only) and phase precondition (`lobby` only).
- Ensure disconnect path does not leak timers; stop lifecycle when room removed.
- Keep existing lobby-state emission semantics intact.

### Phase 4: Testing & Validation

Add targeted unit/integration coverage and run workspace validations.

**Tasks:**

- Add lifecycle unit tests for transitions and timer math.
- Add integration tests for host-only start and event emission sequence.
- Extend payload guard tests for `start_game` validator.
- Run lint/typecheck/tests at package and workspace levels.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE `shared/types/src/models.ts`

- **IMPLEMENT**: Add lifecycle primitives (`RoomPhase`) and minimal `MatchRuntimeState` (countdown/timer/HP + placeholder arrays for meteors/projectiles + leaderboard snapshot).
- **PATTERN**: Keep interface-first typed model style from `shared/types/src/models.ts:3-35`.
- **IMPORTS**: Reuse existing `MeteorState`/`ProjectileState` types.
- **GOTCHA**: Avoid introducing server-only implementation details that should not leak into shared contract surface.
- **VALIDATE**: `npm.cmd run build --workspace shared/types`

### UPDATE `shared/types/src/events.ts`

- **IMPLEMENT**: Add `isStartGamePayload(value)` guard mirroring existing create/join guard style.
- **PATTERN**: Guard signature/flow from `isCreateRoomPayload` and `isJoinRoomPayload` (`shared/types/src/events.ts:85-113`).
- **IMPORTS**: Keep guard exports via existing module file.
- **GOTCHA**: Preserve snake_case event names and payload compatibility for existing events.
- **VALIDATE**: `npm.cmd run test --workspace shared/types`

### UPDATE `shared/types/src/events.spec.ts`

- **IMPLEMENT**: Add pass/fail tests for `isStartGamePayload` including lowercase/invalid room code and empty payload cases.
- **PATTERN**: Assertion style from `shared/types/src/events.spec.ts:5-35`.
- **IMPORTS**: Include new guard import.
- **GOTCHA**: Keep tests deterministic, no timing/network.
- **VALIDATE**: `npm.cmd run test --workspace shared/types`

### UPDATE `apps/server/src/rooms/roomStore.ts`

- **IMPLEMENT**: Extend room creation defaults (`phase: "lobby"`, initial match runtime scaffold), add explicit room mutation helpers:
  - `setRoomPhase(roomCode, phase)`
  - `updateMatchState(roomCode, patchFn)` or equivalent typed updater
  - `isHost(roomCode, socketId)`
- **PATTERN**: Existing Map mutation + return-union style (`apps/server/src/rooms/roomStore.ts:53-75`).
- **IMPORTS**: New shared lifecycle types from `@skyshield/shared-types`.
- **GOTCHA**: Keep host-handoff behavior unchanged in `removePlayer`.
- **VALIDATE**: `npm.cmd run build --workspace apps/server`

### UPDATE `apps/server/src/rooms/roomStore.spec.ts`

- **IMPLEMENT**: Add tests for lifecycle defaults and host-check utility behavior.
- **PATTERN**: Existing `node:test` `describe/it` style (`apps/server/src/rooms/roomStore.spec.ts:5-53`).
- **IMPORTS**: `assert` from `node:assert/strict`.
- **GOTCHA**: Do not alter existing test assertions; only extend coverage.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### CREATE `apps/server/src/game-loop/matchLifecycle.ts`

- **IMPLEMENT**: `MatchLifecycleManager` (or equivalent) with APIs:
  - `startCountdown(roomCode)`
  - internal `startMatch(roomCode)`
  - `stopRoom(roomCode)`
  - `stopAll()` (optional cleanup helper for tests)
- **PATTERN**: Use room-scoped broadcasts via `io.to(roomCode).emit(...)` consistent with `lobbyEvents.ts:52-55, 91-94`.
- **IMPORTS**: typed `Server` generics and `AppEnv` config values.
- **GOTCHA**: Timer accuracy: derive `remainingSeconds` from monotonic elapsed time, not tick count.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/server`

### CREATE `apps/server/src/game-loop/matchLifecycle.spec.ts`

- **IMPLEMENT**: Unit tests for:
  - countdown emits 3->2->1
  - transition `lobby -> countdown -> in_game -> game_over`
  - timeout emits `game_over` reason `timer_complete`
- **PATTERN**: `node:test` with explicit async completion and deterministic timer control.
- **IMPORTS**: Consider `context.mock.timers` from `node:test` for deterministic timer advancement (Node test docs).
- **GOTCHA**: Avoid flaky real-time sleeps; rely on mocked timers where possible.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### UPDATE `apps/server/src/events/lobbyEvents.ts`

- **IMPLEMENT**: Register `start_game` handler:
  - validate payload
  - normalize room code
  - verify room exists
  - verify requester is room host
  - verify room phase is `lobby`
  - delegate to lifecycle manager
- **PATTERN**: Existing `emitError(...)` + early-return style (`apps/server/src/events/lobbyEvents.ts:11-13, 28-32, 75-83`).
- **IMPORTS**: `isStartGamePayload` and lifecycle manager dependency.
- **GOTCHA**: Do not start duplicate loops when `start_game` is emitted repeatedly.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### UPDATE `apps/server/src/main.ts`

- **IMPLEMENT**: Instantiate lifecycle manager with `io`, `roomStore`, `env`; inject into event registration; stop room lifecycle on disconnect/empty-room cleanup path.
- **PATTERN**: Existing composition root style (`apps/server/src/main.ts:8-46`).
- **IMPORTS**: New game-loop module.
- **GOTCHA**: Ensure lifecycle stop occurs before room removal side effects can orphan intervals.
- **VALIDATE**: `npm.cmd run build --workspace apps/server`

### CREATE `apps/server/src/events/startGame.integration.spec.ts`

- **IMPLEMENT**: Integration cases:
  - non-host receives `error_event` on `start_game`
  - host gets countdown + first `game_state`
  - timer completion leads to `game_over` (win/timer_complete)
- **PATTERN**: Socket test harness style from `apps/server/src/events/lobbyEvents.integration.spec.ts:31-100`.
- **IMPORTS**: `createServer`, `Server`, `socket.io-client`, typed events.
- **GOTCHA**: Keep per-test timeouts short and deterministic.
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

### UPDATE `apps/server/src/run-integration-tests.ts`

- **IMPLEMENT**: Include new integration suite (if test bootstrap relies on explicit imports/discovery behavior).
- **PATTERN**: Current integration harness execution style (`apps/server/src/run-integration-tests.ts:9-77`).
- **IMPORTS**: Any new spec entrypoints as needed.
- **GOTCHA**: Ensure CI/local command still runs all integration tests from one script.
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

---

## TESTING STRATEGY

### Unit Tests

- Extend shared guard tests for `start_game` payload acceptance/rejection.
- Extend RoomStore tests for lifecycle default state and host authorization helper.
- Add lifecycle manager unit tests for transition logic and timer computation.

### Integration Tests

- Create dedicated `start_game` integration suite that asserts real socket behavior and event order:
  1. create room as host
  2. join guest
  3. verify guest `start_game` forbidden
  4. verify host `start_game` triggers countdown then periodic game_state
  5. verify timer expiration emits game_over

### Edge Cases

- `start_game` from socket not in room.
- `start_game` with mismatched/invalid room code casing.
- repeated `start_game` calls during countdown/in_game.
- host disconnect during countdown (loop shutdown + host handoff state correctness).
- room deleted while loop active (no timer leak).

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and feature correctness.

### Level 1: Syntax & Style

- `npm.cmd run lint --workspace shared/types`
- `npm.cmd run lint --workspace apps/server`

### Level 2: Unit Tests

- `npm.cmd run test --workspace shared/types`
- `npm.cmd run test --workspace apps/server`

### Level 3: Integration Tests

- `npm.cmd run test:integration --workspace apps/server`

### Level 4: Type + Build Validation

- `npm.cmd run typecheck --workspace shared/types`
- `npm.cmd run typecheck --workspace apps/server`
- `npm.cmd run build --workspace shared/types`
- `npm.cmd run build --workspace apps/server`

### Level 5: Workspace-Level Validation

- `npm.cmd run test`
- `npm.cmd run build`

### Level 6: Manual Validation

1. Start stack: `npm.cmd run dev`.
2. Open two clients at `http://localhost:4200`.
3. Host creates room; guest joins.
4. Guest attempts start -> verify visible error state.
5. Host starts game -> verify countdown events and synchronized timer/HP view updates.
6. Wait match timeout -> verify `game_over` reason `timer_complete` appears.
7. Disconnect/reconnect one client during match -> verify no server crash and expected MVP at-most-once behavior.

---

## ACCEPTANCE CRITERIA

- [ ] Host-only `start_game` authorization enforced server-side.
- [ ] Room lifecycle phases implemented and transitions are deterministic.
- [ ] Countdown emits `game_countdown` sequence before match starts.
- [ ] Server emits periodic `game_state` based on authoritative timer.
- [ ] `game_over` emits on timeout with `result: "win"`, `reason: "timer_complete"`.
- [ ] All new payload guards and lifecycle logic are covered by tests.
- [ ] Existing create/join/lobby behavior remains unchanged.
- [ ] All validation commands pass with zero errors.

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

- This phase intentionally stops at lifecycle/timer foundation; meteor simulation and `shoot` collision logic are subsequent feature slices.
- Given Socket.IO default delivery semantics (at-most-once, no server replay buffer), MVP should accept missed `game_state` packets during transient disconnects.
- Keep lifecycle manager isolated from transport handlers to preserve maintainability and enable later offline/shared-game-rule extraction.
- Consider switching to monotonic clock (`performance.now()` or `process.hrtime.bigint()`) for elapsed math to avoid wall-clock skew issues.

**Confidence Score**: 8.5/10 for one-pass implementation success.
