# Feature: init

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Initialize the SkyShield codebase from product-spec-only state into a runnable TypeScript monorepo foundation with separate client/server apps and shared contracts. The output of this feature is an implementation-ready baseline, not full gameplay.

## User Story

As a developer starting the SkyShield MVP
I want a working project scaffold with shared contracts, build/test tooling, and a minimal realtime room flow
So that I can implement gameplay features quickly with low integration risk

## Problem Statement

The repository currently has no application code, no build system, and no runtime entry points. Without a structured foundation, later MVP work (rooms, loop, offline mode, scoring) will be slower, inconsistent, and prone to contract drift between client and server.

## Solution Statement

Create a workspace-based TypeScript monorepo with:
- `apps/client` for mobile web UI shell and Socket.io client wiring
- `apps/server` for in-memory room/lobby Socket.io backend
- `shared/types` for source-of-truth event contracts and domain models
- baseline lint/typecheck/test scripts and CI-ready commands

This aligns directly with PRD architecture and unlocks phase-1 MVP implementation.

## Feature Metadata

**Feature Type**: New Capability  
**Estimated Complexity**: Medium  
**Primary Systems Affected**: Repo root tooling, client app, server app, shared contracts  
**Dependencies**: Node.js LTS, TypeScript, Socket.io, Socket.io client, Phaser 3, Vite, Vitest, ESLint

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `README.md` (lines 1-1) - Current baseline is empty; README must be expanded to setup/run instructions.
- `PRD.md` (lines 3-5) - Product status and lock (`v1.0`, draft for build).
- `PRD.md` (lines 113-147) - Target architecture, directory layout, design patterns.
- `PRD.md` (lines 214-229) - Planned tech stack (TypeScript, Phaser, Socket.io, shared contracts).
- `PRD.md` (lines 240-247) - Required env vars and default values.
- `PRD.md` (lines 262-302) - Socket event contract requirements and server authority rules.
- `PRD.md` (lines 327-337) - Phase 1 deliverables to match exactly.
- `PRD.md` (lines 413-421) - Initial local `.env` configuration values.

### New Files to Create

- `package.json` - Workspace root scripts and shared dev dependencies.
- `tsconfig.base.json` - Common TS compiler settings.
- `.gitignore` - Node build artifacts and env file ignores.
- `.editorconfig` - Formatting baseline.
- `.env.example` - Env template from PRD defaults.
- `apps/client/package.json` - Client scripts/deps.
- `apps/client/index.html` - Vite entry HTML.
- `apps/client/src/main.ts` - Client bootstrap.
- `apps/client/src/app/App.ts` - Minimal app shell with create/join room actions.
- `apps/client/src/net/socket.ts` - Socket.io client connection layer.
- `apps/server/package.json` - Server scripts/deps.
- `apps/server/src/main.ts` - Server bootstrap and Socket.io setup.
- `apps/server/src/config/env.ts` - Env parsing and defaults.
- `apps/server/src/rooms/roomStore.ts` - In-memory room state.
- `apps/server/src/events/lobbyEvents.ts` - `create_room`, `join_room` handlers.
- `shared/types/src/events.ts` - Client/server event payload contracts.
- `shared/types/src/models.ts` - Shared domain types (player, room, lobby).
- `shared/types/src/index.ts` - Shared package exports.
- `README.md` - Updated setup and run docs.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Node.js Docs](https://nodejs.org/en/docs)
  - Specific section: LTS runtime and CLI behavior
  - Why: Keep runtime aligned with PRD Node LTS requirement.
- [npm Workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces)
  - Specific section: defining workspaces and workspace script execution
  - Why: Root->app orchestration pattern for this monorepo.
- [TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig)
  - Specific section: `composite`, `paths`, strictness flags
  - Why: shared types imported safely by server/client.
- [Socket.IO Server Initialization](https://socket.io/docs/v4/server-initialization/)
  - Specific section: CORS and HTTP server attachment
  - Why: Backend realtime setup and local dev compatibility.
- [Socket.IO Emitting Events](https://socket.io/docs/v4/emitting-events/)
  - Specific section: typed events and acknowledgements
  - Why: enforce PRD event contracts.
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/)
  - Specific section: connection lifecycle and event listeners
  - Why: robust client connection handling.
- [Phaser Getting Started](https://docs.phaser.io/phaser/getting-started)
  - Specific section: install + bootstrapping in modern bundlers
  - Why: use official bootstrap pattern even if gameplay scene comes later.
- [Vite Guide](https://vite.dev/guide/)
  - Specific section: project scripts and dev server behavior
  - Why: client app baseline and fast local iteration.
- [Vitest Guide](https://vitest.dev/guide/)
  - Specific section: test config and watch mode
  - Why: unit test baseline for shared contracts and room logic.
- [ESLint Docs](https://eslint.org/docs/latest/use/getting-started)
  - Specific section: flat config and npm scripts
  - Why: enforce consistency from day 1.

### Patterns to Follow

Current codebase has no implementation patterns yet, so follow PRD-defined architecture patterns as mandatory conventions.

**Naming Conventions:**
- Files: `kebab-case` (`room-store.ts`, `lobby-events.ts`).
- Types/interfaces: `PascalCase` (`RoomState`, `LobbyState`).
- Event names: `snake_case` exactly as PRD (`create_room`, `lobby_state`).
- Constants/env keys: `UPPER_SNAKE_CASE`.

**Error Handling:**
- Validate incoming payloads at server boundary.
- Emit `error_event` with stable `code` + Hebrew-safe `messageHe`.
- Do not throw uncaught errors from socket handlers.

**Logging Pattern:**
- Structured console logging only at this stage:
  - startup config summary (non-secret)
  - room lifecycle (`room created/joined/left`)
  - handler error context (`event`, `socketId`, `roomCode`)

**Other Relevant Patterns:**
- Server authoritative state transitions only.
- Shared types package is single source of truth for event payloads.
- In-memory room store only (no database, no Redis).

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Establish workspace/tooling skeleton so apps and shared contracts compile and run together.

**Tasks:**

- Set up root workspace files and scripts.
- Create base TypeScript config and lint/test config scaffolding.
- Add env template from PRD defaults.
- Create app/shared package manifests.

### Phase 2: Core Implementation

Implement minimal vertical slice for room creation/join and lobby state broadcast.

**Tasks:**

- Implement shared domain/event contracts.
- Build server bootstrap + room store + socket handlers.
- Build client bootstrap + socket integration + minimal UI controls.
- Wire typed event usage across client/server.

### Phase 3: Integration

Connect all packages via workspace scripts and cross-package imports.

**Tasks:**

- Register root scripts for `dev`, `build`, `typecheck`, `lint`, `test`.
- Ensure shared package is consumed by both apps.
- Update README with exact setup and run commands.

### Phase 4: Testing & Validation

Add test baseline and verify end-to-end lobby behavior.

**Tasks:**

- Unit tests for room store + payload validation utilities.
- Basic integration test for create/join room event sequence.
- Manual two-tab verification for lobby sync.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### CREATE `package.json`

- **IMPLEMENT**: Define npm workspaces: `apps/*`, `shared/*`; add root scripts (`dev`, `build`, `typecheck`, `lint`, `test`).
- **PATTERN**: Mirror PRD architecture intent (`PRD.md:120-139`).
- **IMPORTS**: Add dev dependencies (`typescript`, `eslint`, `vitest`, workspace tooling).
- **GOTCHA**: Keep scripts non-interactive and CI-safe.
- **VALIDATE**: `npm.cmd pkg get workspaces`

### CREATE `tsconfig.base.json`

- **IMPLEMENT**: Strict TS settings, module resolution compatible with Vite + Node.
- **PATTERN**: Shared contracts first (`PRD.md:227-229`).
- **IMPORTS**: N/A
- **GOTCHA**: Avoid path aliases that break Node runtime until bundling is configured.
- **VALIDATE**: `npx.cmd tsc --showConfig > NUL`

### CREATE `.env.example`

- **IMPLEMENT**: Include `PORT`, `CLIENT_ORIGIN`, `MAX_PLAYERS_PER_ROOM`, `MATCH_DURATION_SECONDS`, `CITY_HP_DEFAULT`, `TICK_RATE_HZ`.
- **PATTERN**: Exact defaults from `PRD.md:413-421`.
- **IMPORTS**: N/A
- **GOTCHA**: Do not commit actual `.env`.
- **VALIDATE**: `Get-Content .env.example`

### CREATE `shared/types/src/models.ts`

- **IMPLEMENT**: `PlayerState`, `RoomState`, `LobbyState`, and minimal meteor/projectile placeholders for contract completeness.
- **PATTERN**: API and state requirements (`PRD.md:277-298`).
- **IMPORTS**: TS primitive types only.
- **GOTCHA**: Do not over-model gameplay before gameplay phase.
- **VALIDATE**: `npx.cmd tsc -p shared/types/tsconfig.json --noEmit`

### CREATE `shared/types/src/events.ts`

- **IMPLEMENT**: `ClientToServerEvents`, `ServerToClientEvents`, `InterServerEvents`, `SocketData`.
- **PATTERN**: Exact event names/payloads (`PRD.md:266-298`).
- **IMPORTS**: shared models from same package.
- **GOTCHA**: Event naming must remain snake_case for protocol stability.
- **VALIDATE**: `npx.cmd tsc -p shared/types/tsconfig.json --noEmit`

### CREATE `apps/server/src/config/env.ts`

- **IMPLEMENT**: Parse env with defaults and numeric coercion.
- **PATTERN**: Config keys and defaults (`PRD.md:240-247`, `PRD.md:413-421`).
- **IMPORTS**: process env only.
- **GOTCHA**: Reject invalid numeric values early on startup.
- **VALIDATE**: `npm.cmd run build --workspace apps/server`

### CREATE `apps/server/src/rooms/roomStore.ts`

- **IMPLEMENT**: In-memory map for rooms + players with helper functions for create/join/remove.
- **PATTERN**: Room-scoped state container (`PRD.md:144`).
- **IMPORTS**: shared types.
- **GOTCHA**: Cap players per room using `MAX_PLAYERS_PER_ROOM`.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### CREATE `apps/server/src/events/lobbyEvents.ts`

- **IMPLEMENT**: Register `create_room` and `join_room`; emit `room_created`, `lobby_state`, and `error_event`.
- **PATTERN**: Event contract and server-authority rules (`PRD.md:266-302`).
- **IMPORTS**: `socket.io`, room store, shared events/types.
- **GOTCHA**: Validate `playerName` trim length 2-16 and room code format 4-6.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### CREATE `apps/server/src/main.ts`

- **IMPLEMENT**: HTTP + Socket.io bootstrap, CORS from `CLIENT_ORIGIN`, event registration, health endpoint.
- **PATTERN**: single lightweight backend (`PRD.md:70`, `PRD.md:225`).
- **IMPORTS**: Node HTTP, Socket.io server, env, lobby events.
- **GOTCHA**: Ensure graceful cleanup on disconnect for host handoff groundwork.
- **VALIDATE**: `npm.cmd run dev --workspace apps/server`

### CREATE `apps/client/src/net/socket.ts`

- **IMPLEMENT**: Singleton typed socket with connect/disconnect and typed emit/on wrappers.
- **PATTERN**: realtime sync and typed events (`PRD.md:59`, `PRD.md:266-298`).
- **IMPORTS**: `socket.io-client`, shared event types.
- **GOTCHA**: keep transport fallback default for mobile networks.
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### CREATE `apps/client/src/app/App.ts`

- **IMPLEMENT**: Minimal mobile-first shell with local profile fields, create/join controls, and lobby player list render.
- **PATTERN**: profile + lobby requirements (`PRD.md:149-163`).
- **IMPORTS**: socket module and local storage helper.
- **GOTCHA**: persist only `skyshield.playerName` and `skyshield.characterId`.
- **VALIDATE**: `npm.cmd run dev --workspace apps/client`

### CREATE `apps/client/src/main.ts`

- **IMPLEMENT**: App mount + baseline style import + future Phaser bootstrap placeholder.
- **PATTERN**: MVP starts simple but game-ready structure (`PRD.md:327-334`).
- **IMPORTS**: App module.
- **GOTCHA**: avoid coupling UI shell to Phaser boot sequence yet.
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### UPDATE `README.md`

- **IMPLEMENT**: document prerequisites, install, env setup, run commands, project structure, and known MVP limitations.
- **PATTERN**: current file is empty baseline (`README.md:1`).
- **IMPORTS**: N/A
- **GOTCHA**: include exact tested commands and default ports.
- **VALIDATE**: `Get-Content README.md`

### ADD tests (`apps/server/src/**/*.spec.ts`, `shared/types/src/**/*.spec.ts`)

- **IMPLEMENT**: unit tests for room store and event payload validations; simple integration for create/join flow.
- **PATTERN**: PRD phase-1 validation (`PRD.md:335-337`).
- **IMPORTS**: Vitest + socket test utilities.
- **GOTCHA**: keep tests deterministic (seed random room code generator or mock it).
- **VALIDATE**: `npm.cmd test`

---

## TESTING STRATEGY

### Unit Tests

- `shared/types`: compile-time and runtime guard tests for event payload shapes.
- `apps/server/rooms`: room creation/join capacity rules and edge-case handling.
- `apps/server/events`: handler behavior for invalid payloads and happy-path emits.

### Integration Tests

- Boot server in test mode and verify:
  - client A emits `create_room` -> receives `room_created` + `lobby_state`
  - client B emits `join_room` -> both clients receive updated `lobby_state`
  - invalid join emits `error_event`

### Edge Cases

- Duplicate player names in same room.
- Room full (`MAX_PLAYERS_PER_ROOM`) rejection.
- Invalid/empty `playerName`.
- Join non-existent room code.
- Host disconnect before game start.
- Rapid duplicate `join_room` emits from same socket.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and feature correctness.

### Level 1: Syntax & Style

- `npm.cmd install`
- `npm.cmd run lint`
- `npm.cmd run typecheck`

### Level 2: Unit Tests

- `npm.cmd run test --workspace shared/types`
- `npm.cmd run test --workspace apps/server`

### Level 3: Integration Tests

- `npm.cmd run test:integration --workspace apps/server`

### Level 4: Manual Validation

- Terminal 1: `npm.cmd run dev --workspace apps/server`
- Terminal 2: `npm.cmd run dev --workspace apps/client`
- Open two browser tabs:
  - Tab A: create room with name + character
  - Tab B: join room with code
  - Verify both tabs show same lobby player list and host id

### Level 5: Additional Validation (Optional)

- `npm.cmd run build`
- `git status --short`

---

## ACCEPTANCE CRITERIA

- [ ] Monorepo scaffold exists with `apps/client`, `apps/server`, `shared/types`.
- [ ] `npm.cmd install`, lint, typecheck, build, and tests run successfully.
- [ ] Shared event contracts match PRD event names/payloads.
- [ ] Minimal room create/join lobby flow works across two browser tabs.
- [ ] Local profile keys persisted as specified in PRD.
- [ ] No database dependency introduced.
- [ ] README documents setup and run flow end-to-end.
- [ ] No regressions (N/A baseline, but all commands pass).

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

- This repo currently has no implementation code; PRD is the source-of-truth for initial conventions.
- Keep scope strictly to foundation + minimal lobby vertical slice. Do not start gameplay loop, meteor simulation, or Phaser scenes beyond bootstrap.
- If any PRD detail conflicts with practical implementation constraints, preserve protocol names and defaults, then document deviations in README under "Implementation Notes".

