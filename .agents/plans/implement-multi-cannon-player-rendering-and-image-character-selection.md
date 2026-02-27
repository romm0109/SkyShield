# Feature: Implement Multi-Cannon Player Rendering And Image Character Selection

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Upgrade SkyShield match presentation from a single center-origin cannon to a true multiplayer visual layout where every client sees all players, each player's cannon, and each player-owned shots. At the same time, replace free-text `characterId` input with image-based character selection from local assets and render character sprites in both lobby and in-match scenes. Add city background asset usage and improved meteor visuals.

This is not only a UI polish task: server simulation must expose per-player cannon origins so projectile paths and ownership visuals are coherent for all clients.

## User Story

As a player in a multiplayer room  
I want to see every participant with their own cannon, character, and shots  
So that gameplay feels truly multiplayer and visually readable instead of centered around one shared cannon

## Problem Statement

Current simulation always spawns projectiles from playfield center (`simulation.ts:86-110`), and current client renders no players/cannons at all (`MatchView.tsx:63-96`). This makes multiplayer feel abstract and visually confusing. Lobby profile setup is also text-based for character selection (`LobbyPage.tsx:46-53`), while actual player image assets already exist in the repo.

## Solution Statement

Introduce authoritative per-player cannon slots in shared/server state, update simulation to spawn projectiles from each shooter's slot, and expose slot snapshots in `game_state`. On the client, render player+cannon actors at those slots and style projectiles by owner. Replace character text input with an image-based picker and use `city.png` as in-match background layer. Keep all anti-cheat and timing rules server-authoritative.

## Feature Metadata

**Feature Type**: Enhancement  
**Estimated Complexity**: High  
**Primary Systems Affected**: `shared/types`, `apps/server` simulation/lifecycle/events, `apps/client` session/lobby/match rendering/styles  
**Dependencies**: Socket.IO 4.8.x, React 19, React Router 7, Vite 7 static asset pipeline

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `apps/server/src/game-loop/simulation.ts` (lines 79-121, 130-260) - Core simulation step and current center-origin projectile spawn; must be generalized to per-player origins.
- `apps/server/src/game-loop/matchLifecycle.ts` (lines 159-185, 202-259) - Match initialization, shot queue processing, and `game_state` emission path to extend with player slot snapshots.
- `apps/server/src/rooms/roomStore.ts` (lines 64-111, 140-208) - Room/player lifecycle and host logic; stable place to maintain deterministic slot assignment helpers.
- `shared/types/src/models.ts` (lines 5-79) - Canonical shared model surface; currently lacks player position/slot model.
- `shared/types/src/events.ts` (lines 40-67, 122-147) - `game_state` payload and runtime guard conventions.
- `apps/server/src/events/shootEvents.ts` (lines 22-76) - Shoot validation + 400ms throttle; keep behavior while feeding per-player projectile origins.
- `apps/server/src/main.ts` (lines 34-58) - Event registration and disconnect broadcast behavior; maintain compatibility when slot state changes.
- `apps/server/src/game-loop/simulation.spec.ts` (lines 49-134) - Deterministic simulation test style to mirror for per-player origin tests.
- `apps/server/src/events/shootEvents.integration.spec.ts` (lines 85-113) - Socket integration style verifying shoot->hit->leaderboard path.
- `apps/client/src/game/MatchView.tsx` (lines 14-24, 63-96) - Current playfield rendering and shooting interaction; primary UI integration point.
- `apps/client/src/app/useSessionStore.ts` (lines 18-29, 96-131) - Profile persistence/validation and create/join emit path.
- `apps/client/src/pages/LobbyPage.tsx` (lines 37-53, 84-88) - Current text-based character selection and lobby list display.
- `apps/client/src/styles.css` (lines 144-199) - Existing playfield/meteor/projectile styles to evolve into layered city+cannon+player scene.
- `apps/client/src/game/MatchView.spec.ts` (lines 5-19) - Existing focused client test style for pure helpers.
- `apps/server/src/config/env.ts` (lines 1-19, 67-147) - Env parsing pattern and authoritative constants.
- `README.md` (lines 62-90, 106-109) - Current MVP scope/controls/contracts to update after implementation.
- `package.json` (lines 10-15), `apps/client/package.json` (lines 7-12), `apps/server/package.json` (lines 7-13) - Non-interactive validation entrypoints.

### New Files to Create

- `apps/client/src/game/characters.ts` - Character catalog mapped to local player assets (`id`, `label`, `imageSrc`, validation helpers).
- `apps/client/src/game/playerVisuals.ts` - Pure helpers for slot->screen mapping and actor rendering metadata.
- `apps/server/src/game-loop/playerSlots.ts` - Deterministic slot assignment/normalization utilities used by room store + simulation.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [Socket.IO Rooms](https://socket.io/docs/v4/rooms/)
  - Specific section: room-scoped broadcasting and server-only room concept.
  - Why: keep match state/events isolated per room while rendering all players.
- [Socket.IO TypeScript](https://socket.io/docs/v4/typescript/)
  - Specific section: typed event interfaces and reminder that typing does not replace runtime validation.
  - Why: extend contracts safely and preserve validation discipline.
- [Socket.IO Testing](https://socket.io/docs/v4/testing/)
  - Specific section: in-process server/client test harness and `waitFor` pattern.
  - Why: mirrors existing integration test architecture.
- [Socket.IO Delivery Guarantees](https://socket.io/docs/v4/delivery-guarantees/)
  - Specific section: message ordering + at-most-once arrival defaults.
  - Why: informs client rendering assumptions for transient packet loss.
- [React Router - Picking a Mode](https://reactrouter.com/start/modes)
  - Specific section: declarative mode guidance.
  - Why: ensure UI changes stay compatible with current declarative routing setup.
- [React Router - BrowserRouter](https://reactrouter.com/api/declarative-routers/BrowserRouter)
  - Specific section: declarative router behavior.
  - Why: confirms existing route architecture constraints while adding richer UI.
- [Vite Static Asset Handling](https://vite.dev/guide/assets.html)
  - Specific section: importing static assets as URLs and hashing behavior.
  - Why: character/city image imports should follow build-safe asset patterns.
- [Node.js Test Runner](https://nodejs.org/api/test.html)
  - Specific section: mock timers APIs.
  - Why: deterministic lifecycle/simulation tests when validating timing-sensitive gameplay paths.

### Patterns to Follow

**Naming Conventions:**
- Socket events remain snake_case (`shared/types/src/events.ts:32-67`).
- TS interfaces/types in PascalCase (`shared/types/src/models.ts:5-79`).
- Module files lower camel case in current server/client domains (`roomStore.ts`, `matchLifecycle.ts`, `useSessionStore.ts`).

**Error Handling:**
- Guard + early return + `error_event` emission pattern (`apps/server/src/events/lobbyEvents.ts:30-34`, `60-64`, `99-103`; `shootEvents.ts:29-56`).
- Keep runtime guard philosophy in shared contracts (`shared/types/src/events.ts:83-147`).

**Logging Pattern:**
- Structured JSON logs only (`apps/server/src/main.ts:35, 42-44, 62-68`; `shootEvents.ts:66-74`; `lobbyEvents.ts:49-51, 83, 92, 133`).

**Other Relevant Patterns:**
- Authoritative simulation in server tick; client is renderer/input sender (`matchLifecycle.ts:202-259`).
- Room-scoped lifecycle ownership and cleanup (`matchLifecycle.ts:106-124`, `188-243`).
- Existing shoot throttle fixed at 400ms and must remain server-enforced (`shootEvents.ts:12, 52-56`).
- Current PRD/README contract: event names locked, Phaser deferred (`README.md:77, 108-109`).

**Anti-patterns to Avoid:**
- Do not compute projectile origins on client.
- Do not keep center-origin fallback for multiplayer once per-player slots are introduced.
- Do not duplicate character-id mapping logic across multiple components.
- Do not couple visual actor order to non-deterministic `Map` iteration without explicit normalization.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Introduce canonical player slot and character catalog models.

**Tasks:**
- Extend shared models/events for player slot snapshots in `game_state`.
- Add deterministic slot utility on server (stable order and x positions).
- Add client character catalog utility based on existing asset files.

### Phase 2: Core Implementation

Implement authoritative per-player cannon origins in simulation and propagate through lifecycle.

**Tasks:**
- Assign/refresh slots on create/join/remove paths.
- Update projectile spawn origin from shooter slot, not center.
- Emit slot snapshots in each `game_state`.
- Preserve existing scoring/hit/city HP logic.

### Phase 3: Client Rendering & UX

Render all actors and replace text character input with image picker.

**Tasks:**
- Build image-based character selector in lobby.
- Display character thumbnails in lobby/room lists.
- Render city background, per-player cannons, per-player characters, and projectile ownership visuals in match.
- Keep pointer shooting UX intact and mobile-friendly.

### Phase 4: Testing & Validation

Add deterministic unit/integration coverage for new slot-origin behavior and UI helper logic.

**Tasks:**
- Server unit tests for slot assignment and origin correctness.
- Server integration tests for multi-player shot origins and visibility data in `game_state`.
- Client tests for character catalog/selection and helper mappings.
- Run workspace and manual multiplayer validations.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE `shared/types/src/models.ts`

- **IMPLEMENT**: Add `PlayerSlotState` model (for example: `playerId`, `x`, `y`, optional `lane`) and include `playerSlots` (or equivalent) in `MatchRuntimeState`.
- **PATTERN**: Interface-first model style from `shared/types/src/models.ts:5-79`.
- **IMPORTS**: Keep model-only, no server dependencies.
- **GOTCHA**: Slot payload must be stable and minimal; avoid leaking server internals.
- **VALIDATE**: `npm.cmd run build --workspace shared/types`

### UPDATE `shared/types/src/events.ts`

- **IMPLEMENT**: Extend `game_state` payload type to include `playerSlots` (or chosen canonical name).
- **PATTERN**: Existing strongly typed event surface (`shared/types/src/events.ts:40-67`).
- **IMPORTS**: New model type from `models.ts`.
- **GOTCHA**: Preserve event names and existing fields to avoid client/server breakage.
- **VALIDATE**: `npm.cmd run test --workspace shared/types`

### CREATE `apps/server/src/game-loop/playerSlots.ts`

- **IMPLEMENT**: Deterministic slot calculation helpers:
  - assign slot order from room players,
  - compute normalized bottom-line x positions with padding,
  - expose utility to fetch cannon origin for a `playerId`.
- **PATTERN**: Pure utility style similar to simulation helper decomposition (`simulation.ts:46-121`).
- **IMPORTS**: shared types + local config constants only.
- **GOTCHA**: Keep output deterministic across clients and reconnects; no random positions.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/server`

### UPDATE `apps/server/src/rooms/roomStore.ts`

- **IMPLEMENT**: Maintain slot state in room/match lifecycle on create, join, and remove; provide helper to rebuild slots after membership changes.
- **PATTERN**: Existing mutation helper style (`roomStore.ts:157-208`).
- **IMPORTS**: slot utility + shared slot model.
- **GOTCHA**: Preserve host handoff logic (`roomStore.ts:125-132`) and avoid stale slots.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### UPDATE `apps/server/src/game-loop/matchLifecycle.ts`

- **IMPLEMENT**: Initialize/reset slots when match starts and include slot snapshot in `game_state` emission.
- **PATTERN**: Match init + emit flow (`matchLifecycle.ts:159-185`, `245-258`).
- **IMPORTS**: slot utility.
- **GOTCHA**: Ensure countdown/in_game/game_over transitions keep slot data coherent.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### UPDATE `apps/server/src/game-loop/simulation.ts`

- **IMPLEMENT**: Replace fixed center-origin projectile spawn (`simulation.ts:86-110`) with shooter-specific origin from slot map.
- **PATTERN**: Keep deterministic step function contract (`simulation.ts:130-260`).
- **IMPORTS**: slot utility or precomputed origin lookup injected from lifecycle.
- **GOTCHA**: Preserve collision and scoring behavior (`190-209`) and projectile despawn filters (`221-226`).
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### UPDATE `apps/server/src/game-loop/simulation.spec.ts`

- **IMPLEMENT**: Add tests proving two different shooters spawn from different origins and both can score correctly.
- **PATTERN**: Existing `node:test` + strict assert style (`simulation.spec.ts:49-148`).
- **IMPORTS**: new slot helpers if needed.
- **GOTCHA**: Avoid flaky time assumptions; keep deterministic coordinates.
- **VALIDATE**: `npm.cmd run test --workspace apps/server`

### UPDATE `apps/server/src/events/shootEvents.integration.spec.ts`

- **IMPLEMENT**: Add multi-client scenario asserting `game_state.playerSlots` exists and shot ownership/origin behavior reflects different shooters.
- **PATTERN**: Existing `onceWithTimeout` harness style (`shootEvents.integration.spec.ts:11-23`, `85-113`).
- **IMPORTS**: none beyond current harness additions.
- **GOTCHA**: Keep test timeouts bounded and deterministic.
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

### CREATE `apps/client/src/game/characters.ts`

- **IMPLEMENT**: Centralized character registry from `apps/client/src/assets/players/*.png`, with:
  - list of selectable options,
  - default id,
  - `isValidCharacterId`,
  - `getCharacterById`.
- **PATTERN**: Small pure helper module pattern used in client game domain.
- **IMPORTS**: static asset imports (Vite asset handling).
- **GOTCHA**: Single source of truth; do not hardcode IDs in multiple components.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/client`

### CREATE `apps/client/src/game/playerVisuals.ts`

- **IMPLEMENT**: Pure helpers to map slot coordinates to render CSS positions and optional owner-based projectile classes/colors.
- **PATTERN**: Similar pure helper testing approach as `toPercentX`/`toPercentY` (`MatchView.tsx:18-24`, `MatchView.spec.ts:5-12`).
- **IMPORTS**: shared types only.
- **GOTCHA**: Keep helpers presentation-only; no socket side effects.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/app/useSessionStore.ts`

- **IMPLEMENT**: Validate selected character against registry and default gracefully when localStorage has invalid id.
- **PATTERN**: Existing profile persistence flow (`useSessionStore.ts:18-29`, `96-131`).
- **IMPORTS**: `characters.ts` helpers.
- **GOTCHA**: Keep create/join payload contract unchanged (`characterId` stays string).
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/pages/LobbyPage.tsx`

- **IMPLEMENT**: Replace character text input with image card selector UI and selected-state affordance.
- **PATTERN**: Existing controlled inputs + session actions (`LobbyPage.tsx:37-71`).
- **IMPORTS**: `CHARACTER_OPTIONS` from `characters.ts`.
- **GOTCHA**: Maintain keyboard/touch usability and preserve room create/join flow.
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### UPDATE `apps/client/src/pages/RoomPage.tsx`

- **IMPLEMENT**: Enhance roster display with character thumbnails (using `characterId` lookup).
- **PATTERN**: Existing room roster render (`RoomPage.tsx` players list section).
- **IMPORTS**: `getCharacterById`.
- **GOTCHA**: Handle unknown ids defensively.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/game/MatchView.tsx`

- **IMPLEMENT**: Render layered scene:
  - city background from `assets/city.png`,
  - all player actors (character + cannon) from `game_state.playerSlots`,
  - meteors redesign visuals,
  - projectiles with owner-specific styles.
- **PATTERN**: Keep shoot emit path unchanged (`MatchView.tsx:30-41`) and maintain coordinate clamping.
- **IMPORTS**: `playerVisuals.ts`, `characters.ts`, city asset import.
- **GOTCHA**: Do not break pointer input hit area; keep z-index ordering deterministic.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/styles.css` and `apps/client/src/pages/page-layout.css`

- **IMPLEMENT**: Add styles for:
  - character picker grid/cards,
  - city layer,
  - cannon and player actor components,
  - richer meteor appearance and owner-tinted projectile effects.
- **PATTERN**: Existing tokenized design system (`styles.css:4-25`) and playfield block (`144-199`).
- **IMPORTS**: none.
- **GOTCHA**: Keep mobile layout resilient (`styles.css:228-241`).
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### UPDATE `apps/client/src/game/MatchView.spec.ts`

- **IMPLEMENT**: Add tests for any new pure helpers (slot-to-percent mapping, owner class mapping, etc.).
- **PATTERN**: Existing focused helper test style (`MatchView.spec.ts:1-19`).
- **IMPORTS**: helper exports only.
- **GOTCHA**: Avoid brittle DOM snapshot tests unless necessary.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/server/src/run-integration-tests.ts` (if needed)

- **IMPLEMENT**: Ensure any new integration suites are imported/executed.
- **PATTERN**: Explicit suite runner imports (`run-integration-tests.ts:1-7`).
- **IMPORTS**: new suite modules.
- **GOTCHA**: Keep CI contract stable (`test:integration` should still be single command).
- **VALIDATE**: `npm.cmd run test:integration --workspace apps/server`

### UPDATE `README.md`

- **IMPLEMENT**: Document:
  - image-based character selection,
  - multiplayer actor rendering (all players/cannons/shots visible),
  - city background + updated visuals,
  - any new env config knobs if introduced.
- **PATTERN**: concise command-oriented style (`README.md:37-50`, `81-90`, `92-109`).
- **IMPORTS**: none.
- **GOTCHA**: Keep claims aligned with actual implementation (no offline/Phaser claims beyond current state).
- **VALIDATE**: `Get-Content README.md`

---

## TESTING STRATEGY

### Unit Tests

- `shared/types`: updated model/event contract compile/test coverage.
- `apps/server/game-loop`: slot-origin spawn tests and no-regression collision/score tests.
- `apps/client/game`: pure helper tests for slot/actor visual mapping and character lookup validation.

### Integration Tests

- Server integration room with at least 2 clients:
  - both in same room and started game,
  - each fires and receives shared `game_state` with both players visible,
  - projectile ownership/origin differentiation verified through payload dynamics.

### Edge Cases

- 1-player room still renders one cannon/actor correctly.
- Player leaves mid-match: slots compact or remain stable by chosen design without crashes.
- Host leaves: handoff occurs and actor visibility remains valid.
- Invalid `characterId` in localStorage falls back to default.
- More players (up to max) maintain non-overlapping slot layout on mobile widths.
- Rapid shoot events still throttle per socket at 400ms.
- Out-of-order packet arrival assumptions remain safe (at-most-once transport semantics).

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

### Level 4: Type + Build Validation

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

1. Run full stack: `npm.cmd run dev`.
2. Open two browser clients at `http://localhost:4200`.
3. In lobby, select different character images for each client.
4. Create/join same room and verify roster shows character thumbnails.
5. Host starts game; verify city background, visible cannons, and visible player sprites for all participants.
6. Fire from both clients; verify each client sees both shot streams and ownership-consistent visuals.
7. Verify meteors look improved and remain hit-detectable.
8. Disconnect one client during match and verify server stability + remaining actor rendering sanity.

### Level 7: Additional Validation (Optional)

- `npx.cmd nx run server:test:integration`
- `npx.cmd nx run client:test`

---

## ACCEPTANCE CRITERIA

- [ ] Character selection in lobby is image-based (no free-text character input).
- [ ] Selected character persists and is used in room/match visuals.
- [ ] `game_state` includes authoritative per-player slot/cannon positions.
- [ ] Projectiles originate from shooter-specific positions, not global center.
- [ ] Every client sees all players, all cannons, and all active shots.
- [ ] City background asset is rendered behind gameplay layers.
- [ ] Meteor visuals are improved without breaking collision behavior.
- [ ] Existing server authoritative rules (validation/throttle/scoring/game-over) remain intact.
- [ ] All validation commands pass with zero errors.
- [ ] README reflects the new UX and behavior.

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

- No repo-local `CLAUDE.md` or `AGENTS.md` was found inside this worktree; follow existing project patterns and this plan.
- Current Hebrew error strings display as mojibake in some terminals; preserve source encoding when editing.
- Recommended slot layout assumption for first pass: bottom-line evenly spaced cannons with fixed y and deterministic x by sorted join order.
- Keep Phaser out of scope for this slice (README explicitly states deferred integration).

**Confidence Score**: 8.5/10 for one-pass implementation success.
