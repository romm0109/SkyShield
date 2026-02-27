import { performance } from "node:perf_hooks";
import type {
  ClientToServerEvents,
  InterServerEvents,
  PlayerMatchStats,
  ServerToClientEvents,
  SocketData
} from "@skyshield/shared-types";
import type { AppEnv } from "../config/env.js";
import { RoomStore } from "../rooms/roomStore.js";
import { buildLeaderboard, stepSimulation, type QueuedShot, type SimulationConfig } from "./simulation.js";
import type { Server } from "socket.io";

type LifecycleServer = Pick<Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>, "to">;

interface RoomLoopState {
  countdownInterval?: NodeJS.Timeout;
  countdownTimeout?: NodeJS.Timeout;
  tickInterval?: NodeJS.Timeout;
  matchStartMs?: number;
  lastTickMs?: number;
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
  private readonly shotQueue = new Map<string, QueuedShot[]>();
  private readonly intervalMs: number;
  private readonly simulationConfig: SimulationConfig;

  public constructor(
    private readonly io: LifecycleServer,
    private readonly roomStore: RoomStore,
    private readonly env: AppEnv,
    private readonly now: () => number = () => performance.now(),
    private readonly timers: TimerApi = defaultTimerApi
  ) {
    this.intervalMs = Math.max(1, Math.floor(1000 / env.TICK_RATE_HZ));
    this.simulationConfig = {
      playfieldWidth: env.PLAYFIELD_WIDTH,
      groundY: env.METEOR_GROUND_Y,
      meteorSpawnIntervalMs: env.METEOR_SPAWN_INTERVAL_MS,
      meteorLightSpeed: env.METEOR_LIGHT_SPEED,
      meteorHeavySpeed: env.METEOR_HEAVY_SPEED,
      meteorLightRadius: env.METEOR_LIGHT_RADIUS,
      meteorHeavyRadius: env.METEOR_HEAVY_RADIUS,
      meteorHeavySpawnEvery: env.METEOR_HEAVY_SPAWN_EVERY,
      projectileSpeed: env.PROJECTILE_SPEED,
      projectileRadius: env.PROJECTILE_RADIUS,
      projectileDespawnY: env.PROJECTILE_DESPAWN_Y,
      lightMeteorPoints: 10,
      heavyMeteorPoints: 25
    };
  }

  public startCountdown(roomCode: string): boolean {
    const room = this.roomStore.getRoom(roomCode);
    if (!room || room.phase !== "lobby" || this.loops.has(roomCode)) {
      return false;
    }

    const loop: RoomLoopState = {};
    this.loops.set(roomCode, loop);
    this.roomStore.setRoomPhase(roomCode, "countdown");
    this.roomStore.updateMatchState(roomCode, (match) => ({
      ...match,
      countdownSeconds: 3,
      meteors: [],
      projectiles: [],
      playerStats: {}
    }));

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
    this.shotQueue.delete(roomCode);
    console.log(JSON.stringify({ event: "game_lifecycle_stopped", roomCode }));
  }

  public stopAll(): void {
    for (const roomCode of this.loops.keys()) {
      this.stopRoom(roomCode);
    }
  }

  public queueShot(roomCode: string, shot: QueuedShot): void {
    const roomQueue = this.shotQueue.get(roomCode) ?? [];
    roomQueue.push(shot);
    this.shotQueue.set(roomCode, roomQueue);
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
      remainingSeconds: this.env.MATCH_DURATION_SECONDS,
      cityHp: this.env.CITY_HP_DEFAULT,
      meteors: [],
      projectiles: [],
      nextMeteorId: 1,
      nextProjectileId: 1,
      lastMeteorSpawnMs: this.now(),
      leaderboard: [],
      playerStats: Array.from(room.players.keys()).reduce<Record<string, PlayerMatchStats>>((acc, socketId) => {
        acc[socketId] = { shotsFired: 0, hits: 0, accuracy: 0 };
        return acc;
      }, {})
    }));

    loop.matchStartMs = this.now();
    loop.lastTickMs = loop.matchStartMs;
    this.shotQueue.set(roomCode, []);
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

    const nowMs = this.now();
    const dtMs = Math.max(1, Math.min(250, nowMs - (loop.lastTickMs ?? nowMs)));
    loop.lastTickMs = nowMs;
    const elapsedSeconds = Math.floor((nowMs - loop.matchStartMs) / 1000);
    const remainingSeconds = Math.max(this.env.MATCH_DURATION_SECONDS - elapsedSeconds, 0);

    const queuedShots = this.shotQueue.get(roomCode) ?? [];
    this.shotQueue.set(roomCode, []);
    const simulation = stepSimulation(room, dtMs, nowMs, queuedShots, this.simulationConfig);

    for (const [playerId, delta] of Object.entries(simulation.playerDeltas)) {
      this.roomStore.updatePlayer(roomCode, playerId, (player) => ({
        ...player,
        score: player.score + delta.scoreDelta
      }));
    }

    for (const hitEvent of simulation.hitEvents) {
      this.io.to(roomCode).emit("hit_confirmed", hitEvent);
    }

    this.roomStore.updateMatchState(roomCode, () => {
      const nextStats = simulation.nextMatch.playerStats;
      return {
        ...simulation.nextMatch,
        remainingSeconds,
        leaderboard: buildLeaderboard(room.players.values(), nextStats)
      };
    });

    const updatedRoom = this.roomStore.getRoom(roomCode);
    if (!updatedRoom) {
      this.stopRoom(roomCode);
      return;
    }

    this.emitGameState(roomCode, remainingSeconds);
    if (updatedRoom.match.cityHp <= 0) {
      this.endMatch(updatedRoom.roomCode, "lose", "city_destroyed");
      return;
    }

    if (remainingSeconds > 0) {
      return;
    }

    this.endMatch(updatedRoom.roomCode, "win", "timer_complete");
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

  private endMatch(roomCode: string, result: "win" | "lose", reason: "timer_complete" | "city_destroyed"): void {
    const room = this.roomStore.getRoom(roomCode);
    if (!room || room.phase === "game_over") {
      return;
    }

    this.roomStore.setRoomPhase(roomCode, "game_over");
    const finalLeaderboard = Array.from(room.players.values())
      .sort((a, b) => b.score - a.score)
      .map((player) => ({
        playerName: player.playerName,
        characterId: player.characterId,
        score: player.score,
        accuracy: room.match.playerStats[player.id]?.accuracy ?? 0
      }));

    this.io.to(roomCode).emit("game_over", {
      result,
      reason,
      finalLeaderboard
    });

    this.stopRoom(roomCode);
  }
}
