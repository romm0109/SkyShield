import type { LeaderboardEntry, MeteorState, PlayerSlotState, ProjectileState } from "@skyshield/shared-types";

export type MatchPhase = "lobby" | "countdown" | "in_game" | "game_over";

export interface MatchSnapshot {
  remainingSeconds: number;
  cityHp: number;
  meteors: MeteorState[];
  projectiles: ProjectileState[];
  playerSlots: PlayerSlotState[];
  leaderboard: LeaderboardEntry[];
}

export interface HitConfirmedSnapshot {
  meteorId: string;
  byPlayerId: string;
  points: number;
}

export interface FinalLeaderboardEntry {
  playerName: string;
  characterId: string;
  score: number;
  accuracy: number;
}

export interface GameOverSnapshot {
  result: "win" | "lose";
  reason: "timer_complete" | "city_destroyed";
  finalLeaderboard: FinalLeaderboardEntry[];
}
