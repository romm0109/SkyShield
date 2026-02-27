import type {
  ClientToServerEvents,
  ErrorEventPayload,
  ServerToClientEvents,
  SocketData
} from "@skyshield/shared-types";
import { isCreateRoomPayload, isJoinRoomPayload } from "@skyshield/shared-types";
import type { Server, Socket } from "socket.io";
import { RoomStore } from "../rooms/roomStore.js";

function emitError(socket: Socket<ClientToServerEvents, ServerToClientEvents>, payload: ErrorEventPayload): void {
  socket.emit("error_event", payload);
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
  roomStore: RoomStore
): void {
  socket.on("create_room", (rawPayload) => {
    if (!isCreateRoomPayload(rawPayload)) {
      emitError(socket, { code: "INVALID_PAYLOAD", messageHe: "פרטי שחקן לא תקינים" });
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
}
