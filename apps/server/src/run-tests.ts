import assert from "node:assert/strict";
import { RoomStore } from "./rooms/roomStore.js";
import { buildLeaderboard, stepSimulation, type SimulationConfig } from "./game-loop/simulation.js";
import { createSocketRateLimiter } from "./events/rateLimit.js";

const store = new RoomStore(8);
const room = store.createRoom({
  socketId: "host-1",
  playerName: "Host",
  characterId: "scout"
});

assert.equal(room.roomCode.length, 4);
assert.equal(room.hostSocketId, "host-1");
assert.equal(room.phase, "lobby");
assert.equal(room.match.countdownSeconds, null);
assert.equal(room.players.size, 1);

const limited = new RoomStore(1);
const limitedRoom = limited.createRoom({
  socketId: "host-1",
  playerName: "Host",
  characterId: "scout"
});
const joinResult = limited.joinRoom({
  roomCode: limitedRoom.roomCode,
  socketId: "p2",
  playerName: "P2",
  characterId: "pilot"
});
assert.equal("error" in joinResult ? joinResult.error : undefined, "ROOM_FULL");

store.joinRoom({
  roomCode: room.roomCode,
  socketId: "p2",
  playerName: "Guest",
  characterId: "pilot"
});
const updated = store.removePlayer("host-1");
assert.equal(updated?.hostSocketId, "p2");
assert.equal(store.isHost(room.roomCode, "p2"), true);
assert.equal(store.isHost(room.roomCode, "host-1"), false);

const simConfig: SimulationConfig = {
  playfieldWidth: 480,
  groundY: 720,
  meteorSpawnIntervalMs: 1000,
  meteorLightSpeed: 120,
  meteorHeavySpeed: 80,
  meteorLightRadius: 20,
  meteorHeavyRadius: 28,
  meteorHeavySpawnEvery: 2,
  projectileSpeed: 800,
  projectileRadius: 10,
  projectileDespawnY: -60,
  lightMeteorPoints: 10,
  heavyMeteorPoints: 25
};

const gameplayStore = new RoomStore(8, { matchDurationSeconds: 20, cityHp: 2 });
const gameplayRoom = gameplayStore.createRoom({
  socketId: "p1",
  playerName: "Host",
  characterId: "scout"
});
gameplayStore.setRoomPhase(gameplayRoom.roomCode, "in_game");
gameplayStore.updateMatchState(gameplayRoom.roomCode, (match) => ({
  ...match,
  lastMeteorSpawnMs: 0,
  meteors: [
    {
      id: "m-1",
      type: "light",
      x: 240,
      y: 696,
      radius: 20,
      speed: 0,
      hp: 1,
      maxHp: 1,
      createdAtMs: 0
    }
  ],
  playerStats: { p1: { shotsFired: 0, hits: 0, accuracy: 0 } }
}));
const gameplaySnapshot = gameplayStore.getRoom(gameplayRoom.roomCode);
if (!gameplaySnapshot) {
  throw new Error("Missing gameplay room");
}

const simResult = stepSimulation(
  gameplaySnapshot,
  16,
  10,
  [{ playerId: "p1", targetX: 240, targetY: 696, clientTs: 1 }],
  simConfig
);
assert.equal(simResult.hitEvents.length, 1);
assert.equal(simResult.hitEvents[0]?.points, 10);
assert.equal(simResult.nextMatch.playerStats.p1?.accuracy, 100);
gameplayStore.updatePlayer(gameplayRoom.roomCode, "p1", (player) => ({
  ...player,
  score: player.score + (simResult.playerDeltas.p1?.scoreDelta ?? 0)
}));
const player = gameplayStore.getRoom(gameplayRoom.roomCode)?.players.get("p1");
if (!player) {
  throw new Error("Missing player");
}
const leaderboard = buildLeaderboard([player], simResult.nextMatch.playerStats);
assert.equal(leaderboard[0]?.score, 10);

let nowMs = 1_000;
const limiter = createSocketRateLimiter({ minIntervalMs: 400, now: () => nowMs });
assert.equal(limiter.allow("socket-1", "create_room"), true);
nowMs += 120;
assert.equal(limiter.allow("socket-1", "create_room"), false);
assert.equal(limiter.allow("socket-2", "create_room"), true);
nowMs += 400;
assert.equal(limiter.allow("socket-1", "create_room"), true);

console.log("apps/server unit tests passed");
