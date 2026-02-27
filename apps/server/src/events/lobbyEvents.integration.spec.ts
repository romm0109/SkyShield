import { createServer } from "node:http";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { io as createClient } from "socket.io-client";
import { Server } from "socket.io";
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "@skyshield/shared-types";
import { registerLobbyEvents } from "./lobbyEvents.js";
import { RoomStore } from "../rooms/roomStore.js";

describe("lobby event integration", () => {
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

  it("supports create and join room flow", async () => {
    const roomStore = new RoomStore(8);
    httpServer = createServer();
    io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
      cors: { origin: "*" }
    });

    io.on("connection", (socket) => registerLobbyEvents(io!, socket, roomStore));

    await new Promise<void>((resolve) => httpServer!.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind test server");
    }

    const url = `http://127.0.0.1:${address.port}`;
    const clientA = createClient(url);
    const clientB = createClient(url);

    const roomCode = await new Promise<string>((resolve, reject) => {
      clientA.on("connect", () => {
        clientA.emit("create_room", { playerName: "Host", characterId: "scout" });
      });
      clientA.on("room_created", ({ roomCode: created }) => resolve(created));
      clientA.on("error_event", reject);
      setTimeout(() => reject(new Error("Timeout waiting for room_created")), 3000);
    });

    const lobbyState = await new Promise<{ players: Array<{ playerName: string }> }>((resolve, reject) => {
      clientB.on("connect", () => {
        clientB.emit("join_room", { roomCode, playerName: "Guest", characterId: "pilot" });
      });
      clientB.on("lobby_state", resolve);
      clientB.on("error_event", reject);
      setTimeout(() => reject(new Error("Timeout waiting for lobby_state")), 3000);
    });

    assert.equal(lobbyState.players.length, 2);
    assert.deepEqual(lobbyState.players.map((p) => p.playerName).sort(), ["Guest", "Host"]);

    clientA.disconnect();
    clientB.disconnect();
  });

  it("emits error_event for invalid joins", async () => {
    const roomStore = new RoomStore(8);
    httpServer = createServer();
    io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
      cors: { origin: "*" }
    });

    io.on("connection", (socket) => registerLobbyEvents(io!, socket, roomStore));
    await new Promise<void>((resolve) => httpServer!.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to bind test server");
    }
    const client = createClient(`http://127.0.0.1:${address.port}`);

    const error = await new Promise<{ code: string }>((resolve, reject) => {
      client.on("connect", () => {
        client.emit("join_room", { roomCode: "ZZZZ", playerName: "Guest", characterId: "pilot" });
      });
      client.on("error_event", resolve);
      setTimeout(() => reject(new Error("Timeout waiting for error_event")), 3000);
    });

    assert.equal(error.code, "ROOM_NOT_FOUND");
    client.disconnect();
  });
});
