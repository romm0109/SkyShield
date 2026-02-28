export type RoomCode = string;
export type RoomPhase = "lobby" | "countdown" | "in_game" | "game_over";
export type MeteorType = "light" | "heavy";

export interface PlayerState {
  id: string;
  playerName: string;
  characterId: string;
  score: number;
}

export interface LobbyState {
  roomCode: RoomCode;
  hostSocketId: string;
  players: PlayerState[];
}

export interface MeteorState {
  id: string;
  type: MeteorType;
  x: number;
  y: number;
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  createdAtMs: number;
}

export interface ProjectileState {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  targetX: number;
  targetY: number;
  createdAtMs: number;
}

export interface PlayerSlotState {
  playerId: string;
  x: number;
  y: number;
  lane?: number;
}

export interface PlayerMatchStats {
  shotsFired: number;
  hits: number;
  accuracy: number;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  rank: number;
  shotsFired: number;
  hits: number;
  accuracy: number;
}

export interface MatchRuntimeState {
  countdownSeconds: number | null;
  remainingSeconds: number;
  cityHp: number;
  meteors: MeteorState[];
  projectiles: ProjectileState[];
  playerSlots: PlayerSlotState[];
  leaderboard: LeaderboardEntry[];
  playerStats: Record<string, PlayerMatchStats>;
  nextMeteorId: number;
  nextProjectileId: number;
  lastMeteorSpawnMs: number | null;
}

export interface RoomState {
  roomCode: RoomCode;
  hostSocketId: string;
  phase: RoomPhase;
  match: MatchRuntimeState;
  players: Map<string, PlayerState>;
}
