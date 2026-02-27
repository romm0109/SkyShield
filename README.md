# SkyShield

SkyShield is a mobile-first multiplayer browser game foundation. This repository currently includes an Nx-managed TypeScript monorepo scaffold with:

- `apps/server`: Socket.io room/lobby backend
- `apps/client`: Vite + React client shell
- `shared/types`: shared event and domain contracts

## Prerequisites

- Node.js LTS (recommended: Node 20+)
- npm 10+

## Setup

1. Install dependencies:

```bash
npm.cmd install
```

2. Create local env file:

```bash
copy .env.example .env
```

3. Start development servers:

```bash
npm.cmd run dev
```

- Server: `http://localhost:3000`
- Client: `http://localhost:4200`

## Workspace Commands

- `npm.cmd run dev` - run client + server in parallel via Nx
- `npm.cmd run build` - build shared types, server, and client via Nx
- `npm.cmd run lint` - run ESLint across workspace packages via Nx
- `npm.cmd run typecheck` - run TypeScript checks across workspace packages via Nx
- `npm.cmd run test` - run shared and server tests via Nx

Package-level examples:

- `npm.cmd run test --workspace shared/types`
- `npm.cmd run test --workspace apps/server`
- `npm.cmd run test:integration --workspace apps/server`
- `npx.cmd nx run server:test:integration`

## Project Structure

```txt
apps/
  client/
  server/
shared/
  types/
```

## Current MVP Foundation Scope

- Room create/join flow over Socket.io
- Hebrew-first UI across lobby/room/offline/match flows
- Lobby state sync for connected players
- Local profile persistence (`skyshield.playerName`, `skyshield.characterId`, `skyshield.audioEnabled`)
- Image-based character selection from local player assets
- Offline singleplayer route with local browser simulation (`/offline`)
- In-memory server room store (no DB)
- Authoritative server gameplay loop:
  - Meteor spawn/movement simulation
  - Player shooting with server-side validation/throttling (400ms per socket)
  - Per-player cannon slot assignment and shooter-specific projectile origin
  - Collision scoring + live leaderboard
  - City HP damage + `city_destroyed` game-over path
- Client in-match renderer (HUD + city backdrop + all players/cannons/projectiles + click/tap shooting)
- Missile sprite meteor visuals (`small_missile.png` for light, `missile.png` for heavy)
- Match SFX with on/off user toggle (shoot, hit, game-over)
- Host replay flow using existing `start_game` after game-over
- Baseline event throttling for `create_room`, `join_room`, and `start_game` in addition to `shoot`

## Known Limitations

- Rendering is lightweight DOM-based (Phaser integration is still pending)
- No persistence beyond in-memory room state
- Host handoff is basic (next connected player)
- Offline mode is singleplayer-only and uses fixed local defaults (no custom difficulty UI)

## Gameplay Controls

- Lobby page (`/`):
  - Set profile (`playerName`) and pick a character image, then create or join a room.
  - Toggle audio on/off (`skyshield.audioEnabled`) and use `Singleplayer (Offline)` for local play.
  - Successful create/join navigates to `/room/:roomCode`.
- Offline page (`/offline`):
  - Runs a full local match in-browser (countdown, shooting, score, city HP, game over).
  - Click/tap inside the playfield to shoot.
  - `Retry Match` starts a fresh 10-minute session.
- Room page (`/room/:roomCode`):
  - Shows room roster with character thumbnails and host controls.
  - Host clicks `Start Game` and can use `Play Again` after game-over.
  - During match, click/tap inside the playfield to fire at target coordinates.
  - All connected clients see every player actor/cannon, all active meteors, and all projectiles.
- Server throttling:
  - `shoot`: `400ms` between events per socket.
  - `create_room`, `join_room`, `start_game`: baseline throttle with `EVENT_THROTTLED` protection.

## Simulation Environment Variables

- `PLAYFIELD_WIDTH` (default `480`)
- `METEOR_GROUND_Y` (default `720`)
- `METEOR_SPAWN_INTERVAL_MS` (default `900`)
- `METEOR_LIGHT_SPEED` (default `130`)
- `METEOR_HEAVY_SPEED` (default `80`)
- `METEOR_LIGHT_RADIUS` (default `24`)
- `METEOR_HEAVY_RADIUS` (default `34`)
- `METEOR_HEAVY_SPAWN_EVERY` (default `4`)
- `PROJECTILE_SPEED` (default `950`)
- `PROJECTILE_RADIUS` (default `10`)
- `PROJECTILE_DESPAWN_Y` (default `-60`)

## Implementation Notes

- Event names are locked in snake_case according to PRD contracts.
- The client now includes in-game rendering with authoritative server sync; Phaser bootstrap remains intentionally deferred.
