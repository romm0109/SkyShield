import type {
  ClientToServerEvents,
  ErrorEventPayload,
  ServerToClientEvents,
  SocketData
} from "@skyshield/shared-types";
import { isCreateRoomPayload, isJoinRoomPayload, isStartGamePayload } from "@skyshield/shared-types";
import type { Server, Socket } from "socket.io";
import { MatchLifecycleManager } from "../game-loop/matchLifecycle.js";
import { RoomStore } from "../rooms/roomStore.js";
import { createSocketRateLimiter } from "./rateLimit.js";

const LOBBY_EVENT_THROTTLE_MS = 500;
const lobbyRateLimiter = createSocketRateLimiter({ minIntervalMs: LOBBY_EVENT_THROTTLE_MS });

function emitError(socket: Socket<ClientToServerEvents, ServerToClientEvents>, payload: ErrorEventPayload): void {
  socket.emit("error_event", payload);
}

function emitThrottled(socket: Socket<ClientToServerEvents, ServerToClientEvents>): void {
  emitError(socket, {
    code: "EVENT_THROTTLED",
    messageHe: "הפעולה נשלחה מהר מדי. נסו שוב בעוד רגע."
  });
}

function sanitizePlayerName(name: string): string {
  return name.trim();
}

function sanitizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

export function registerLobbyEvents(
  io: Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  roomStore: RoomStore,
  matchLifecycle: MatchLifecycleManager
): void {
  socket.on("set_audio_pref", (payload) => {
    console.log(JSON.stringify({ event: "audio_pref_received", socketId: socket.id, enabled: payload.enabled }));
  });

  socket.on("create_room", (rawPayload) => {
    if (!lobbyRateLimiter.allow(socket.id, "create_room")) {
      emitThrottled(socket);
      return;
    }

    if (!isCreateRoomPayload(rawPayload)) {
      emitError(socket, { code: "INVALID_PAYLOAD", messageHe: "פרטי השחקן לא תקינים" });
      return;
    }

    const playerName = sanitizePlayerName(rawPayload.playerName);
    const characterId = rawPayload.characterId.trim();
    const room = roomStore.createRoom({
      socketId: socket.id,
      playerName,
      characterId
    });

    socket.data.roomCode = room.roomCode;
    socket.data.playerName = playerName;
    socket.data.characterId = characterId;
    socket.join(room.roomCode);

    console.log(
      JSON.stringify({ event: "room_created", roomCode: room.roomCode, hostSocketId: room.hostSocketId, socketId: socket.id })
    );
    socket.emit("room_created", { roomCode: room.roomCode, hostSocketId: room.hostSocketId });

    const lobbyState = roomStore.toLobbyState(room.roomCode);
    if (lobbyState) {
      io.to(room.roomCode).emit("lobby_state", lobbyState);
    }
  });

  socket.on("join_room", (rawPayload) => {
    if (!lobbyRateLimiter.allow(socket.id, "join_room")) {
      emitThrottled(socket);
      return;
    }

    if (!isJoinRoomPayload(rawPayload)) {
      emitError(socket, { code: "INVALID_PAYLOAD", messageHe: "קוד חדר או פרטי שחקן לא תקינים" });
      return;
    }

    const roomCode = sanitizeRoomCode(rawPayload.roomCode);
    const playerName = sanitizePlayerName(rawPayload.playerName);
    const characterId = rawPayload.characterId.trim();

    const joinResult = roomStore.joinRoom({
      roomCode,
      socketId: socket.id,
      playerName,
      characterId
    });

    if ("error" in joinResult) {
      const payload =
        joinResult.error === "ROOM_NOT_FOUND"
          ? { code: "ROOM_NOT_FOUND", messageHe: "החדר לא נמצא" }
          : { code: "ROOM_FULL", messageHe: "החדר מלא" };
      emitError(socket, payload);
      console.log(JSON.stringify({ event: "join_room_failed", socketId: socket.id, roomCode, code: payload.code }));
      return;
    }

    socket.data.roomCode = roomCode;
    socket.data.playerName = playerName;
    socket.data.characterId = characterId;
    socket.join(roomCode);

    console.log(JSON.stringify({ event: "room_joined", socketId: socket.id, roomCode }));
    const lobbyState = roomStore.toLobbyState(roomCode);
    if (lobbyState) {
      io.to(roomCode).emit("lobby_state", lobbyState);
    }
  });

  socket.on("start_game", (rawPayload) => {
    if (!lobbyRateLimiter.allow(socket.id, "start_game")) {
      emitThrottled(socket);
      return;
    }

    if (!isStartGamePayload(rawPayload)) {
      emitError(socket, { code: "INVALID_PAYLOAD", messageHe: "קלט התחלת משחק לא תקין" });
      return;
    }

    const roomCode = sanitizeRoomCode(rawPayload.roomCode);
    const room = roomStore.getRoom(roomCode);
    if (!room) {
      emitError(socket, { code: "ROOM_NOT_FOUND", messageHe: "החדר לא נמצא" });
      return;
    }

    if (!room.players.has(socket.id)) {
      emitError(socket, { code: "NOT_IN_ROOM", messageHe: "השחקן לא נמצא בחדר" });
      return;
    }

    if (!roomStore.isHost(roomCode, socket.id)) {
      emitError(socket, { code: "NOT_HOST", messageHe: "רק המארח יכול להתחיל משחק" });
      return;
    }

    if (room.phase !== "lobby") {
      emitError(socket, { code: "INVALID_PHASE", messageHe: "לא ניתן להתחיל משחק בשלב הנוכחי" });
      return;
    }

    const didStart = matchLifecycle.startCountdown(roomCode);
    if (!didStart) {
      emitError(socket, { code: "GAME_ALREADY_STARTED", messageHe: "המשחק כבר התחיל" });
      return;
    }

    console.log(JSON.stringify({ event: "start_game_accepted", roomCode, socketId: socket.id }));
  });
}
