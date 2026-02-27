import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@skyshield/shared-types";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | undefined;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io("http://localhost:3000", {
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
