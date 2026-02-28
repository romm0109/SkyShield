import { createServer } from "node:http";
import assert from "node:assert/strict";
import { io as createClient, Socket as ClientSocket } from "socket.io-client";
import { Server } from "socket.io";
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "../contracts/events.js";
import { registerLobbyEvents } from "./lobbyEvents.js";
import { registerShootEvents } from "./shootEvents.js";
import { MatchLifecycleManager } from "../game-loop/matchLifecycle.js";
import { RoomStore } from "../rooms/roomStore.js";

function onceWithTimeout<T>(
  socket: ClientSocket<ServerToClientEvents, ClientToServerEvents>,
  event: keyof ServerToClientEvents,
  timeoutMs = 4000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${String(event)}`)), timeoutMs);
    socket.once(event, (payload: unknown) => {
      clearTimeout(timeout);
      resolve(payload as T);
    });
  });
}

function createTestEnv(overrides: Partial<ConstructorParameters<typeof MatchLifecycleManager>[2]> = {}) {
  return {
    PORT: 3000,
    CLIENT_ORIGIN: "*",
    MAX_PLAYERS_PER_ROOM: 8,
    MATCH_DURATION_SECONDS: 3,
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
    PROJECTILE_DESPAWN_Y: -60,
    ...overrides
  };
}

async function setup(
  envOverrides: Partial<ConstructorParameters<typeof MatchLifecycleManager>[2]> = {},
  runtime: { matchDurationSeconds?: number; cityHp?: number } = {}
) {
  const roomStore = new RoomStore(8, {
    matchDurationSeconds: runtime.matchDurationSeconds ?? 3,
    cityHp: runtime.cityHp ?? 20
  });
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: { origin: "*" }
  });
  const lifecycle = new MatchLifecycleManager(io, roomStore, createTestEnv(envOverrides));
  io.on("connection", (socket) => {
    registerLobbyEvents(io, socket, roomStore, lifecycle);
    registerShootEvents(socket, roomStore, lifecycle);
  });

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind integration server");
  }

  return {
    roomStore,
    io,
    httpServer,
    url: `http://127.0.0.1:${address.port}`
  };
}

async function closeServer(
  io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
  httpServer: ReturnType<typeof createServer>
): Promise<void> {
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
}

export async function runStartGameIntegrationSuite(): Promise<void> {
  {
    const { io, httpServer, url } = await setup();
    const host = createClient(url, { autoConnect: false });
    const guest = createClient(url, { autoConnect: false });

    try {
      const roomCode = await new Promise<string>((resolve, reject) => {
        host.on("connect", () => host.emit("create_room", { playerName: "Host", characterId: "scout" }));
        host.on("room_created", ({ roomCode: created }) => resolve(created));
        host.on("error_event", reject);
        host.connect();
        setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
      });

      await new Promise<void>((resolve, reject) => {
        guest.on("connect", () => guest.emit("join_room", { roomCode, playerName: "Guest", characterId: "pilot" }));
        guest.on("lobby_state", () => resolve());
        guest.on("error_event", reject);
        guest.connect();
        setTimeout(() => reject(new Error("Timeout waiting for lobby_state")), 3000);
      });

      const nonHostErrorPromise = onceWithTimeout<{ code: string }>(guest, "error_event");
      guest.emit("start_game", { roomCode });
      const nonHostError = await nonHostErrorPromise;
      assert.equal(nonHostError.code, "NOT_HOST");

      const countdownPromise = onceWithTimeout<{ seconds: number }>(guest, "game_countdown");
      const statePromise = onceWithTimeout<{ remainingSeconds: number }>(guest, "game_state", 6000);
      host.emit("start_game", { roomCode });
      const rapidRetryErrorPromise = onceWithTimeout<{ code: string }>(host, "error_event");
      host.emit("start_game", { roomCode });
      const countdown = await countdownPromise;
      const firstState = await statePromise;
      const rapidRetryError = await rapidRetryErrorPromise;
      assert.equal(countdown.seconds, 3);
      assert.equal(firstState.remainingSeconds, 3);
      assert.equal(rapidRetryError.code, "EVENT_THROTTLED");
    } finally {
      host.disconnect();
      guest.disconnect();
      await closeServer(io, httpServer);
    }
  }

  {
    const { io, httpServer, url } = await setup(
      {
        METEOR_GROUND_Y: 110,
        METEOR_SPAWN_INTERVAL_MS: 100,
        METEOR_LIGHT_SPEED: 2500,
        METEOR_HEAVY_SPEED: 2500,
        METEOR_LIGHT_RADIUS: 18,
        METEOR_HEAVY_RADIUS: 22
      },
      { matchDurationSeconds: 20, cityHp: 1 }
    );
    const host = createClient(url, { autoConnect: false });

    try {
      const roomCode = await new Promise<string>((resolve, reject) => {
        host.on("connect", () => host.emit("create_room", { playerName: "Host", characterId: "scout" }));
        host.on("room_created", ({ roomCode: created }) => resolve(created));
        host.on("error_event", reject);
        host.connect();
        setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
      });

      const gameOverPromise = onceWithTimeout<{ reason: string; result: string }>(host, "game_over", 12000);
      host.emit("start_game", { roomCode });

      const gameOver = await gameOverPromise;
      assert.equal(gameOver.reason, "city_destroyed");
      assert.equal(gameOver.result, "lose");
    } finally {
      host.disconnect();
      await closeServer(io, httpServer);
    }
  }

  {
    const { io, httpServer, roomStore, url } = await setup({ MATCH_DURATION_SECONDS: 2 }, { matchDurationSeconds: 2, cityHp: 20 });
    const host = createClient(url, { autoConnect: false });

    try {
      const roomCode = await new Promise<string>((resolve, reject) => {
        host.on("connect", () => host.emit("create_room", { playerName: "Host", characterId: "scout" }));
        host.on("room_created", ({ roomCode: created }) => resolve(created));
        host.on("error_event", reject);
        host.connect();
        setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
      });

      const firstGameState = onceWithTimeout<{ remainingSeconds: number }>(host, "game_state", 6000);
      host.emit("start_game", { roomCode });
      await firstGameState;

      roomStore.updateMatchState(roomCode, (match) => ({
        ...match,
        meteors: [
          {
            id: "m-manual",
            type: "light",
            x: 240,
            y: 320,
            radius: 24,
            speed: 0,
            hp: 1,
            maxHp: 1,
            createdAtMs: Date.now()
          }
        ]
      }));

      const hitPromise = onceWithTimeout<{ byPlayerId: string; points: number }>(host, "hit_confirmed", 3000);
      host.emit("shoot", { roomCode, targetX: 240, targetY: 320, clientTs: Date.now() });
      const hit = await hitPromise;
      assert.equal(hit.byPlayerId.length > 0, true);
      assert.equal(hit.points, 10);

      const gameOver = await onceWithTimeout<{ reason: string; finalLeaderboard: Array<{ accuracy: number }> }>(
        host,
        "game_over",
        10000
      );
      assert.equal(gameOver.reason, "timer_complete");
      assert.equal(gameOver.finalLeaderboard[0]?.accuracy, 100);
    } finally {
      host.disconnect();
      await closeServer(io, httpServer);
    }
  }
}

