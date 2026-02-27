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

## Known Limitations

- No gameplay loop or Phaser scenes yet
- No persistence beyond in-memory room state
- Host handoff is basic (next connected player)

## Implementation Notes

- Event names are locked in snake_case according to PRD contracts.
- The client currently includes a UI shell and networking baseline; Phaser bootstrap is intentionally deferred.
