# Sky Shield - Product Requirements Document (PRD)

Version: v1.0 (MVP Locked)  
Status: Draft for Build  
Owner: Product/Founder

## 1. Executive Summary
Sky Shield is a real-time multiplayer mobile web arcade game designed for short, shared sessions where players are physically together. Players join a room with a code, choose a local profile (name + character), and play a 10-minute match where they compete for score while jointly defending a city from incoming meteors.

The core value proposition is competitive-cooperative tension: each player wants to top the leaderboard, but all players lose immediately if city health reaches zero. Gameplay is intentionally simple (tap to shoot), instantly understandable, and replayable through escalating intensity and slight randomness.

The MVP goal is to deliver a stable, mobile-first browser game for up to 8 players per room with no database, no accounts, and a thin server-authoritative real-time loop, plus an offline singleplayer mode for no-network situations.

## 2. Mission
### Mission Statement
Create an accessible, social, civil-defense-themed arcade experience that is fast to start, easy to understand, and engaging for a full 10-minute session on mobile browsers.

### Core Principles
1. Learn in 5 seconds, master over 10 minutes.
2. Competition with shared consequences.
3. Minimal friction: no install, no login, fast room join.
4. Low visual and UX complexity for high-stress contexts.
5. MVP first: reliability and clarity over feature breadth.

## 3. Target Users
### Primary User Personas
1. Group Organizer (Host)
- Creates room, shares code, starts game.
- Needs fast setup and clear lobby state.
2. Casual Participant (Player)
- Joins by code, plays with simple controls.
- Needs responsive controls and clear score feedback.

### Technical Comfort
- Broad range: low to medium technical comfort.
- Must work for users familiar only with standard mobile web usage.

### Key Needs and Pain Points
- Need immediate access without app installation.
- Need simple onboarding and clear rules.
- Need stable multiplayer behavior on variable mobile networks.
- Need short-session entertainment with social interaction.

## 4. MVP Scope
### Core Functionality
- ✅ Mobile browser gameplay in portrait orientation.
- ✅ Offline singleplayer mode (no network required).
- ✅ Room creation and room-code join flow.
- ✅ Host-controlled game start.
- ✅ 10-minute hard match timer.
- ✅ Shared city HP with instant loss at 0 HP.
- ✅ Real-time leaderboard during match (rank + score).
- ✅ End screen with win/lose, ranking, and accuracy.
- ✅ Local profile setup: player name + character selection.
- ✅ Persist profile in localStorage (`name`, `characterId`).

### Technical
- ✅ Server-authoritative simulation (meteors, collisions, score, HP, timer).
- ✅ WebSocket real-time sync.
- ✅ Local shot prediction on client for responsiveness.
- ✅ In-memory room/game state only (no database).
- ✅ Up to 8 players per room.

### Integration
- ✅ Minimal sound effects.
- ❌ Third-party authentication.
- ❌ External analytics platform integration.

### Deployment
- ✅ Single lightweight backend service.
- ✅ Static frontend hosting.
- ❌ Multi-region infrastructure in MVP.
- ❌ Persistent storage/backup in MVP.

### Out of Scope (Deferred)
- ❌ Roles/classes.
- ❌ Power-ups and combos.
- ❌ Cosmetics/skins system.
- ❌ Matchmaking.
- ❌ Accounts/login/progression.
- ❌ Reconnect state restoration.
- ❌ Anti-abuse hardening beyond basic checks.
- ❌ Accessibility enhancements beyond baseline mobile usability.

## 5. User Stories
1. As a host, I want to create a room and get a short code, so that nearby players can join quickly.  
Example: Host taps "Create Room", receives `A7K2`, shares verbally.

2. As a player, I want to enter my name and choose a character once, so that my identity appears in game without repeated setup.  
Example: User selects `char_02`, enters Hebrew display name, auto-filled next session via localStorage.

3. As a player, I want to join with a room code from my phone browser, so that I can start playing without installation.  
Example: User enters `A7K2`, joins lobby in under 10 seconds.

4. As a player without internet access, I want to start a solo offline session, so that I can still play when network is unavailable.  
Example: User taps "משחק יחיד (אופליין)" and runs a full local 10-minute match.

5. As a player, I want simple tap controls, so that I can focus on fast reactions.  
Example: Tap playfield, cannon visibly aims then fires after reload gating.

6. As a competitive player, I want points for meteor interceptions, so that I can try to rank first.  
Example: Fast meteor kill gives +2 and leaderboard updates in near real-time.

7. As a cooperative player, I want visible shared city HP, so that I know when to prioritize defense over score-chasing.  
Example: HP drops near zero and team behavior shifts to survival.

8. As a group, we want an immediate lose condition if city HP reaches zero, so that stakes feel clear and meaningful.  
Example: Final meteor hit ends match instantly, then results screen.

9. As a returning player, I want "Play Again" flow from end screen, so that sessions can repeat with low friction.  
Example: Same room group restarts quickly.

## 6. Core Architecture & Patterns
### High-Level Approach
- Client-server real-time architecture.
- Backend is authoritative for all game-critical state.
- Client renders state and performs local shot prediction.
- Separate offline simulation mode runs fully on client when singleplayer is selected.

### Proposed Directory Structure
```txt
sky-shield/
  apps/
    client/
      src/
        game/
        ui/
        net/
        i18n/
    server/
      src/
        rooms/
        game-loop/
        events/
        models/
  shared/
    types/
  PRD.md
```

### Key Design Patterns
- Authoritative simulation loop on server tick.
- Event-driven networking via Socket.io events.
- Room-scoped state containers in memory.
- Deterministic core rules with bounded random spawn variation.
- Config-driven balancing values (HP, spawn intervals, speeds).

## 7. Tools/Features
### Feature 1: Profile Setup (Local)
- Inputs: `displayName`, `characterId`.
- Validation: required, trimmed, 2-16 chars for name.
- Persistence keys:
  - `skyshield.playerName`
  - `skyshield.characterId`
- Behavior: auto-load on next visit, editable before join.

### Feature 2: Room & Lobby
- Create room (host).
- Join via 4-6 character code.
- Lobby shows players and chosen character placeholders.
- Host-only Start control.
- If host disconnects before/during match, assign new host automatically.

### Feature 2B: Offline Singleplayer
- Entry option from landing screen: "Singleplayer (Offline)".
- No socket connection required.
- Same core rules: 10-minute timer, city HP, meteor types, scoring.
- Leaderboard replaced with local solo score panel.
- End screen shows solo stats (score, shots, hits, accuracy).

### Feature 3: Core Gameplay
- Match duration fixed at 10:00.
- Cannon at bottom with visible aim behavior.
- Reload interval: 400ms.
- Unlimited ammo.
- Shared meteor field for all players.
- Meteor types:
  - Normal: 1 HP, +1 point.
  - Fast: smaller/faster, +2 points.
  - Heavy: 2 HP, slower, +2 points.
- Heavy scoring rule: last hit gets points.

### Feature 4: Shared Failure System
- City HP starts at 20.
- Each meteor ground hit: HP -1.
- HP reaches 0 => immediate game over (loss).
- Timer reaches 0 with HP > 0 => win.

### Feature 5: Scoring & Stats
- Per-player metrics:
  - Score
  - Shots
  - Hits
  - Accuracy % (`hits / shots`)
- Accuracy counts only meteor hits.
- Miss penalty disabled in MVP.

### Feature 6: Difficulty Scaling
- Ramp by spawn rate, concurrent count, speed mix.
- Slight per-room randomness for replayability.
- No new mechanics introduced mid-match.

### Feature 7: UI/UX
- Portrait mobile layout.
- Top: HP bar + timer.
- Center: playfield.
- Bottom: cannon + player score.
- Small leaderboard panel (rank + score).
- Visual style: dark background, bright readable meteors.
- Language: Hebrew only.
- Audio: minimal SFX with simple on/off setting.
- Tone: civil defense (not militaristic gamification language).

## 8. Technology Stack
### Frontend
- TypeScript
- Phaser 3 (canvas rendering)
- Socket.io client
- Mobile-first CSS layout

### Backend
- Node.js (LTS)
- TypeScript
- Socket.io
- In-memory state containers (no DB, no Redis in MVP)

### Shared
- Shared TypeScript contracts for socket payloads/events.

### Optional (Post-MVP)
- Redis adapter for horizontal scaling.
- Observability tooling (metrics/dashboard).

## 9. Security & Configuration
### Auth/Authz
- No accounts/authentication in MVP.
- Session identity is room membership + socket connection.
- Offline singleplayer requires no session identity.

### Configuration
- Environment variables:
  - `PORT`
  - `CLIENT_ORIGIN`
  - `MAX_PLAYERS_PER_ROOM` (default 8)
  - `MATCH_DURATION_SECONDS` (default 600)
  - `CITY_HP_DEFAULT` (default 20)
  - `TICK_RATE_HZ` (default 20-30)

### Security Scope
- In scope:
  - Input validation for room code, name, characterId.
  - Server-side rule enforcement (anti-cheat baseline).
  - Basic rate limiting for socket event spam.
- Out of scope:
  - Account-level security.
  - Advanced anti-bot/anti-DDoS systems.

### Deployment Considerations
- Stateless server process except in-memory room state.
- Server restart clears active rooms (accepted for MVP).

## 10. API Specification
MVP uses Socket.io events instead of REST as primary game API.
Offline singleplayer bypasses network API and uses local game loop only.

### Client -> Server Events
```ts
create_room: { playerName: string; characterId: string }
join_room: { roomCode: string; playerName: string; characterId: string }
start_game: { roomCode: string }
shoot: { roomCode: string; targetX: number; targetY: number; clientTs: number }
set_audio_pref: { enabled: boolean } // optional client preference only
```

### Server -> Client Events
```ts
room_created: { roomCode: string; hostSocketId: string }
lobby_state: {
  roomCode: string;
  hostSocketId: string;
  players: Array<{ id: string; playerName: string; characterId: string; score: number }>;
}
game_countdown: { seconds: number } // 3..1
game_state: {
  remainingSeconds: number;
  cityHp: number;
  meteors: MeteorState[];
  projectiles: ProjectileState[];
  leaderboard: Array<{ id: string; playerName: string; score: number; rank: number }>;
}
hit_confirmed: { meteorId: string; byPlayerId: string; points: number }
game_over: {
  result: "win" | "lose";
  reason: "timer_complete" | "city_destroyed";
  finalLeaderboard: Array<{ playerName: string; characterId: string; score: number; accuracy: number }>;
}
error_event: { code: string; messageHe: string }
```

### Server Rules
- Server is source of truth for collisions, scoring, HP, timer.
- Client prediction is cosmetic; server reconciliation is final.

## 11. Success Criteria
### MVP Success Definition
Players can reliably play either multiplayer (room-based) or offline singleplayer on mobile, with responsive controls and clear 10-minute match outcomes.

### Functional Requirements
- ✅ Room creation and join work on mobile browsers.
- ✅ Up to 8 players can play in one room.
- ✅ Offline singleplayer can start and complete without network.
- ✅ Match starts only by host.
- ✅ Match lasts exactly 10 minutes unless instant-loss triggered.
- ✅ Server-authoritative scoring and HP.
- ✅ Local profile persists across sessions.
- ✅ Hebrew-only interface in all core flows.

### Quality Indicators
- Client rendering targets 60 FPS on mid-range mobile devices.
- Server tick stable at 20-30 Hz.
- Gameplay remains usable with up to ~200ms latency.

### UX Goals
- Join-to-play time under 30 seconds for returning users.
- Rules understood without tutorial text overload.

## 12. Implementation Phases
### Phase 1 (Week 1): Foundations
Goal: Establish project skeleton and networking baseline.
- ✅ Setup client/server TypeScript projects.
- ✅ Define shared socket event contracts.
- ✅ Implement room create/join and lobby sync.
- ✅ Implement localStorage profile flow.
- ✅ Add landing-mode selection (multiplayer vs offline singleplayer).
Validation:
- 2+ devices can enter same lobby with visible names/characters; offline mode enters local game without socket.

### Phase 2 (Week 2): Core Gameplay Loop
Goal: Deliver playable end-to-end match.
- ✅ Server game loop (timer, city HP, meteor spawning).
- ✅ Client rendering (playfield, cannon, meteors, projectiles).
- ✅ Shooting with 400ms reload + visible aim.
- ✅ Hit detection, scoring, leaderboard.
- ✅ Offline singleplayer game loop parity with multiplayer rules.
Validation:
- Full 10-minute match completes with valid win/lose conditions in both multiplayer and offline modes.

### Phase 3 (Week 3): Balancing & UX Polish
Goal: Make gameplay stable and readable.
- ✅ Difficulty ramp with slight randomness.
- ✅ Hebrew UI pass for all core screens.
- ✅ Minimal SFX and toggle.
- ✅ End screen with stats and play again.
Validation:
- Internal playtests confirm clarity and replayability.

### Phase 4 (Week 4): Stabilization & Launch Readiness
Goal: Harden MVP for small live usage.
- ✅ Basic input/rate validation.
- ✅ Crash/edge-case handling (host handoff, empty rooms).
- ✅ Performance checks on target mobile devices.
- ✅ Deploy client + single backend service.
Validation:
- 8-player sessions run without critical failures.

## 13. Future Considerations
- Power-ups and deeper meteor interactions.
- Visual character assets and cosmetic progression.
- Reconnect/resume support.
- Ranked mode and global leaderboards.
- Spectator mode for shared environments.
- Optional persistence layer for match analytics.

## 14. Risks & Mitigations
1. Mobile network instability harms sync quality.  
Mitigation: server authority + client prediction + interpolation + conservative tick payload size.

2. No database means room/state loss on restart.  
Mitigation: communicate MVP limitation; keep sessions short; add optional Redis post-MVP.

3. Gameplay may feel repetitive in long sessions.  
Mitigation: slight randomized spawn patterns and careful ramp tuning.

4. Host disconnect can break session flow.  
Mitigation: automatic host reassignment and state broadcast.

5. Input abuse/event spam can degrade room quality.  
Mitigation: per-socket throttling and strict schema validation.

6. Rule drift between multiplayer and offline modes can create inconsistent gameplay.  
Mitigation: share core game-rule module between server simulation and offline client simulation.

## 15. Appendix
### Locked Product Decisions (from stakeholder)
- Max players: 8.
- Platform: mobile browser only.
- Duration: fixed 10 minutes.
- Loss: instant at city HP = 0.
- Aim: visible aim behavior.
- Reload: 400ms.
- Heavy meteor scoring: last hit gets points.
- Accuracy: meteor hits only.
- Miss penalty: disabled.
- Difficulty: slight randomness for replayability.
- Shot UX: local prediction enabled.
- Reconnect restore: not in MVP.
- Host handling: host reassignment supported.
- Audio: minimal SFX.
- Storage: in-memory backend only, no DB.
- Language: Hebrew only.
- Thematic framing: civil defense tone.

### Suggested Initial Config
```env
PORT=3000
CLIENT_ORIGIN=http://localhost:4200
MAX_PLAYERS_PER_ROOM=8
MATCH_DURATION_SECONDS=600
CITY_HP_DEFAULT=20
TICK_RATE_HZ=24
```
