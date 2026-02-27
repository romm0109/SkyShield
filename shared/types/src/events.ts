import type { LeaderboardEntry, LobbyState, MeteorState, ProjectileState } from "./models.js";

export interface CreateRoomPayload {
  playerName: string;
  characterId: string;
}

export interface JoinRoomPayload extends CreateRoomPayload {
  roomCode: string;
}

export interface StartGamePayload {
  roomCode: string;
}

export interface ShootPayload {
  roomCode: string;
  targetX: number;
  targetY: number;
  clientTs: number;
}

export interface SetAudioPrefPayload {
  enabled: boolean;
}

export interface ErrorEventPayload {
  code: string;
  messageHe: string;
}

export interface ClientToServerEvents {
  create_room: (payload: CreateRoomPayload) => void;
  join_room: (payload: JoinRoomPayload) => void;
  start_game: (payload: StartGamePayload) => void;
  shoot: (payload: ShootPayload) => void;
  set_audio_pref: (payload: SetAudioPrefPayload) => void;
}

export interface ServerToClientEvents {
  room_created: (payload: { roomCode: string; hostSocketId: string }) => void;
  lobby_state: (payload: LobbyState) => void;
  game_countdown: (payload: { seconds: number }) => void;
  game_state: (payload: {
    remainingSeconds: number;
    cityHp: number;
    meteors: MeteorState[];
    projectiles: ProjectileState[];
    leaderboard: LeaderboardEntry[];
  }) => void;
  hit_confirmed: (payload: {
    meteorId: string;
    byPlayerId: string;
    points: number;
  }) => void;
  game_over: (payload: {
    result: "win" | "lose";
    reason: "timer_complete" | "city_destroyed";
    finalLeaderboard: Array<{
      playerName: string;
      characterId: string;
      score: number;
      accuracy: number;
    }>;
  }) => void;
  error_event: (payload: ErrorEventPayload) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  roomCode?: string;
  playerName?: string;
  characterId?: string;
}

const NAME_PATTERN = /^.{2,16}$/;
const COORDINATE_MIN = 0;
const COORDINATE_MAX = 2000;
const CLIENT_TS_MAX = 9999999999999;
export const ROOM_CODE_PATTERN = /^[A-Z0-9]{4,6}$/;

export function isCreateRoomPayload(value: unknown): value is CreateRoomPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<CreateRoomPayload>;
  return (
    typeof payload.playerName === "string" &&
    NAME_PATTERN.test(payload.playerName.trim()) &&
    typeof payload.characterId === "string" &&
    payload.characterId.trim().length > 0
  );
}

export function isJoinRoomPayload(value: unknown): value is JoinRoomPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<JoinRoomPayload>;
  return (
    typeof payload.playerName === "string" &&
    NAME_PATTERN.test(payload.playerName.trim()) &&
    typeof payload.characterId === "string" &&
    payload.characterId.trim().length > 0 &&
    typeof payload.roomCode === "string" &&
    ROOM_CODE_PATTERN.test(payload.roomCode.trim().toUpperCase())
  );
}

export function isStartGamePayload(value: unknown): value is StartGamePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<StartGamePayload>;
  return typeof payload.roomCode === "string" && ROOM_CODE_PATTERN.test(payload.roomCode.trim().toUpperCase());
}

export function isShootPayload(value: unknown): value is ShootPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Partial<ShootPayload>;
  const hasValidRoomCode =
    typeof payload.roomCode === "string" && ROOM_CODE_PATTERN.test(payload.roomCode.trim().toUpperCase());
  const hasValidTargetX =
    typeof payload.targetX === "number" &&
    Number.isFinite(payload.targetX) &&
    payload.targetX >= COORDINATE_MIN &&
    payload.targetX <= COORDINATE_MAX;
  const hasValidTargetY =
    typeof payload.targetY === "number" &&
    Number.isFinite(payload.targetY) &&
    payload.targetY >= COORDINATE_MIN &&
    payload.targetY <= COORDINATE_MAX;
  const hasValidClientTs =
    typeof payload.clientTs === "number" &&
    Number.isInteger(payload.clientTs) &&
    payload.clientTs > 0 &&
    payload.clientTs <= CLIENT_TS_MAX;

  return hasValidRoomCode && hasValidTargetX && hasValidTargetY && hasValidClientTs;
}
