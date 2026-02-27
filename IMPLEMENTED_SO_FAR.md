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

## Latest Offline Singleplayer + Shared Simulation Slice

### Shared Simulation Source of Truth

- Added shared gameplay engine:
  - `shared/types/src/simulation.ts`
  - exported via `shared/types/src/index.ts`
- Includes:
  - `stepSimulation`
  - `buildLeaderboard`
  - shared simulation types (`SimulationConfig`, `QueuedShot`, etc.)
- Server simulation module now re-exports from shared package:
  - `apps/server/src/game-loop/simulation.ts`
- Server simulation spec now targets shared module surface:
  - `apps/server/src/game-loop/simulation.spec.ts`

### Offline Mode (`apps/client`)

- Added offline config with server-default parity constants:
  - `apps/client/src/offline/offlineConfig.ts`
- Added offline lifecycle hook:
  - `apps/client/src/offline/useOfflineMatchState.ts`
  - countdown -> in_game -> game_over phases
  - RAF-driven simulation loop with clamped `dt` (`1..250ms`)
  - local shot queue + 400ms throttle gate
  - win/lose semantics aligned to multiplayer (`timer_complete`, `city_destroyed`)
- Added offline page:
  - `apps/client/src/pages/OfflinePage.tsx`
  - start/retry/back controls + profile summary + `MatchView` reuse
- Added route and lobby entry:
  - `apps/client/src/app/router.tsx` (`/offline`)
  - `apps/client/src/pages/LobbyPage.tsx` (`Singleplayer (Offline)` CTA)
- Session isolation updates:
  - `apps/client/src/app/useSessionStore.ts`
  - added `enterOfflineMode`
  - clears online room state for offline entry
  - ignores lobby/room socket updates while offline to prevent state bleed
  - moved `connectSocket()` to online actions (`createRoom`, `joinRoom`, `startGame`) so offline path does not auto-connect

### MatchView Refactor

- Updated `apps/client/src/game/MatchView.tsx`:
  - optional `onShoot` callback
  - optional `shootCooldownMs`
  - extracted shot clamp helper for deterministic testing
  - preserves existing socket behavior when `onShoot` is not provided

### Tests Added/Updated

- Added:
  - `shared/types/src/simulation.spec.ts`
  - `apps/client/src/offline/useOfflineMatchState.spec.ts`
- Updated:
  - `shared/types/src/run-tests.ts` to include shared simulation spec
  - `apps/client/src/game/MatchView.spec.ts` with shot-clamp helper assertions

### Docs

- Updated `README.md` with:
  - offline route/flow documentation
  - offline limitations and control summary

### Latest Validation Status (Offline Slice)

- Passed:
  - `npm.cmd run lint --workspace shared/types`
  - `npm.cmd run lint --workspace apps/server`
  - `npm.cmd run lint --workspace apps/client`
  - `npm.cmd run test --workspace shared/types`
  - `npm.cmd run test --workspace apps/server`
  - `npm.cmd run test --workspace apps/client`
  - `npm.cmd run test:integration --workspace apps/server`
  - `npm.cmd run typecheck --workspace shared/types`
  - `npm.cmd run typecheck --workspace apps/server`
  - `npm.cmd run typecheck --workspace apps/client`
  - `npm.cmd run build --workspace shared/types`
  - `npm.cmd run build --workspace apps/server`
  - `npm.cmd run build --workspace apps/client`
  - `npm.cmd run test`
- Blocked (environment-level, unrelated to feature code):
  - `npm.cmd run build` (root Nx run-many)
  - `npm.cmd run dev` (root Nx run-many)
  - failure cause: duplicate project names from `.worktrees/fixing-game-looks/*` and main workspace
  - Nx error: `MultipleProjectsWithSameNameError` for `client`, `server`, `shared-types`

## Latest Multi-Cannon Rendering + Image Character Selection Slice

### Shared Contracts

- Updated `shared/types/src/models.ts`:
  - added `PlayerSlotState`
  - added `playerSlots` to `MatchRuntimeState`
- Updated `shared/types/src/events.ts`:
  - `game_state` payload now includes `playerSlots`
- Updated shared simulation (`shared/types/src/simulation.ts`):
  - projectile spawn origin now comes from authoritative shooter slot (`match.playerSlots`)
  - removed center-origin projectile spawning behavior

### Server Authoritative Slot Lifecycle

- Added deterministic slot utility:
  - `apps/server/src/game-loop/playerSlots.ts`
  - deterministic player ordering + evenly spaced bottom-lane cannon slots
- Updated room lifecycle store:
  - `apps/server/src/rooms/roomStore.ts`
  - slot rebuild on create/join/remove
  - room runtime defaults now include playfield width and ground y
- Updated match lifecycle:
  - `apps/server/src/game-loop/matchLifecycle.ts`
  - rebuild slots on match start
  - emit `playerSlots` in every `game_state`
- Updated server bootstrap defaults:
  - `apps/server/src/main.ts` now passes playfield/ground env values into `RoomStore`

### Client Character + Match Visuals

- Added centralized character registry:
  - `apps/client/src/game/characters.ts`
  - local asset mapping + default id + validators/lookups
- Added visual helper module:
  - `apps/client/src/game/playerVisuals.ts`
  - slot->CSS position mapping + deterministic projectile owner class mapping
- Updated session/profile behavior:
  - `apps/client/src/app/useSessionStore.ts`
  - character id validation and fallback to default for invalid localStorage values
- Updated lobby UX:
  - `apps/client/src/pages/LobbyPage.tsx`
  - text character input replaced with image-card selector
  - lobby preview now shows character thumbnails
- Updated room roster UX:
  - `apps/client/src/pages/RoomPage.tsx`
  - player list now includes character thumbnails
- Updated match rendering:
  - `apps/client/src/game/MatchView.tsx`
  - city background layer from local asset
  - player actors (character + cannon) rendered from `game_state.playerSlots`
  - owner-tinted projectile styling classes
  - richer meteor visuals while keeping hit/collision mechanics unchanged
- Updated styling:
  - `apps/client/src/styles.css`
  - `apps/client/src/pages/page-layout.css`
  - added character picker grid/cards, player chips, match layers and projectile owner variants
- Updated offline compatibility:
  - `apps/client/src/offline/useOfflineMatchState.ts`
  - includes `playerSlots` in offline match snapshots/state

### Tests Added/Updated

- Updated `apps/server/src/game-loop/simulation.spec.ts`:
  - verifies different shooters spawn from different origins
  - verifies multi-shooter scoring correctness
- Updated `apps/server/src/events/shootEvents.integration.spec.ts`:
  - multi-client scenario validates `game_state.playerSlots`
  - validates visibility of owner-specific projectile streams
- Updated `apps/client/src/game/MatchView.spec.ts`:
  - added tests for slot visual mapping and owner class mapping
- Updated `shared/types/src/simulation.spec.ts` fixtures for new `playerSlots` requirement

### Docs

- Updated `README.md` to document:
  - image-based character selection
  - all-player/all-cannon/all-shot rendering behavior
  - city background and visual updates

### Latest Validation Status (This Slice)

- Passed:
  - `npm.cmd run lint --workspace shared/types`
  - `npm.cmd run lint --workspace apps/server`
  - `npm.cmd run lint --workspace apps/client`
  - `npm.cmd run test --workspace shared/types`
  - `npm.cmd run test --workspace apps/server`
  - `npm.cmd run test --workspace apps/client`
  - `npm.cmd run test:integration --workspace apps/server`
  - `npm.cmd run typecheck --workspace shared/types`
  - `npm.cmd run typecheck --workspace apps/server`
  - `npm.cmd run typecheck --workspace apps/client`
  - `npm.cmd run build --workspace shared/types`
  - `npm.cmd run build --workspace apps/server`
  - `npm.cmd run build --workspace apps/client`
  - `npm.cmd run test`
  - `npm.cmd run build`
- Note:
  - In this environment, client `test/build` commands may require unsandboxed execution due to Vite/esbuild `spawn EPERM` under sandbox.

## Latest Hebrew UI + Audio + Replay + Rate-Limit Slice

### Client UX and Match Rendering

- Added centralized Hebrew text dictionary:
  - `apps/client/src/app/uiText.ts`
- Added minimal Web Audio SFX utility with persistent enable/disable support:
  - `apps/client/src/audio/sfx.ts`
- Updated session store:
  - `apps/client/src/app/useSessionStore.ts`
  - added `skyshield.audioEnabled` persistence
  - added `set_audio_pref` emit on connect/toggle/create/join/start
  - wired localized status messages
- Updated pages to Hebrew + RTL and audio toggle controls:
  - `apps/client/src/pages/LobbyPage.tsx`
  - `apps/client/src/pages/RoomPage.tsx`
  - `apps/client/src/pages/OfflinePage.tsx`
- Updated match UI:
  - `apps/client/src/game/MatchView.tsx`
  - Hebrew HUD/leaderboard labels
  - dedicated game-over summary panel using `finalLeaderboard`
  - missile sprite rendering by meteor type:
    - `light` -> `small_missile.png`
    - `heavy` -> `missile.png`
  - shoot/hit SFX hooks
- Updated match state hook for one-time game-over SFX:
  - `apps/client/src/game/useMatchState.ts`
- Updated styles for sprite meteors and game-over panel:
  - `apps/client/src/styles.css`

### Server Rate Limiting + Events

- Added reusable socket event limiter utility:
  - `apps/server/src/events/rateLimit.ts`
- Added limiter-focused test file:
  - `apps/server/src/events/rateLimit.spec.ts`
- Updated lobby handlers:
  - `apps/server/src/events/lobbyEvents.ts`
  - throttles `create_room`, `join_room`, `start_game` with `EVENT_THROTTLED`
  - added lightweight `set_audio_pref` event handling/logging
- Updated shoot handler to reuse shared limiter while preserving `SHOT_THROTTLED` behavior:
  - `apps/server/src/events/shootEvents.ts`

### Integration and Test Coverage Updates

- Extended lobby integration suite and made it part of integration runner:
  - `apps/server/src/events/lobbyEvents.integration.spec.ts`
  - `apps/server/src/run-integration-tests.ts`
- Extended rapid repeated host start coverage:
  - `apps/server/src/events/startGame.integration.spec.ts`
- Extended client helper tests for game-over label derivation:
  - `apps/client/src/game/MatchView.spec.ts`
- Added rate limiter assertions to server unit test entrypoint:
  - `apps/server/src/run-tests.ts`

### Documentation

- Updated `README.md` with:
  - Hebrew-first UI scope
  - audio toggle/SFX behavior
  - host play-again flow
  - lobby-control event throttling behavior

### Validation Status (This Slice)

- Passed:
  - `npm.cmd run typecheck --workspace apps/client`
  - `npm.cmd run test --workspace apps/client`
  - `npm.cmd run build --workspace apps/client`
  - `npm.cmd run typecheck --workspace apps/server`
  - `npm.cmd run test --workspace apps/server`
  - `npm.cmd run test:integration --workspace apps/server`
  - `npm.cmd run build`
- Notes:
  - Sandboxed client test/build commands intermittently fail with `spawn EPERM` (esbuild/vite process spawn restriction).
  - Commands pass when re-run outside sandbox permissions.

### Post-Execution Validation Refresh

- Re-ran full required validation sequence and all commands passed:
  - `npm.cmd run lint --workspace shared/types`
  - `npm.cmd run lint --workspace apps/server`
  - `npm.cmd run lint --workspace apps/client`
  - `npm.cmd run test --workspace shared/types`
  - `npm.cmd run test --workspace apps/server`
  - `npm.cmd run test --workspace apps/client`
  - `npm.cmd run test:integration --workspace apps/server`
  - `npm.cmd run build`
- Environment note:
  - `apps/client` test/build can fail in sandbox with `spawn EPERM`; pass when re-run unsandboxed.
