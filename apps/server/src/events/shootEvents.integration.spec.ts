import { createServer } from "node:http";
import assert from "node:assert/strict";
import { io as createClient, Socket as ClientSocket } from "socket.io-client";
import { Server } from "socket.io";
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "@skyshield/shared-types";
import { registerLobbyEvents } from "./lobbyEvents.js";
import { registerShootEvents } from "./shootEvents.js";
import { MatchLifecycleManager } from "../game-loop/matchLifecycle.js";
import { RoomStore } from "../rooms/roomStore.js";

function onceWithTimeout<T>(
  socket: ClientSocket<ServerToClientEvents, ClientToServerEvents>,
  event: keyof ServerToClientEvents,
  timeoutMs = 3000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${String(event)}`)), timeoutMs);
    socket.once(event, (payload: unknown) => {
      clearTimeout(timeout);
      resolve(payload as T);
    });
  });
}

function createEnv() {
  return {
    PORT: 3000,
    CLIENT_ORIGIN: "*",
    MAX_PLAYERS_PER_ROOM: 8,
    MATCH_DURATION_SECONDS: 2,
    CITY_HP_DEFAULT: 20,
    TICK_RATE_HZ: 30,
    PLAYFIELD_WIDTH: 480,
    METEOR_GROUND_Y: 720,
    METEOR_SPAWN_INTERVAL_MS: 99999,
    METEOR_LIGHT_SPEED: 130,
    METEOR_HEAVY_SPEED: 80,
    METEOR_LIGHT_RADIUS: 24,
    METEOR_HEAVY_RADIUS: 34,
    METEOR_HEAVY_SPAWN_EVERY: 4,
    PROJECTILE_SPEED: 950,
    PROJECTILE_RADIUS: 10,
    PROJECTILE_DESPAWN_Y: -60
  };
}

export async function runShootEventsIntegrationSuite(): Promise<void> {
  const roomStore = new RoomStore(8, { matchDurationSeconds: 2, cityHp: 20 });
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: { origin: "*" }
  });
  const lifecycle = new MatchLifecycleManager(io, roomStore, createEnv());
  io.on("connection", (socket) => {
    registerLobbyEvents(io, socket, roomStore, lifecycle);
    registerShootEvents(socket, roomStore, lifecycle);
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind integration server");
  }

  const url = `http://127.0.0.1:${address.port}`;
  const host = createClient(url, { autoConnect: false });

  try {
    const roomCode = await new Promise<string>((resolve, reject) => {
      host.on("connect", () => host.emit("create_room", { playerName: "Host", characterId: "scout" }));
      host.on("room_created", ({ roomCode: created }) => resolve(created));
      host.on("error_event", reject);
      host.connect();
      setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
    });

    host.emit("shoot", { roomCode, targetX: -20, targetY: 100, clientTs: Date.now() });
    const invalidPayload = await onceWithTimeout<{ code: string }>(host, "error_event");
    assert.equal(invalidPayload.code, "INVALID_PAYLOAD");

    host.emit("shoot", { roomCode, targetX: 200, targetY: 200, clientTs: Date.now() });
    const notInGame = await onceWithTimeout<{ code: string }>(host, "error_event");
    assert.equal(notInGame.code, "INVALID_PHASE");

    const firstGameState = onceWithTimeout<{ remainingSeconds: number }>(host, "game_state", 6000);
    host.emit("start_game", { roomCode });
    await firstGameState;

    roomStore.updateMatchState(roomCode, (match) => ({
      ...match,
      meteors: [
        {
          id: "m-shoot",
          type: "light",
          x: 240,
          y: 340,
          radius: 24,
          speed: 0,
          hp: 1,
          maxHp: 1,
          createdAtMs: Date.now()
        }
      ]
    }));

    host.emit("shoot", { roomCode, targetX: 240, targetY: 340, clientTs: Date.now() });
    const hit = await onceWithTimeout<{ meteorId: string; points: number }>(host, "hit_confirmed", 3000);
    assert.equal(hit.meteorId, "m-shoot");
    assert.equal(hit.points, 10);

    const updatedState = await onceWithTimeout<{ leaderboard: Array<{ score: number }> }>(host, "game_state", 3000);
    assert.equal(updatedState.leaderboard[0]?.score, 10);
  } finally {
    host.disconnect();
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  }
}
