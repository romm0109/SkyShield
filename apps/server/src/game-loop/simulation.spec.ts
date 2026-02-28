import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLeaderboard, stepSimulation, type SimulationConfig } from "../contracts/simulation.js";
import type { RoomState } from "../contracts/models.js";

const config: SimulationConfig = {
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

function createRoom(): RoomState {
  return {
    roomCode: "AB12",
    hostSocketId: "p1",
    phase: "in_game",
    players: new Map([
      ["p1", { id: "p1", playerName: "Host", characterId: "scout", score: 0 }],
      ["p2", { id: "p2", playerName: "Guest", characterId: "pilot", score: 0 }]
    ]),
    match: {
      countdownSeconds: null,
      remainingSeconds: 90,
      cityHp: 5,
      meteors: [],
      projectiles: [],
      playerSlots: [
        { playerId: "p1", x: 160, y: 696, lane: 0 },
        { playerId: "p2", x: 320, y: 696, lane: 1 }
      ],
      leaderboard: [],
      playerStats: {
        p1: { shotsFired: 0, hits: 0, accuracy: 0 },
        p2: { shotsFired: 0, hits: 0, accuracy: 0 }
      },
      nextMeteorId: 1,
      nextProjectileId: 1,
      lastMeteorSpawnMs: 0
    }
  };
}

describe("stepSimulation", () => {
  it("spawns meteors by cadence", () => {
    const room = createRoom();
    const result = stepSimulation(room, 16, 3000, [], config);
    assert.equal(result.nextMatch.meteors.length, 3);
    assert.equal(result.nextMatch.nextMeteorId, 4);
  });

  it("applies heavy meteor two-hit and last-hit scoring", () => {
    const room = createRoom();
    room.match.nextMeteorId = 2;
    room.match.meteors = [
      {
        id: "m-2",
        type: "heavy",
        x: 240,
        y: 120,
        radius: 28,
        speed: 0,
        hp: 2,
        maxHp: 2,
        createdAtMs: 0
      }
    ];
    room.match.projectiles = [
      {
        id: "p-1",
        ownerId: "p1",
        x: 240,
        y: 120,
        vx: 0,
        vy: 0,
        radius: 10,
        speed: 800,
        targetX: 240,
        targetY: 120,
        createdAtMs: 0
      },
      {
        id: "p-2",
        ownerId: "p2",
        x: 240,
        y: 120,
        vx: 0,
        vy: 0,
        radius: 10,
        speed: 800,
        targetX: 240,
        targetY: 120,
        createdAtMs: 0
      }
    ];

    const result = stepSimulation(room, 16, 100, [], config);
    assert.equal(result.nextMatch.meteors.length, 0);
    assert.equal(result.playerDeltas.p1?.hitsDelta, 1);
    assert.equal(result.playerDeltas.p1?.scoreDelta, 0);
    assert.equal(result.playerDeltas.p2?.hitsDelta, 1);
    assert.equal(result.playerDeltas.p2?.scoreDelta, 25);
    assert.deepEqual(
      result.hitEvents.map((event) => event.points),
      [0, 25]
    );
  });

  it("decrements city HP for meteors reaching ground", () => {
    const room = createRoom();
    room.match.meteors = [
      {
        id: "m-1",
        type: "light",
        x: 100,
        y: 719,
        radius: 20,
        speed: 20,
        hp: 1,
        maxHp: 1,
        createdAtMs: 0
      }
    ];

    const result = stepSimulation(room, 100, 100, [], config);
    assert.equal(result.nextMatch.cityHp, 4);
    assert.equal(result.nextMatch.meteors.length, 0);
  });

  it("increases meteor speed every 10 seconds elapsed", () => {
    const room = createRoom();
    room.match.meteors = [
      {
        id: "m-1",
        type: "light",
        x: 100,
        y: 0,
        radius: 20,
        speed: 120,
        hp: 1,
        maxHp: 1,
        createdAtMs: 0
      }
    ];

    const result = stepSimulation(room, 100, 100, [], config, 10_000);
    const meteor = result.nextMatch.meteors[0];
    assert.ok(meteor);
    assert.equal(meteor.speed, 150);
    assert.ok(Math.abs(meteor.y - 15) < 1e-9);
  });

  it("spawns projectiles from each shooter slot origin", () => {
    const room = createRoom();
    const result = stepSimulation(
      room,
      16,
      100,
      [
        { playerId: "p1", targetX: 150, targetY: 120, clientTs: 1 },
        { playerId: "p2", targetX: 330, targetY: 120, clientTs: 2 }
      ],
      config
    );

    assert.equal(result.nextMatch.projectiles.length, 2);
    const projectileOne = result.nextMatch.projectiles.find((projectile) => projectile.ownerId === "p1");
    const projectileTwo = result.nextMatch.projectiles.find((projectile) => projectile.ownerId === "p2");
    assert.equal(projectileOne?.x, 160);
    assert.equal(projectileOne?.y, 696);
    assert.equal(projectileTwo?.x, 320);
    assert.equal(projectileTwo?.y, 696);
  });

  it("allows different shooters to score in the same simulation step", () => {
    const room = createRoom();
    room.match.meteors = [
      {
        id: "m-1",
        type: "light",
        x: 160,
        y: 696,
        radius: 20,
        speed: 0,
        hp: 1,
        maxHp: 1,
        createdAtMs: 0
      },
      {
        id: "m-2",
        type: "light",
        x: 320,
        y: 696,
        radius: 20,
        speed: 0,
        hp: 1,
        maxHp: 1,
        createdAtMs: 0
      }
    ];

    const result = stepSimulation(
      room,
      16,
      100,
      [
        { playerId: "p1", targetX: 160, targetY: 696, clientTs: 1 },
        { playerId: "p2", targetX: 320, targetY: 696, clientTs: 2 }
      ],
      config
    );

    assert.equal(result.playerDeltas.p1?.scoreDelta, 10);
    assert.equal(result.playerDeltas.p2?.scoreDelta, 10);
    assert.equal(result.hitEvents.length, 2);
    assert.equal(result.nextMatch.meteors.length, 0);
  });
});

describe("buildLeaderboard", () => {
  it("ranks by score with accuracy stats", () => {
    const room = createRoom();
    room.players.get("p1")!.score = 40;
    room.players.get("p2")!.score = 10;
    room.match.playerStats.p1 = { shotsFired: 10, hits: 7, accuracy: 70 };
    room.match.playerStats.p2 = { shotsFired: 3, hits: 1, accuracy: 33.33 };

    const board = buildLeaderboard(room.players.values(), room.match.playerStats);
    assert.equal(board[0]?.id, "p1");
    assert.equal(board[0]?.accuracy, 70);
  });
});


