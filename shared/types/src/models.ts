export type RoomCode = string;

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

export interface RoomState {
  roomCode: RoomCode;
  hostSocketId: string;
  players: Map<string, PlayerState>;
}
