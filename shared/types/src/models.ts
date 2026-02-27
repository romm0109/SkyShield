export type RoomCode = string;
export type RoomPhase = "lobby" | "countdown" | "in_game" | "game_over";

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
  x: number;
  y: number;
  hp: number;
}

export interface ProjectileState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  score: number;
  rank: number;
}

export interface MatchRuntimeState {
  countdownSeconds: number | null;
  remainingSeconds: number;
  cityHp: number;
  meteors: MeteorState[];
  projectiles: ProjectileState[];
  leaderboard: LeaderboardEntry[];
}

export interface RoomState {
  roomCode: RoomCode;
  hostSocketId: string;
  phase: RoomPhase;
  match: MatchRuntimeState;
  players: Map<string, PlayerState>;
}
