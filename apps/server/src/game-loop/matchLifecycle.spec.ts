import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppEnv } from "../config/env.js";
import { MatchLifecycleManager } from "./matchLifecycle.js";
import { RoomStore } from "../rooms/roomStore.js";

interface EmittedEvent {
  roomCode: string;
  event: string;
  payload: unknown;
}

class FakeIo {
  public readonly events: EmittedEvent[] = [];

  public to(roomCode: string): { emit: (event: string, payload: unknown) => void } {
    return {
      emit: (event, payload) => {
        this.events.push({ roomCode, event, payload });
      }
    };
  }
}

class FakeTimers {
  private nowMs = 0;
  private nextId = 1;
  private readonly intervals = new Map<number, { ms: number; nextAt: number; callback: () => void }>();
  private readonly timeouts = new Map<number, { at: number; callback: () => void }>();

  public get now(): number {
    return this.nowMs;
  }

  public setInterval(callback: () => void, ms: number): NodeJS.Timeout {
    const id = this.nextId++;
    this.intervals.set(id, { ms, nextAt: this.nowMs + ms, callback });
    return id as unknown as NodeJS.Timeout;
  }

  public clearInterval(timer: NodeJS.Timeout): void {
    this.intervals.delete(timer as unknown as number);
  }

  public setTimeout(callback: () => void, ms: number): NodeJS.Timeout {
    const id = this.nextId++;
    this.timeouts.set(id, { at: this.nowMs + ms, callback });
    return id as unknown as NodeJS.Timeout;
  }

  public clearTimeout(timer: NodeJS.Timeout): void {
    this.timeouts.delete(timer as unknown as number);
  }

  public advanceBy(ms: number): void {
    const target = this.nowMs + ms;
    while (true) {
      let nextAt = Number.POSITIVE_INFINITY;
      let timeoutId: number | undefined;
      let intervalId: number | undefined;

      for (const [id, timeout] of this.timeouts.entries()) {
        if (timeout.at < nextAt) {
          nextAt = timeout.at;
          timeoutId = id;
          intervalId = undefined;
        }
      }

      for (const [id, interval] of this.intervals.entries()) {
        if (interval.nextAt < nextAt) {
          nextAt = interval.nextAt;
          timeoutId = undefined;
          intervalId = id;
        }
      }

      if (nextAt > target) {
        this.nowMs = target;
        return;
      }

      this.nowMs = nextAt;
      if (timeoutId !== undefined) {
        const timeout = this.timeouts.get(timeoutId);
        if (timeout) {
          this.timeouts.delete(timeoutId);
          timeout.callback();
        }
      } else if (intervalId !== undefined) {
        const interval = this.intervals.get(intervalId);
        if (interval) {
          interval.callback();
          interval.nextAt += interval.ms;
        }
      }
    }
  }
}

function createEnv(): AppEnv {
  return {
    PORT: 3000,
    CLIENT_ORIGIN: "http://localhost:4200",
    MAX_PLAYERS_PER_ROOM: 8,
    MATCH_DURATION_SECONDS: 2,
    CITY_HP_DEFAULT: 20,
    TICK_RATE_HZ: 2
  };
}

describe("MatchLifecycleManager", () => {
  it("emits countdown sequence 3 -> 2 -> 1", () => {
    const timers = new FakeTimers();
    const io = new FakeIo();
    const roomStore = new RoomStore(8, { matchDurationSeconds: 2, cityHp: 20 });
    const room = roomStore.createRoom({ socketId: "host-1", playerName: "Host", characterId: "scout" });
    const manager = new MatchLifecycleManager(io as never, roomStore, createEnv(), () => timers.now, timers);

    assert.equal(manager.startCountdown(room.roomCode), true);
    timers.advanceBy(2000);

    const countdown = io.events.filter((entry) => entry.event === "game_countdown").map((entry) => entry.payload as { seconds: number });
    assert.deepEqual(countdown.map((entry) => entry.seconds), [3, 2, 1]);
  });

  it("transitions room phase lobby -> countdown -> in_game -> game_over", () => {
    const timers = new FakeTimers();
    const io = new FakeIo();
    const roomStore = new RoomStore(8, { matchDurationSeconds: 2, cityHp: 20 });
    const room = roomStore.createRoom({ socketId: "host-1", playerName: "Host", characterId: "scout" });
    const manager = new MatchLifecycleManager(io as never, roomStore, createEnv(), () => timers.now, timers);

    assert.equal(roomStore.getRoom(room.roomCode)?.phase, "lobby");
    manager.startCountdown(room.roomCode);
    assert.equal(roomStore.getRoom(room.roomCode)?.phase, "countdown");

    timers.advanceBy(3000);
    assert.equal(roomStore.getRoom(room.roomCode)?.phase, "in_game");

    timers.advanceBy(2000);
    assert.equal(roomStore.getRoom(room.roomCode)?.phase, "game_over");
  });

  it("emits game_over on timer completion with timer_complete reason", () => {
    const timers = new FakeTimers();
    const io = new FakeIo();
    const roomStore = new RoomStore(8, { matchDurationSeconds: 2, cityHp: 20 });
    const room = roomStore.createRoom({ socketId: "host-1", playerName: "Host", characterId: "scout" });
    const manager = new MatchLifecycleManager(io as never, roomStore, createEnv(), () => timers.now, timers);

    manager.startCountdown(room.roomCode);
    timers.advanceBy(5000);

    const gameOver = io.events.find((entry) => entry.event === "game_over");
    assert.deepEqual(gameOver?.payload, {
      result: "win",
      reason: "timer_complete",
      finalLeaderboard: [{ playerName: "Host", characterId: "scout", score: 0, accuracy: 0 }]
    });
  });
});
