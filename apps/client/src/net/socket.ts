import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "../contracts/events.js";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | undefined;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false
    });
  }

  return socket;
}

export function connectSocket(): void {
  const client = getSocket();
  if (!client.connected) {
    client.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

