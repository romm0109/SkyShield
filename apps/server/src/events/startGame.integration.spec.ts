import { createServer } from "node:http";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
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

describe("start_game integration", () => {
  let io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> | undefined;
  let httpServer: ReturnType<typeof createServer> | undefined;

  afterEach(async () => {
    await new Promise<void>((resolve) => {
      if (!io) {
        resolve();
        return;
      }
      io.close(() => resolve());
    });
    await new Promise<void>((resolve) => {
      if (!httpServer) {
        resolve();
        return;
      }
      httpServer.close(() => resolve());
    });
  });

  it("rejects non-host start_game requests", async () => {
    const roomStore = new RoomStore(8, { matchDurationSeconds: 2, cityHp: 20 });
    httpServer = createServer();
    io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
      cors: { origin: "*" }
    });

    const lifecycle = new MatchLifecycleManager(io, roomStore, {
      PORT: 3000,
      CLIENT_ORIGIN: "*",
      MAX_PLAYERS_PER_ROOM: 8,
      MATCH_DURATION_SECONDS: 2,
      CITY_HP_DEFAULT: 20,
      TICK_RATE_HZ: 10
    });
    io.on("connection", (socket) => registerLobbyEvents(io!, socket, roomStore, lifecycle));
    await new Promise<void>((resolve) => httpServer!.listen(0, resolve));

    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind test server");
    }
    const url = `http://127.0.0.1:${address.port}`;
    const host = createClient(url);
    const guest = createClient(url);

    const roomCode = await new Promise<string>((resolve, reject) => {
      host.on("connect", () => host.emit("create_room", { playerName: "Host", characterId: "scout" }));
      host.on("room_created", ({ roomCode: created }) => resolve(created));
      host.on("error_event", reject);
      setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
    });

    await new Promise<void>((resolve, reject) => {
      guest.on("connect", () => guest.emit("join_room", { roomCode, playerName: "Guest", characterId: "pilot" }));
      guest.on("lobby_state", () => resolve());
      guest.on("error_event", reject);
      setTimeout(() => reject(new Error("Timeout waiting for lobby_state")), 3000);
    });

    const errorPromise = onceWithTimeout<{ code: string }>(guest, "error_event");
    guest.emit("start_game", { roomCode });
    const error = await errorPromise;
    assert.equal(error.code, "NOT_HOST");

    host.disconnect();
    guest.disconnect();
  });

  it("allows host start_game and emits countdown and first game_state", async () => {
    const roomStore = new RoomStore(8, { matchDurationSeconds: 2, cityHp: 20 });
    httpServer = createServer();
    io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
      cors: { origin: "*" }
    });

    const lifecycle = new MatchLifecycleManager(io, roomStore, {
      PORT: 3000,
      CLIENT_ORIGIN: "*",
      MAX_PLAYERS_PER_ROOM: 8,
      MATCH_DURATION_SECONDS: 2,
      CITY_HP_DEFAULT: 20,
      TICK_RATE_HZ: 10
    });
    io.on("connection", (socket) => registerLobbyEvents(io!, socket, roomStore, lifecycle));
    await new Promise<void>((resolve) => httpServer!.listen(0, resolve));

    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind test server");
    }
    const url = `http://127.0.0.1:${address.port}`;
    const host = createClient(url);
    const guest = createClient(url);

    const roomCode = await new Promise<string>((resolve, reject) => {
      host.on("connect", () => host.emit("create_room", { playerName: "Host", characterId: "scout" }));
      host.on("room_created", ({ roomCode: created }) => resolve(created));
      host.on("error_event", reject);
      setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
    });

    await new Promise<void>((resolve, reject) => {
      guest.on("connect", () => guest.emit("join_room", { roomCode, playerName: "Guest", characterId: "pilot" }));
      guest.on("lobby_state", () => resolve());
      guest.on("error_event", reject);
      setTimeout(() => reject(new Error("Timeout waiting for lobby_state")), 3000);
    });

    const countdownPromise = onceWithTimeout<{ seconds: number }>(guest, "game_countdown");
    const gameStatePromise = onceWithTimeout<{ remainingSeconds: number }>(guest, "game_state", 5000);
    host.emit("start_game", { roomCode });

    const countdown = await countdownPromise;
    assert.equal(countdown.seconds, 3);

    const gameState = await gameStatePromise;
    assert.equal(gameState.remainingSeconds, 2);

    host.disconnect();
    guest.disconnect();
  });

  it("emits game_over with timer_complete after timeout", async () => {
    const roomStore = new RoomStore(8, { matchDurationSeconds: 2, cityHp: 20 });
    httpServer = createServer();
    io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
      cors: { origin: "*" }
    });

    const lifecycle = new MatchLifecycleManager(io, roomStore, {
      PORT: 3000,
      CLIENT_ORIGIN: "*",
      MAX_PLAYERS_PER_ROOM: 8,
      MATCH_DURATION_SECONDS: 2,
      CITY_HP_DEFAULT: 20,
      TICK_RATE_HZ: 10
    });
    io.on("connection", (socket) => registerLobbyEvents(io!, socket, roomStore, lifecycle));
    await new Promise<void>((resolve) => httpServer!.listen(0, resolve));

    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind test server");
    }
    const url = `http://127.0.0.1:${address.port}`;
    const host = createClient(url);
    const guest = createClient(url);

    const roomCode = await new Promise<string>((resolve, reject) => {
      host.on("connect", () => host.emit("create_room", { playerName: "Host", characterId: "scout" }));
      host.on("room_created", ({ roomCode: created }) => resolve(created));
      host.on("error_event", reject);
      setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
    });

    await new Promise<void>((resolve, reject) => {
      guest.on("connect", () => guest.emit("join_room", { roomCode, playerName: "Guest", characterId: "pilot" }));
      guest.on("lobby_state", () => resolve());
      guest.on("error_event", reject);
      setTimeout(() => reject(new Error("Timeout waiting for lobby_state")), 3000);
    });

    const gameOverPromise = onceWithTimeout<{ reason: string; result: string }>(guest, "game_over", 10000);
    host.emit("start_game", { roomCode });

    const gameOver = await gameOverPromise;
    assert.equal(gameOver.result, "win");
    assert.equal(gameOver.reason, "timer_complete");

    host.disconnect();
    guest.disconnect();
  });
});
