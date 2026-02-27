import { performance } from "node:perf_hooks";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData
} from "@skyshield/shared-types";
import type { AppEnv } from "../config/env.js";
import { RoomStore } from "../rooms/roomStore.js";
import type { Server } from "socket.io";

type LifecycleServer = Pick<Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, "to">;

interface RoomLoopState {
  countdownInterval?: NodeJS.Timeout;
  countdownTimeout?: NodeJS.Timeout;
  tickInterval?: NodeJS.Timeout;
  matchStartMs?: number;
}

interface TimerApi {
  setInterval(handler: () => void, ms: number): NodeJS.Timeout;
  clearInterval(timer: NodeJS.Timeout): void;
  setTimeout(handler: () => void, ms: number): NodeJS.Timeout;
  clearTimeout(timer: NodeJS.Timeout): void;
}

const defaultTimerApi: TimerApi = {
  setInterval: (handler, ms) => setInterval(handler, ms),
  clearInterval: (timer) => clearInterval(timer),
  setTimeout: (handler, ms) => setTimeout(handler, ms),
  clearTimeout: (timer) => clearTimeout(timer)
};

export class MatchLifecycleManager {
  private readonly loops = new Map<string, RoomLoopState>();
  private readonly intervalMs: number;

  public constructor(
    private readonly io: LifecycleServer,
    private readonly roomStore: RoomStore,
    private readonly env: AppEnv,
    private readonly now: () => number = () => performance.now(),
    private readonly timers: TimerApi = defaultTimerApi
  ) {
    this.intervalMs = Math.max(1, Math.floor(1000 / env.TICK_RATE_HZ));
  }

  public startCountdown(roomCode: string): boolean {
    const room = this.roomStore.getRoom(roomCode);
    if (!room || room.phase !== "lobby" || this.loops.has(roomCode)) {
      return false;
    }

    const loop: RoomLoopState = {};
    this.loops.set(roomCode, loop);
    this.roomStore.setRoomPhase(roomCode, "countdown");
    this.roomStore.updateMatchState(roomCode, (match) => ({ ...match, countdownSeconds: 3 }));

    let seconds = 3;
    this.io.to(roomCode).emit("game_countdown", { seconds });
    loop.countdownInterval = this.timers.setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        return;
      }

      this.roomStore.updateMatchState(roomCode, (match) => ({ ...match, countdownSeconds: seconds }));
      this.io.to(roomCode).emit("game_countdown", { seconds });
    }, 1000);

    loop.countdownTimeout = this.timers.setTimeout(() => {
      this.startMatch(roomCode);
    }, 3000);

    console.log(JSON.stringify({ event: "game_countdown_started", roomCode }));
    return true;
  }

  public stopRoom(roomCode: string): void {
    const loop = this.loops.get(roomCode);
    if (!loop) {
      return;
    }

    if (loop.countdownInterval) {
      this.timers.clearInterval(loop.countdownInterval);
    }
    if (loop.countdownTimeout) {
      this.timers.clearTimeout(loop.countdownTimeout);
    }
    if (loop.tickInterval) {
      this.timers.clearInterval(loop.tickInterval);
    }
    this.loops.delete(roomCode);
    console.log(JSON.stringify({ event: "game_lifecycle_stopped", roomCode }));
  }

  public stopAll(): void {
    for (const roomCode of this.loops.keys()) {
      this.stopRoom(roomCode);
    }
  }

  private startMatch(roomCode: string): void {
    const room = this.roomStore.getRoom(roomCode);
    if (!room) {
      this.stopRoom(roomCode);
      return;
    }

    const loop = this.loops.get(roomCode);
    if (!loop) {
      return;
    }

    if (loop.countdownInterval) {
      this.timers.clearInterval(loop.countdownInterval);
      loop.countdownInterval = undefined;
    }
    if (loop.countdownTimeout) {
      this.timers.clearTimeout(loop.countdownTimeout);
      loop.countdownTimeout = undefined;
    }

    this.roomStore.setRoomPhase(roomCode, "in_game");
    this.roomStore.updateMatchState(roomCode, (match) => ({
      ...match,
      countdownSeconds: null,
      remainingSeconds: this.env.MATCH_DURATION_SECONDS
    }));

    loop.matchStartMs = this.now();
    this.emitGameState(roomCode, this.env.MATCH_DURATION_SECONDS);
    loop.tickInterval = this.timers.setInterval(() => {
      this.tick(roomCode);
    }, this.intervalMs);

    console.log(JSON.stringify({ event: "game_started", roomCode }));
  }

  private tick(roomCode: string): void {
    const room = this.roomStore.getRoom(roomCode);
    const loop = this.loops.get(roomCode);
    if (!room || !loop?.matchStartMs || room.phase !== "in_game") {
      this.stopRoom(roomCode);
      return;
    }

    const elapsedSeconds = Math.floor((this.now() - loop.matchStartMs) / 1000);
    const remainingSeconds = Math.max(this.env.MATCH_DURATION_SECONDS - elapsedSeconds, 0);
    this.emitGameState(roomCode, remainingSeconds);

    if (remainingSeconds > 0) {
      return;
    }

    this.roomStore.setRoomPhase(roomCode, "game_over");
    this.io.to(roomCode).emit("game_over", {
      result: "win",
      reason: "timer_complete",
      finalLeaderboard: Array.from(room.players.values()).map((player) => ({
        playerName: player.playerName,
        characterId: player.characterId,
        score: player.score,
        accuracy: 0
      }))
    });

    this.stopRoom(roomCode);
  }

  private emitGameState(roomCode: string, remainingSeconds: number): void {
    const updatedRoom = this.roomStore.updateMatchState(roomCode, (match) => ({ ...match, remainingSeconds }));
    if (!updatedRoom) {
      return;
    }

    const { match } = updatedRoom;
    this.io.to(roomCode).emit("game_state", {
      remainingSeconds,
      cityHp: match.cityHp,
      meteors: match.meteors,
      projectiles: match.projectiles,
      leaderboard: match.leaderboard
    });
  }
}
