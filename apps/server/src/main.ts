import { createServer } from "node:http";
import { loadEnv } from "./config/env.js";
import { registerLobbyEvents } from "./events/lobbyEvents.js";
import { RoomStore } from "./rooms/roomStore.js";
import { Server } from "socket.io";
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from "@skyshield/shared-types";

const env = loadEnv();
const roomStore = new RoomStore(env.MAX_PLAYERS_PER_ROOM);

const httpServer = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: env.CLIENT_ORIGIN
  }
});

io.on("connection", (socket) => {
  console.log(JSON.stringify({ event: "socket_connected", socketId: socket.id }));
  registerLobbyEvents(io, socket, roomStore);

  socket.on("disconnect", () => {
    const updatedRoom = roomStore.removePlayer(socket.id);
    console.log(
      JSON.stringify({ event: "socket_disconnected", socketId: socket.id, roomCode: socket.data.roomCode ?? null })
    );

    if (updatedRoom) {
      io.to(updatedRoom.roomCode).emit("lobby_state", {
        roomCode: updatedRoom.roomCode,
        hostSocketId: updatedRoom.hostSocketId,
        players: Array.from(updatedRoom.players.values())
      });
    }
  });
});

httpServer.listen(env.PORT, () => {
  console.log(
    JSON.stringify({
      event: "server_started",
      port: env.PORT,
      clientOrigin: env.CLIENT_ORIGIN,
      maxPlayersPerRoom: env.MAX_PLAYERS_PER_ROOM
    })
  );
});
