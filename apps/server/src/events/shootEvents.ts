import type {
  ClientToServerEvents,
  ErrorEventPayload,
  ServerToClientEvents,
  SocketData
} from "@skyshield/shared-types";
import { isShootPayload } from "@skyshield/shared-types";
import type { Socket } from "socket.io";
import { MatchLifecycleManager } from "../game-loop/matchLifecycle.js";
import { RoomStore } from "../rooms/roomStore.js";

const SHOT_THROTTLE_MS = 400;

function emitError(socket: Socket<ClientToServerEvents, ServerToClientEvents>, payload: ErrorEventPayload): void {
  socket.emit("error_event", payload);
}

function sanitizeRoomCode(roomCode: string): string {
  return roomCode.trim().toUpperCase();
}

export function registerShootEvents(
  socket: Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>,
  roomStore: RoomStore,
  matchLifecycle: MatchLifecycleManager
): void {
  let lastShotAtMs = 0;

  socket.on("shoot", (rawPayload) => {
    if (!isShootPayload(rawPayload)) {
      emitError(socket, { code: "INVALID_PAYLOAD", messageHe: "קליטת ירי לא תקינה" });
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

    if (room.phase !== "in_game") {
      emitError(socket, { code: "INVALID_PHASE", messageHe: "ניתן לירות רק בזמן משחק פעיל" });
      return;
    }

    const nowMs = Date.now();
    if (nowMs - lastShotAtMs < SHOT_THROTTLE_MS) {
      emitError(socket, { code: "SHOT_THROTTLED", messageHe: "הטעינה עדיין בתהליך" });
      return;
    }

    lastShotAtMs = nowMs;
    matchLifecycle.queueShot(roomCode, {
      playerId: socket.id,
      targetX: rawPayload.targetX,
      targetY: rawPayload.targetY,
      clientTs: rawPayload.clientTs
    });

    console.log(
      JSON.stringify({
        event: "shoot_queued",
        roomCode,
        socketId: socket.id,
        targetX: rawPayload.targetX,
        targetY: rawPayload.targetY
      })
    );
  });
}
