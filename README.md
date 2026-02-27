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
- Lobby state sync for connected players
- Local profile persistence (`skyshield.playerName`, `skyshield.characterId`)
- In-memory server room store (no DB)
- Authoritative server gameplay loop:
  - Meteor spawn/movement simulation
  - Player shooting with server-side validation/throttling
  - Collision scoring + live leaderboard
  - City HP damage + `city_destroyed` game-over path
- Client in-match renderer (HUD + live playfield + click/tap shooting)

## Known Limitations

- Rendering is lightweight DOM-based (Phaser integration is still pending)
- No persistence beyond in-memory room state
- Host handoff is basic (next connected player)

## Gameplay Controls

- Lobby page (`/`):
  - Set profile (`playerName`, `characterId`), then create or join a room.
  - Successful create/join navigates to `/room/:roomCode`.
- Room page (`/room/:roomCode`):
  - Shows room roster and host controls.
  - Host clicks `Start Game`.
  - During match, click/tap inside the playfield to fire at target coordinates.
- Reload throttle is server-enforced at `400ms` between shots per socket.

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
