# Implemented So Far

## Workspace Foundation

- Initialized monorepo structure:
  - `apps/client`
  - `apps/server`
  - `shared/types`
- Added root tooling/config:
  - `package.json`
  - `tsconfig.base.json`
  - `tsconfig.json`
  - `eslint.config.js`
  - `nx.json`
  - `.gitignore`
  - `.editorconfig`
  - `.env.example`
- Added Nx project definitions:
  - `apps/client/project.json`
  - `apps/server/project.json`
  - `shared/types/project.json`

## Shared Contracts (`shared/types`)

- Implemented shared domain models in `shared/types/src/models.ts`
  - `PlayerState`, `RoomState`, `LobbyState`
  - `MeteorState`, `ProjectileState`
  - lifecycle/runtime models: `RoomPhase`, `MatchRuntimeState`, `LeaderboardEntry`
- Implemented event contracts and payload guards in `shared/types/src/events.ts`
  - `ClientToServerEvents`, `ServerToClientEvents`, `InterServerEvents`, `SocketData`
  - runtime guards: `isCreateRoomPayload`, `isJoinRoomPayload`, `isStartGamePayload`
- Export surface in `shared/types/src/index.ts`
- Added package and TS config:
  - `shared/types/package.json`
  - `shared/types/tsconfig.json`

## Server App (`apps/server`)

- Environment parsing with defaults and numeric validation:
  - `apps/server/src/config/env.ts`
- In-memory room store with create/join/remove/host-handoff and lifecycle helpers:
  - `apps/server/src/rooms/roomStore.ts`
  - phase + match runtime defaults on room creation
  - helpers: `setRoomPhase`, `updateMatchState`, `isHost`
- Authoritative match lifecycle manager:
  - `apps/server/src/game-loop/matchLifecycle.ts`
  - host-triggered countdown (`3 -> 2 -> 1`)
  - server-authoritative timer ticks from monotonic clock
  - periodic `game_state` emission
  - timeout-driven `game_over` with `result: "win"` and `reason: "timer_complete"`
  - teardown APIs: `stopRoom`, `stopAll`
- Lobby socket handlers:
  - `apps/server/src/events/lobbyEvents.ts`
  - Handles `create_room`, `join_room`, `start_game`
  - host-only `start_game` authorization
  - lifecycle precondition checks (`lobby` only)
  - Emits `room_created`, `lobby_state`, `error_event`
- Server bootstrap:
  - `apps/server/src/main.ts`
  - HTTP server + health endpoint
  - Socket.io setup with CORS from env
  - lifecycle manager wiring + disconnect cleanup to avoid loop leaks
- Added package and TS config:
  - `apps/server/package.json`
  - `apps/server/tsconfig.json`

## Client App (`apps/client`) - Migrated To React

- Converted client shell to React + Vite:
  - `apps/client/src/main.tsx`
  - `apps/client/src/app/App.tsx`
- Added typed socket client:
  - `apps/client/src/net/socket.ts`
- Added base styles:
  - `apps/client/src/styles.css`
- Vite and TS config updated for React:
  - `apps/client/vite.config.ts`
  - `apps/client/tsconfig.json`
  - `apps/client/index.html`
- Added package manifest:
  - `apps/client/package.json`
- Build-compat updates for current TypeScript/NodeNext settings:
  - explicit `.js` relative imports in TSX entrypoints
  - React typings added in `apps/client/tsconfig.json`

## Docs

- Expanded `README.md` with setup, run commands, structure, and scope notes.

## Testing Implemented

- Shared types test entrypoint:
  - `shared/types/src/run-tests.ts`
- Server unit test entrypoint:
  - `apps/server/src/run-tests.ts`
- Server integration test entrypoint:
  - `apps/server/src/run-integration-tests.ts`
- Spec coverage files:
  - `shared/types/src/events.spec.ts`
  - `apps/server/src/rooms/roomStore.spec.ts`
  - `apps/server/src/game-loop/matchLifecycle.spec.ts`
  - `apps/server/src/events/lobbyEvents.integration.spec.ts`
  - `apps/server/src/events/startGame.integration.spec.ts`
- Coverage highlights:
  - payload guard pass/fail for `start_game`
  - room lifecycle defaults + host utility behavior
  - lifecycle transitions: `lobby -> countdown -> in_game -> game_over`
  - integration behavior: non-host start rejection, countdown/game_state emission, timer-complete game over

## Current Validation Status

- Passed:
  - `npm.cmd run lint --workspace shared/types`
  - `npm.cmd run lint --workspace apps/server`
  - `npm.cmd run test --workspace shared/types`
  - `npm.cmd run test --workspace apps/server`
  - `npm.cmd run test`
  - `npm.cmd run test:integration --workspace apps/server`
  - `npm.cmd run typecheck --workspace shared/types`
  - `npm.cmd run typecheck --workspace apps/server`
  - `npm.cmd run build --workspace shared/types`
  - `npm.cmd run build --workspace apps/server`
  - `npm.cmd run build`
- Note:
  - In sandboxed execution, Nx/Vite worker processes may fail with `spawn EPERM`.
  - Validation passes when commands are run with appropriate unsandboxed permissions.
