import type {
  LobbyState,
  MatchRuntimeState,
  PlayerMatchStats,
  PlayerState,
  RoomPhase,
  RoomState
} from "../contracts/models.js";
import { buildPlayerSlots } from "../game-loop/playerSlots.js";

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

export interface RoomRuntimeDefaults {
  matchDurationSeconds: number;
  cityHp: number;
  playfieldWidth?: number;
  groundY?: number;
}

const DEFAULT_RUNTIME: RoomRuntimeDefaults = {
  matchDurationSeconds: 600,
  cityHp: 20,
  playfieldWidth: 480,
  groundY: 720
};

function createInitialMatchState(runtime: RoomRuntimeDefaults, players: Iterable<PlayerState>): MatchRuntimeState {
  return {
    countdownSeconds: null,
    remainingSeconds: runtime.matchDurationSeconds,
    cityHp: runtime.cityHp,
    meteors: [],
    projectiles: [],
    playerSlots: buildPlayerSlots(players, {
      playfieldWidth: runtime.playfieldWidth ?? DEFAULT_RUNTIME.playfieldWidth!,
      groundY: runtime.groundY ?? DEFAULT_RUNTIME.groundY!
    }),
    leaderboard: [],
    playerStats: {},
    nextMeteorId: 1,
    nextProjectileId: 1,
    lastMeteorSpawnMs: null
  };
}

export class RoomStore {
  private readonly rooms = new Map<string, RoomState>();
  private readonly maxPlayersPerRoom: number;
  private readonly runtimeDefaults: RoomRuntimeDefaults;

  public constructor(maxPlayersPerRoom: number, runtimeDefaults: RoomRuntimeDefaults = DEFAULT_RUNTIME) {
    this.maxPlayersPerRoom = maxPlayersPerRoom;
    this.runtimeDefaults = runtimeDefaults;
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
      phase: "lobby",
      match: createInitialMatchState(this.runtimeDefaults, [player]),
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
    this.rebuildPlayerSlots(room);

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

      this.rebuildPlayerSlots(room);
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

  public setRoomPhase(roomCode: string, phase: RoomPhase): RoomState | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return undefined;
    }

    room.phase = phase;
    return room;
  }

  public updateMatchState(roomCode: string, patchFn: (match: MatchRuntimeState) => MatchRuntimeState): RoomState | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return undefined;
    }

    room.match = patchFn(room.match);
    return room;
  }

  public updatePlayer(
    roomCode: string,
    socketId: string,
    patchFn: (player: PlayerState) => PlayerState
  ): RoomState | undefined {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return undefined;
    }
    const player = room.players.get(socketId);
    if (!player) {
      return room;
    }

    room.players.set(socketId, patchFn(player));
    return room;
  }

  public setPlayerStats(roomCode: string, socketId: string, stats: PlayerMatchStats): RoomState | undefined {
    return this.updateMatchState(roomCode, (match) => ({
      ...match,
      playerStats: {
        ...match.playerStats,
        [socketId]: stats
      }
    }));
  }

  public isHost(roomCode: string, socketId: string): boolean {
    const room = this.rooms.get(roomCode);
    return room?.hostSocketId === socketId;
  }

  public rebuildPlayerSlots(room: RoomState): RoomState {
    room.match.playerSlots = buildPlayerSlots(room.players.values(), {
      playfieldWidth: this.runtimeDefaults.playfieldWidth ?? DEFAULT_RUNTIME.playfieldWidth!,
      groundY: this.runtimeDefaults.groundY ?? DEFAULT_RUNTIME.groundY!
    });
    return room;
  }
}

