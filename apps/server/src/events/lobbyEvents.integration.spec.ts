import { createServer } from "node:http";
import assert from "node:assert/strict";
import { io as createClient, Socket as ClientSocket } from "socket.io-client";
import { Server } from "socket.io";
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "@skyshield/shared-types";
import { MatchLifecycleManager } from "../game-loop/matchLifecycle.js";
import { registerLobbyEvents } from "./lobbyEvents.js";
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
    TICK_RATE_HZ: 10,
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

async function setup() {
  const roomStore = new RoomStore(8);
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    cors: { origin: "*" }
  });
  const lifecycle = new MatchLifecycleManager(io, roomStore, createEnv());
  io.on("connection", (socket) => registerLobbyEvents(io, socket, roomStore, lifecycle));

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }

  return {
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

export async function runLobbyEventsIntegrationSuite(): Promise<void> {
  {
    const { io, httpServer, url } = await setup();
    const host = createClient(url, { autoConnect: false });
    const guest = createClient(url, { autoConnect: false });

    try {
      const roomCode = await new Promise<string>((resolve, reject) => {
        host.on("connect", () => {
          host.emit("create_room", { playerName: "Host", characterId: "scout" });
        });
        host.on("room_created", ({ roomCode: created }) => resolve(created));
        host.on("error_event", reject);
        host.connect();
        setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
      });

      await new Promise<void>((resolve, reject) => {
        guest.on("connect", () => {
          guest.emit("join_room", { roomCode, playerName: "Guest", characterId: "pilot" });
        });
        guest.on("lobby_state", (payload) => {
          if (payload.players.length === 2) {
            resolve();
          }
        });
        guest.on("error_event", reject);
        guest.connect();
        setTimeout(() => reject(new Error("Timeout waiting for lobby_state")), 3000);
      });
    } finally {
      host.disconnect();
      guest.disconnect();
      await closeServer(io, httpServer);
    }
  }

  {
    const { io, httpServer, url } = await setup();
    const client = createClient(url, { autoConnect: false });

    try {
      const errorPromise = onceWithTimeout<{ code: string }>(client, "error_event");
      client.on("connect", () => {
        client.emit("join_room", { roomCode: "ZZZZ", playerName: "Guest", characterId: "pilot" });
      });
      client.connect();

      const error = await errorPromise;
      assert.equal(error.code, "ROOM_NOT_FOUND");
    } finally {
      client.disconnect();
      await closeServer(io, httpServer);
    }
  }

  {
    const { io, httpServer, url } = await setup();
    const client = createClient(url, { autoConnect: false });

    try {
      const throttledPromise = onceWithTimeout<{ code: string }>(client, "error_event");
      client.on("connect", () => {
        client.emit("create_room", { playerName: "Host", characterId: "scout" });
        client.emit("create_room", { playerName: "Host", characterId: "scout" });
      });
      client.connect();

      const throttled = await throttledPromise;
      assert.equal(throttled.code, "EVENT_THROTTLED");
    } finally {
      client.disconnect();
      await closeServer(io, httpServer);
    }
  }

  {
    const { io, httpServer, url } = await setup();
    const host = createClient(url, { autoConnect: false });
    const guest = createClient(url, { autoConnect: false });

    try {
      const roomCode = await new Promise<string>((resolve, reject) => {
        host.on("connect", () => {
          host.emit("create_room", { playerName: "Host", characterId: "scout" });
        });
        host.on("room_created", ({ roomCode: created }) => resolve(created));
        host.on("error_event", reject);
        host.connect();
        setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
      });

      const throttledPromise = onceWithTimeout<{ code: string }>(guest, "error_event");
      guest.on("connect", () => {
        guest.emit("join_room", { roomCode, playerName: "Guest", characterId: "pilot" });
        guest.emit("join_room", { roomCode, playerName: "Guest", characterId: "pilot" });
      });
      guest.connect();

      const throttled = await throttledPromise;
      assert.equal(throttled.code, "EVENT_THROTTLED");
    } finally {
      host.disconnect();
      guest.disconnect();
      await closeServer(io, httpServer);
    }
  }
}
