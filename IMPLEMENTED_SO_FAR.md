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

- Expanded shared domain models in `shared/types/src/models.ts`
  - `MeteorState`: type, radius, speed, hp/maxHp, createdAtMs
  - `ProjectileState`: ownerId, radius/speed, target coords, createdAtMs
  - `LeaderboardEntry`: shots/hits/accuracy fields
  - match runtime additions: `playerStats`, id counters, last spawn timestamp
  - new `MeteorType` + `PlayerMatchStats`
- Expanded event contracts and runtime guards in `shared/types/src/events.ts`
  - Added `isShootPayload` with strict numeric/room-code validation
  - Exported room-code pattern for consistency
  - `game_state` leaderboard now uses shared `LeaderboardEntry` model
- Export surface in `shared/types/src/index.ts`
- Added package and TS config:
  - `shared/types/package.json`
  - `shared/types/tsconfig.json`

## Server App (`apps/server`)

- Environment parsing with defaults and numeric validation:
  - `apps/server/src/config/env.ts`
- Added simulation env settings:
  - playfield bounds, meteor cadence/speeds/radii, projectile speed/radius/despawn, heavy spawn cadence
- In-memory room store with create/join/remove/host-handoff and lifecycle helpers:
  - `apps/server/src/rooms/roomStore.ts`
  - phase + match runtime defaults on room creation
  - helpers: `setRoomPhase`, `updateMatchState`, `updatePlayer`, `setPlayerStats`, `isHost`
- Added deterministic simulation module:
  - `apps/server/src/game-loop/simulation.ts`
  - room-scoped step function for spawn/movement/collision/scoring/HP damage
  - heavy meteor 2-hit and deterministic last-hit scoring
  - leaderboard builder derived from authoritative stats
- Upgraded authoritative match lifecycle manager:
  - `apps/server/src/game-loop/matchLifecycle.ts`
  - host-triggered countdown (`3 -> 2 -> 1`)
  - simulation-integrated ticks with monotonic `dt`
  - room-scoped shot queue feeding simulation
  - live `hit_confirmed` emission + leaderboard updates
  - dual game-over paths:
    - `timer_complete` => `result: "win"`
    - `city_destroyed` => `result: "lose"`
  - final accuracy derived from real shots/hits
  - teardown APIs: `stopRoom`, `stopAll`
- Lobby socket handlers:
  - `apps/server/src/events/lobbyEvents.ts`
  - Handles `create_room`, `join_room`, `start_game`
  - host-only `start_game` authorization
  - lifecycle precondition checks (`lobby` only)
  - Emits `room_created`, `lobby_state`, `error_event`
- Added shoot socket handlers:
  - `apps/server/src/events/shootEvents.ts`
  - Validates payloads, membership, phase, and enforces `400ms` fire-rate throttle
  - Enqueues room-scoped shot inputs for lifecycle simulation
- Server bootstrap:
  - `apps/server/src/main.ts`
  - HTTP server + health endpoint
  - Socket.io setup with CORS from env
  - lifecycle + lobby + shoot wiring
  - disconnect cleanup updated to avoid interrupting active matches when room still has players
- Added package and TS config:
  - `apps/server/package.json`
  - `apps/server/tsconfig.json`

## Client App (`apps/client`)

- React + Vite app shell:
  - `apps/client/src/main.tsx`
  - `apps/client/src/app/App.tsx`
- Added typed socket client:
  - `apps/client/src/net/socket.ts`
- Added gameplay client modules:
  - `apps/client/src/game/types.ts`
  - `apps/client/src/game/useMatchState.ts`
  - `apps/client/src/game/MatchView.tsx`
- App now supports mode switching for:
  - lobby
  - countdown
  - in-game
  - game-over
- In-game UI implemented:
  - HUD: timer, city HP bar, top score
  - playfield: meteors + projectiles from authoritative `game_state`
  - pointer/click shooting emitting `shoot` with client timestamp
  - hit toast and leaderboard panel
- Updated styling:
  - `apps/client/src/styles.css`
- Vite and TS config:
  - `apps/client/vite.config.ts`
  - `apps/client/tsconfig.json`
  - `apps/client/index.html`
- Added package manifest:
  - `apps/client/package.json`

## Docs

- Updated `README.md` with gameplay slice status, controls, and simulation env vars.

## Testing Implemented

- Shared types test entrypoint:
  - `shared/types/src/run-tests.ts`
- Server unit test entrypoint:
  - `apps/server/src/run-tests.ts`
- Server integration test entrypoint:
  - `apps/server/src/run-integration-tests.ts`
- Spec coverage files:
  - `shared/types/src/events.spec.ts`
  - `apps/server/src/game-loop/matchLifecycle.spec.ts`
  - `apps/server/src/game-loop/simulation.spec.ts`
  - `apps/server/src/events/lobbyEvents.integration.spec.ts`
  - `apps/server/src/events/startGame.integration.spec.ts`
  - `apps/server/src/events/shootEvents.integration.spec.ts`
  - `apps/client/src/game/MatchView.spec.ts`
- Coverage highlights:
  - payload guard pass/fail for `shoot` + existing room/start payloads
  - room lifecycle defaults + host utility behavior + deterministic simulation sanity
  - lifecycle transitions: `lobby -> countdown -> in_game -> game_over`
  - deterministic spawn/collision/heavy-last-hit/city-damage unit behavior
  - integration behavior:
    - non-host start rejection
    - countdown + first `game_state`
    - valid shoot -> `hit_confirmed` + score update
    - city-destroyed loss path
    - timer-complete path with real final accuracy
  - client helper test for deterministic render coordinate conversion

## Current Validation Status

- Passed:
  - `npm.cmd run lint --workspace shared/types`
  - `npm.cmd run lint --workspace apps/server`
  - `npm.cmd run lint --workspace apps/client`
  - `npm.cmd run test --workspace shared/types`
  - `npm.cmd run test --workspace apps/server`
  - `npm.cmd run test --workspace apps/client`
  - `npm.cmd run test`
  - `npm.cmd run test:integration --workspace apps/server`
  - `npm.cmd run typecheck --workspace shared/types`
  - `npm.cmd run typecheck --workspace apps/server`
  - `npm.cmd run typecheck --workspace apps/client`
  - `npm.cmd run build --workspace shared/types`
  - `npm.cmd run build --workspace apps/server`
  - `npm.cmd run build --workspace apps/client`
  - `npm.cmd run build`
- Note:
  - In sandboxed execution, Nx/Vite worker processes may fail with `spawn EPERM`.
  - Validation passes when commands are run with appropriate unsandboxed permissions.

## Latest Client Routing + UI Upgrade Slice

### Routing and Page Split (`apps/client`)

- Added declarative client routing with `react-router`:
  - `/` -> `LobbyPage`
  - `/room/:roomCode` -> `RoomPage`
  - fallback -> `NotFoundPage`
- Updated bootstrap:
  - `apps/client/src/main.tsx` now wraps app with `BrowserRouter`
- App composition refactor:
  - `apps/client/src/app/App.tsx` now serves as shell-only composition
  - `apps/client/src/app/router.tsx` added as centralized route map

### Session Ownership and Socket-State Composition

- Added shared session store:
  - `apps/client/src/app/useSessionStore.ts`
- Centralized concerns:
  - profile persistence (`skyshield.playerName`, `skyshield.characterId`)
  - room code normalization + input state
  - lobby snapshot/status/error handling
  - create/join/start room actions
  - single owner for connect/disconnect + lobby listeners
- Route flow behavior:
  - successful create/join drives navigation to `/room/:roomCode`
  - room route guards handle missing/invalid/mismatched room context

### Room and Lobby Pages

- Created:
  - `apps/client/src/pages/LobbyPage.tsx`
  - `apps/client/src/pages/RoomPage.tsx`
  - `apps/client/src/pages/NotFoundPage.tsx`
- Lobby page:
  - profile inputs
  - create/join controls
  - status/error surface
  - live lobby snapshot preview
- Room page:
  - room metadata and players list
  - host-only start button behavior
  - waiting state + match rendering via `MatchView`
  - back-to-lobby session clear action

### Match Flow Adjustments

- Updated `apps/client/src/game/useMatchState.ts`:
  - removed duplicate room/lobby listeners from match hook
  - preserved countdown/game/game-over event handlers + cleanup
  - added reset behavior when room context clears
- Updated `apps/client/src/game/MatchView.tsx`:
  - preserved shot throttle + coordinate clamping behavior
  - small layout contract alignment for new room composition
  - added empty leaderboard message state

### Visual Redesign

- Replaced global styling with tokenized design system:
  - `apps/client/src/styles.css`
- Added page-level layout stylesheet:
  - `apps/client/src/pages/page-layout.css`
- Improvements include:
  - CSS variable theme tokens (color, spacing, radius, motion)
  - differentiated lobby vs room composition
  - stronger visual hierarchy
  - responsive behavior down to narrow mobile widths

### Tests and Docs Updates

- Updated `apps/client/src/game/MatchView.spec.ts`:
  - retained coordinate helper assertions
  - added `normalizeRoomCode` helper coverage
- Updated `README.md`:
  - documents route split and revised lobby/room control flow

### Latest Validation Status (This Slice)

- Passed:
  - `npm.cmd run lint --workspace apps/client`
  - `npm.cmd run test --workspace apps/client`
  - `npm.cmd run typecheck --workspace apps/client`
  - `npm.cmd run build --workspace apps/client`
  - `npm.cmd run test`
  - `npm.cmd run build`
- Notes:
  - Client `test/build/dev` commands may require unsandboxed execution due to Vite/esbuild `spawn EPERM` in sandbox.
  - Workspace `npm.cmd run build` may require unsandboxed execution due to Nx plugin worker startup restrictions in sandbox.
