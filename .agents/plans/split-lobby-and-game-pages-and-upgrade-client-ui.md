# Feature: Split Lobby/Game Pages And Upgrade Client UI

The following plan should be complete, but its important that you validate documentation and codebase patterns and task sanity before you start implementing.

Pay special attention to naming of existing utils types and models. Import from the right files etc.

## Feature Description

Implement a client-side routing and UI redesign slice so SkyShield has a dedicated room/game page separate from the join/create landing page, while significantly improving visual quality and preserving current authoritative multiplayer behavior.

This feature should improve usability (clear flow), readability (separation of concerns), and product perception (higher quality interface) without changing backend contracts.

## User Story

As a player joining SkyShield from my phone
I want a clear lobby/join page and a separate game room page with a polished UI
So that room setup feels simple and gameplay feels immersive and focused.

## Problem Statement

The current client places profile setup, room join/create, and live gameplay in one component/page. This creates mixed UI states and weak visual hierarchy:
- Setup actions and in-game rendering compete for space.
- URL does not represent app state (no route separation).
- UI styling is functional but minimal compared to desired production feel.

This increases cognitive load and makes future enhancements (offline mode, reconnect UX, richer room experience) harder.

## Solution Statement

Introduce React Router in declarative mode and split client UI into route-based pages:
- `/` for landing/lobby join/create flow.
- `/room/:roomCode` for room context, waiting state, countdown, match, and results.

Refactor client state handling so socket-driven room/match state remains centralized and reusable across pages, then apply a deliberate design system refresh using CSS variables, page-level composition, and purposeful animation.

## Feature Metadata

**Feature Type**: Enhancement
**Estimated Complexity**: Medium-High
**Primary Systems Affected**: `apps/client` routing, state composition, presentation layer
**Dependencies**: `react-router` (new), existing React/Vite/Socket.IO client stack

---

## CONTEXT REFERENCES

### Relevant Codebase Files IMPORTANT: YOU MUST READ THESE FILES BEFORE IMPLEMENTING!

- `apps/client/src/main.tsx` (lines 1-15) - Current single-root mount where router provider will be introduced.
- `apps/client/src/app/App.tsx` (lines 17-137) - Current monolithic page combining connect/join/start/match rendering; split this.
- `apps/client/src/game/useMatchState.ts` (lines 24-98) - Existing socket subscription model and phase transitions to preserve.
- `apps/client/src/game/MatchView.tsx` (lines 26-113) - Authoritative in-game renderer and shoot dispatch behavior; should remain room-page owned.
- `apps/client/src/net/socket.ts` (lines 6-27) - Singleton socket/connect behavior; keep this pattern.
- `apps/client/src/styles.css` (lines 5-167) - Global visual language baseline to replace with a stronger design system.
- `apps/client/src/game/types.ts` (lines 3-30) - Match phase/data contracts consumed by UI.
- `apps/client/src/game/MatchView.spec.ts` (lines 1-12) - Current client test style (small focused unit tests).
- `apps/client/package.json` (lines 13-24) - Client dependency list (router not yet present).
- `README.md` (lines 62-87) - Current documented control flow and gameplay UX; must be updated for route split.
- `PRD.md` (lines 21, 204, 210, 391) - Product principles (minimal friction, mobile-first portrait, Hebrew-only target, avoid rule drift).

### New Files to Create

- `apps/client/src/app/router.tsx` - Central route definitions for `/` and `/room/:roomCode`.
- `apps/client/src/pages/LobbyPage.tsx` - Join/create/profile UI page.
- `apps/client/src/pages/RoomPage.tsx` - Room-centric page with waiting/countdown/in-game/game-over sections.
- `apps/client/src/app/useSessionStore.ts` - Shared client session state hook (profile + room/lobby/match snapshot coordination) or equivalent module.
- `apps/client/src/pages/NotFoundPage.tsx` - Basic fallback route for invalid paths.
- `apps/client/src/pages/page-layout.css` (or equivalent split CSS files) - Dedicated page-level styles and tokens.

### Relevant Documentation YOU SHOULD READ THESE BEFORE IMPLEMENTING!

- [React Router - Library Installation](https://reactrouter.com/start/library/installation)
  - Specific section: install + wrap with `BrowserRouter`
  - Why: this project is Vite + React and needs declarative route setup.
- [React Router - Picking a Mode](https://reactrouter.com/start/modes)
  - Specific section: Declarative mode guidance
  - Why: current app only needs URL-based navigation; no data APIs required.
- [React Router - BrowserRouter](https://reactrouter.com/api/declarative-routers/BrowserRouter)
  - Specific section: `basename`, `children`, declarative router behavior
  - Why: canonical router primitive for this client.
- [React useEffect Reference](https://react.dev/reference/react/useEffect)
  - Specific section: setup/cleanup and StrictMode caveats
  - Why: socket listeners must be registered once and cleaned up correctly.
- [Vite Static Asset Handling](https://vite.dev/guide/assets.html)
  - Specific section: asset imports and hashed production URLs
  - Why: useful for non-generic visual assets in redesigned UI.
- [MDN - CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Cascading_variables/Using_custom_properties)
  - Specific section: root-scoped tokens and `var()` usage
  - Why: design system tokens should be centralized and maintainable.
- [web.dev - Responsive Web Design Basics](https://web.dev/responsive-web-design-basics/)
  - Specific section: mobile viewport and responsive layout primitives
  - Why: PRD requires mobile-first behavior.

### Patterns to Follow

**Naming Conventions:**
- Client code uses PascalCase components and camelCase helpers (e.g., `MatchView.tsx`, `useMatchState.ts`).
- Event names remain snake_case and come from shared contracts (`shoot`, `start_game`, etc.).
- Keep new files aligned with existing domains (`app`, `game`, `net`) and add `pages` for route-level components.

**Error Handling:**
- Current UI surfaces socket errors via status string in `App.tsx` lines 30-35, 51-57.
- Preserve user-visible error feedback when splitting pages; do not swallow `error_event`.

**Socket/State Pattern:**
- Keep singleton socket (`getSocket`, `connectSocket`) from `socket.ts` lines 6-21.
- Keep listener cleanup symmetry from `useMatchState.ts` lines 72-87.

**UI Interaction Pattern:**
- Keep client shoot throttling in UI (`MatchView.tsx` lines 30-41) and rely on server throttling as final authority.

**Testing Pattern:**
- Client tests currently use Vitest with focused deterministic assertions (`MatchView.spec.ts` lines 4-11).
- Mirror this style for new utility logic; only add component tests if dependency cost is justified.

**Anti-patterns to Avoid:**
- Do not duplicate socket listener registration across multiple pages without a single owner.
- Do not mix room join/create form concerns into gameplay component tree.
- Do not introduce route-state coupling that loses room context on refresh without graceful fallback.

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

Introduce routing and split route responsibilities without changing gameplay logic.

**Tasks:**

- Add router dependency and route bootstrap.
- Create route-level pages (`LobbyPage`, `RoomPage`, `NotFoundPage`).
- Extract shared session/match state ownership into a reusable app-level hook/module.

### Phase 2: Core Implementation

Build route-driven flow and preserve existing multiplayer behavior.

**Tasks:**

- Move join/create/profile controls to `LobbyPage`.
- Move countdown/match/game-over rendering to `RoomPage`.
- Add navigation rules:
  - create/join success => navigate to `/room/:roomCode`
  - missing room context on room page => redirect to `/`
  - leaving room / disconnect fallback handling.

### Phase 3: UI Redesign (frontend-design skill)

Apply a bold, intentional visual system across both pages with mobile-first composition.

**Tasks:**

- Define CSS custom-property tokens (color, spacing, typography, elevation, motion).
- Create distinct visual identities:
  - Lobby page: onboarding + room orchestration focus.
  - Room page: gameplay command-center focus.
- Add meaningful animation (page entry, room-state transitions, status emphasis).
- Preserve performance and tap targets on small screens.

### Phase 4: Integration, Testing & Docs

Stabilize the flow and document changes.

**Tasks:**

- Verify route split does not break socket event flow.
- Add/extend tests for new routing/session utilities.
- Update README controls/flow sections.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### UPDATE `apps/client/package.json`

- **IMPLEMENT**: Add `react-router` dependency for declarative client routing.
- **PATTERN**: Existing dependency management in `apps/client/package.json:13-24`.
- **IMPORTS**: `react-router` (not `react-router-dom`, per current library docs).
- **GOTCHA**: Keep version aligned with React 19 compatibility.
- **VALIDATE**: `npm.cmd install`

### UPDATE `apps/client/src/main.tsx`

- **IMPLEMENT**: Replace direct `<App />` render with router provider composition (`BrowserRouter` + route root).
- **PATTERN**: Current strict-mode mount from `apps/client/src/main.tsx:11-15`.
- **IMPORTS**: Router primitives + route root module.
- **GOTCHA**: preserve existing global stylesheet import order.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/client`

### CREATE `apps/client/src/app/router.tsx`

- **IMPLEMENT**: Define route map for `/`, `/room/:roomCode`, and fallback route.
- **PATTERN**: Keep route-level components thin and delegate logic to hooks/pages.
- **IMPORTS**: `Routes`, `Route`, `Navigate` (or equivalent declarative APIs) from `react-router`.
- **GOTCHA**: avoid hardcoding room codes outside URL param source.
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### REFACTOR `apps/client/src/app/App.tsx`

- **IMPLEMENT**: Convert `App` into shell-only composition (router + shared providers/hooks), removing page-specific markup.
- **PATTERN**: Preserve localStorage key constants currently in `App.tsx:7-8` but relocate as needed.
- **IMPORTS**: new session store/hook and router module.
- **GOTCHA**: ensure socket connect/disconnect side effects remain single-instanced.
- **VALIDATE**: `npm.cmd run typecheck --workspace apps/client`

### CREATE `apps/client/src/app/useSessionStore.ts`

- **IMPLEMENT**: Centralize client session concerns:
  - profile read/write
  - room code/status
  - lobby snapshot
  - match state bridge from existing `useMatchState`
- **PATTERN**: listener setup/cleanup style from `useMatchState.ts:41-87`.
- **IMPORTS**: `getSocket`, `connectSocket`, shared types.
- **GOTCHA**: avoid duplicate event listener attachment between this store and page components.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### CREATE `apps/client/src/pages/LobbyPage.tsx`

- **IMPLEMENT**: Build dedicated join/create page with:
  - profile fields
  - room code input
  - create/join actions
  - status/error display
- **PATTERN**: control validation from `App.tsx:51-82`.
- **IMPORTS**: session store + navigation hook.
- **GOTCHA**: successful create/join must navigate to `/room/:roomCode` reliably for both host and guest.
- **VALIDATE**: `npm.cmd run dev --workspace apps/client`

### CREATE `apps/client/src/pages/RoomPage.tsx`

- **IMPLEMENT**: Build dedicated room/game page with:
  - room metadata and players panel
  - host-only start action
  - countdown/in-game/game-over display via `MatchView`
  - empty/invalid room guard
- **PATTERN**: current conditional phase rendering from `App.tsx:123-134`.
- **IMPORTS**: `useParams`, `Navigate` (or `useNavigate`), `MatchView`, session store.
- **GOTCHA**: if route param room does not match active session, handle deterministically (redirect or sync).
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### UPDATE `apps/client/src/game/useMatchState.ts`

- **IMPLEMENT**: Adapt hook API for route-based usage (avoid coupling to `App` local state props where unnecessary).
- **PATTERN**: preserve event handlers and cleanup from lines 44-87.
- **IMPORTS**: unchanged socket primitives + shared types.
- **GOTCHA**: maintain phase correctness when route changes during active game.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/game/MatchView.tsx`

- **IMPLEMENT**: Keep gameplay logic stable while adjusting layout contract to fit `RoomPage` composition.
- **PATTERN**: preserve `fireShot` behavior from lines 30-41 and coordinate helper exports lines 18-24.
- **IMPORTS**: unchanged, or minimal prop additions.
- **GOTCHA**: do not regress shoot clamping/throttle behavior.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `apps/client/src/styles.css` (and/or ADD page-scoped CSS files)

- **IMPLEMENT**: Apply full visual redesign:
  - CSS variables token layer
  - distinctive typography pairing (non-generic)
  - separated page layouts for lobby vs room
  - polished states, transitions, and responsive behavior
- **PATTERN**: existing mobile breakpoint style (`styles.css:159-167`) as minimum baseline.
- **IMPORTS**: assets/fonts as needed via Vite-supported paths.
- **GOTCHA**: avoid visual-only regressions that break pointer interactions in playfield.
- **VALIDATE**: `npm.cmd run build --workspace apps/client`

### CREATE `apps/client/src/pages/NotFoundPage.tsx`

- **IMPLEMENT**: Provide simple fallback route with CTA back to lobby.
- **PATTERN**: match app tone and new design language.
- **IMPORTS**: router `Link`.
- **GOTCHA**: keep this page lightweight; no socket side effects.
- **VALIDATE**: `npm.cmd run dev --workspace apps/client`

### UPDATE `apps/client/src/game/MatchView.spec.ts`

- **IMPLEMENT**: Keep existing coordinate assertions and add coverage for any new pure helpers introduced in this feature.
- **PATTERN**: current Vitest style in `MatchView.spec.ts:1-12`.
- **IMPORTS**: new helper exports only (avoid brittle DOM snapshots unless adding RTL intentionally).
- **GOTCHA**: tests should remain deterministic and fast.
- **VALIDATE**: `npm.cmd run test --workspace apps/client`

### UPDATE `README.md`

- **IMPLEMENT**: Document new route flow and UX expectations:
  - Lobby page at `/`
  - Room/game page at `/room/:roomCode`
  - revised control flow for host and guest
- **PATTERN**: concise command-driven README style (`README.md:37-50`, `81-87`).
- **IMPORTS**: none.
- **GOTCHA**: keep claims consistent with implemented scope only.
- **VALIDATE**: `Get-Content README.md`

---

## TESTING STRATEGY

### Unit Tests

- Preserve existing helper tests (`toPercentX`, `toPercentY`).
- Add tests for any extracted pure route/session utilities (e.g., room-code normalization, route derivation).
- If adding component tests, use minimal deterministic assertions for navigation intent and conditional rendering.

### Integration Tests

- Manual browser integration is primary for this slice (client routing + live socket events):
  - tab A host create room
  - tab B join same room
  - both land in `/room/:code`
  - host starts; both see countdown and in-game state

### Edge Cases

- User opens `/room/AB12` directly without active session.
- Room code in URL differs from active socket room.
- Disconnection while on room page.
- Non-host attempts start from room page.
- Game-over transition while user navigates back/forward browser history.
- Mobile viewport below 360px width.

---

## VALIDATION COMMANDS

Execute every command to ensure zero regressions and 100% feature correctness.

### Level 1: Syntax & Style

- `npm.cmd run lint --workspace apps/client`

### Level 2: Unit Tests

- `npm.cmd run test --workspace apps/client`

### Level 3: Type + Build

- `npm.cmd run typecheck --workspace apps/client`
- `npm.cmd run build --workspace apps/client`

### Level 4: Workspace Regression

- `npm.cmd run test`
- `npm.cmd run build`

### Level 5: Manual Validation

1. Run stack: `npm.cmd run dev`.
2. Open `http://localhost:4200/` and verify lobby page only (no match playfield).
3. Create room and confirm redirect to `/room/<CODE>`.
4. Join same room from second tab and confirm both users in room page.
5. Start game as host; verify countdown and live game render remains functional.
6. Attempt `start_game` as guest and verify visible error status.
7. Reload room page and verify graceful fallback behavior (redirect or recover path as designed).
8. Validate layout on mobile viewport (Chrome devtools: 390x844 and 360x640).

### Level 6: Additional Validation (Optional)

- `npx.cmd nx run client:test`
- `npx.cmd nx run client:build`

---

## ACCEPTANCE CRITERIA

- [ ] Join/create UI is isolated to lobby route (`/`).
- [ ] Gameplay/room experience is isolated to room route (`/room/:roomCode`).
- [ ] Route transitions happen automatically after successful create/join.
- [ ] Existing authoritative gameplay behavior remains intact (countdown, shoot, leaderboard, game over).
- [ ] UI is materially improved with a cohesive design system and responsive layout.
- [ ] Socket listeners are cleaned up correctly and not duplicated.
- [ ] All client lint/test/typecheck/build validations pass.
- [ ] README documents the updated page flow.

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

- `CLAUDE.md` and repo-local `AGENTS.md` were not found in this workspace; rely on existing project patterns and root instructions.
- Keep event contracts unchanged (`shared/types`) for this feature; scope is client routing/UI only.
- Preserve mobile-first priority from PRD and avoid visual choices that reduce gameplay readability.
- If route refresh persistence is postponed, explicitly document current fallback behavior as an MVP limitation.

**Confidence Score**: 9/10 for one-pass implementation success.
