import assert from "node:assert/strict";
import { createServer } from "node:http";
import { io as createClient } from "socket.io-client";
import { Server } from "socket.io";
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "@skyshield/shared-types";
import { registerLobbyEvents } from "./events/lobbyEvents.js";
import { MatchLifecycleManager } from "./game-loop/matchLifecycle.js";
import { RoomStore } from "./rooms/roomStore.js";

function onceWithTimeout<T>(
  socket: ReturnType<typeof createClient>,
  event: keyof ServerToClientEvents,
  timeoutMs = 3000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timeout waiting for ${String(event)}`)), timeoutMs);
    socket.once(event, (payload) => {
      clearTimeout(timeout);
      resolve(payload as T);
    });
  });
}

async function run(): Promise<void> {
  const roomStore = new RoomStore(8, { matchDurationSeconds: 2, cityHp: 20 });
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
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

  io.on("connection", (socket) => registerLobbyEvents(io, socket, roomStore, lifecycle));

  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }

  const url = `http://127.0.0.1:${address.port}`;
  const clientA = createClient(url, { autoConnect: false });
  const clientB = createClient(url, { autoConnect: false });

  const roomCode = await new Promise<string>((resolve, reject) => {
    clientA.on("connect", () => {
      clientA.emit("create_room", { playerName: "Host", characterId: "scout" });
    });
    clientA.on("room_created", ({ roomCode: created }) => resolve(created));
    clientA.on("error_event", reject);
    clientA.connect();
    setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
  });

  const lobbyState = await new Promise<{ players: Array<{ playerName: string }> }>((resolve, reject) => {
    clientB.on("connect", () => {
      clientB.emit("join_room", { roomCode, playerName: "Guest", characterId: "pilot" });
    });
    clientB.on("lobby_state", resolve);
    clientB.on("error_event", reject);
    clientB.connect();
    setTimeout(() => reject(new Error("Timeout waiting for lobby_state")), 3000);
  });

  assert.equal(lobbyState.players.length, 2);
  assert.deepEqual(lobbyState.players.map((p) => p.playerName).sort(), ["Guest", "Host"]);

  const clientC = createClient(url, { autoConnect: false });
  const error = await new Promise<{ code: string }>((resolve, reject) => {
    clientC.on("connect", () => {
      clientC.emit("join_room", { roomCode: "ZZZZ", playerName: "Guest", characterId: "pilot" });
    });
    clientC.on("error_event", resolve);
    clientC.connect();
    setTimeout(() => reject(new Error("Timeout waiting for error_event")), 3000);
  });

  assert.equal(error.code, "ROOM_NOT_FOUND");

  const nonHostStartErrorPromise = onceWithTimeout<{ code: string }>(clientB, "error_event");
  clientB.emit("start_game", { roomCode });
  const nonHostStartError = await nonHostStartErrorPromise;
  assert.equal(nonHostStartError.code, "NOT_HOST");

  const countdownPromise = onceWithTimeout<{ seconds: number }>(clientB, "game_countdown");
  const gameStatePromise = onceWithTimeout<{ remainingSeconds: number }>(clientB, "game_state", 5000);
  const gameOverPromise = onceWithTimeout<{ result: string; reason: string }>(clientB, "game_over", 10000);
  clientA.emit("start_game", { roomCode });

  const countdown = await countdownPromise;
  assert.equal(countdown.seconds, 3);

  const gameState = await gameStatePromise;
  assert.equal(gameState.remainingSeconds, 2);

  const gameOver = await gameOverPromise;
  assert.equal(gameOver.result, "win");
  assert.equal(gameOver.reason, "timer_complete");

  clientA.disconnect();
  clientB.disconnect();
  clientC.disconnect();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
}

run()
  .then(() => {
    console.log("apps/server integration tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
