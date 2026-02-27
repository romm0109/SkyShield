import type { LobbyState, PlayerState, RoomState } from "@skyshield/shared-types";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export interface CreateRoomInput {
  socketId: string;
  playerName: string;
  characterId: string;
}

export interface JoinRoomInput extends CreateRoomInput {
  roomCode: string;
}

export class RoomStore {
  private readonly rooms = new Map<string, RoomState>();
  private readonly maxPlayersPerRoom: number;

  public constructor(maxPlayersPerRoom: number) {
    this.maxPlayersPerRoom = maxPlayersPerRoom;
  }

  public createRoom(input: CreateRoomInput): RoomState {
    let roomCode = generateRoomCode();
    while (this.rooms.has(roomCode)) {
      roomCode = generateRoomCode();
    }

    const player: PlayerState = {
      id: input.socketId,
      playerName: input.playerName,
      characterId: input.characterId,
      score: 0
    };

    const room: RoomState = {
      roomCode,
      hostSocketId: input.socketId,
      players: new Map([[input.socketId, player]])
    };

    this.rooms.set(roomCode, room);
    return room;
  }

  public joinRoom(input: JoinRoomInput): { room: RoomState } | { error: string } {
    const room = this.rooms.get(input.roomCode);
    if (!room) {
      return { error: "ROOM_NOT_FOUND" };
    }

    if (room.players.has(input.socketId)) {
      return { room };
    }

    if (room.players.size >= this.maxPlayersPerRoom) {
      return { error: "ROOM_FULL" };
    }

    room.players.set(input.socketId, {
      id: input.socketId,
      playerName: input.playerName,
      characterId: input.characterId,
      score: 0
    });

    return { room };
  }

  public removePlayer(socketId: string): RoomState | undefined {
    for (const room of this.rooms.values()) {
      if (!room.players.has(socketId)) {
        continue;
      }

      room.players.delete(socketId);
      if (room.players.size === 0) {
        this.rooms.delete(room.roomCode);
        return undefined;
      }

      if (room.hostSocketId === socketId) {
        const [nextHost] = room.players.keys();
        if (!nextHost) {
          this.rooms.delete(room.roomCode);
          return undefined;
        }
        room.hostSocketId = nextHost;
      }

      return room;
    }

    return undefined;
  }

  public toLobbyState(roomCode: string): LobbyState | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return undefined;
    }

    return {
      roomCode: room.roomCode,
      hostSocketId: room.hostSocketId,
      players: Array.from(room.players.values())
    };
  }

  public getRoom(roomCode: string): RoomState | undefined {
    return this.rooms.get(roomCode);
  }
}
