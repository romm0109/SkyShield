import type { MatchRuntimeState, MeteorState, PlayerState, ProjectileState, RoomState } from "./models.js";

export interface QueuedShot {
  playerId: string;
  targetX: number;
  targetY: number;
  clientTs: number;
}

export interface SimulationConfig {
  playfieldWidth: number;
  groundY: number;
  meteorSpawnIntervalMs: number;
  meteorLightSpeed: number;
  meteorHeavySpeed: number;
  meteorLightRadius: number;
  meteorHeavyRadius: number;
  meteorHeavySpawnEvery: number;
  projectileSpeed: number;
  projectileRadius: number;
  projectileDespawnY: number;
  lightMeteorPoints: number;
  heavyMeteorPoints: number;
}

export interface HitConfirmedEvent {
  meteorId: string;
  byPlayerId: string;
  points: number;
}

export interface PlayerDelta {
  scoreDelta: number;
  shotsDelta: number;
  hitsDelta: number;
}

export interface SimulationResult {
  nextMatch: MatchRuntimeState;
  playerDeltas: Record<string, PlayerDelta>;
  hitEvents: HitConfirmedEvent[];
}

const PROJECTILE_START_OFFSET_Y = 24;

function createMeteor(match: MatchRuntimeState, config: SimulationConfig, spawnIndex: number, nowMs: number): MeteorState {
  const nextId = match.nextMeteorId + spawnIndex;
  const isHeavy = nextId % config.meteorHeavySpawnEvery === 0;
  const radius = isHeavy ? config.meteorHeavyRadius : config.meteorLightRadius;
  const laneCount = 6;
  const laneWidth = config.playfieldWidth / laneCount;
  const lane = (nextId - 1) % laneCount;
  const x = lane * laneWidth + laneWidth / 2;

  return {
    id: `m-${nextId}`,
    type: isHeavy ? "heavy" : "light",
    x,
    y: -radius,
    radius,
    speed: isHeavy ? config.meteorHeavySpeed : config.meteorLightSpeed,
    hp: isHeavy ? 2 : 1,
    maxHp: isHeavy ? 2 : 1,
    createdAtMs: nowMs
  };
}

function withPlayerDelta(state: Record<string, PlayerDelta>, playerId: string): PlayerDelta {
  const current = state[playerId];
  if (current) {
    return current;
  }

  const next: PlayerDelta = { scoreDelta: 0, shotsDelta: 0, hitsDelta: 0 };
  state[playerId] = next;
  return next;
}

function spawnProjectiles(
  room: RoomState,
  queuedShots: QueuedShot[],
  config: SimulationConfig,
  nowMs: number,
  playerDeltas: Record<string, PlayerDelta>
): ProjectileState[] {
  const originX = config.playfieldWidth / 2;
  const originY = config.groundY - PROJECTILE_START_OFFSET_Y;

  const projectiles: ProjectileState[] = [];
  for (const shot of queuedShots) {
    if (!room.players.has(shot.playerId)) {
      continue;
    }

    const delta = withPlayerDelta(playerDeltas, shot.playerId);
    delta.shotsDelta += 1;

    const dx = shot.targetX - originX;
    const dy = shot.targetY - originY;
    const magnitude = Math.hypot(dx, dy) || 1;
    const vx = (dx / magnitude) * config.projectileSpeed;
    const vy = (dy / magnitude) * config.projectileSpeed;

    const id = `p-${room.match.nextProjectileId + projectiles.length}`;
    projectiles.push({
      id,
      ownerId: shot.playerId,
      x: originX,
      y: originY,
      vx,
      vy,
      radius: config.projectileRadius,
      speed: config.projectileSpeed,
      targetX: shot.targetX,
      targetY: shot.targetY,
      createdAtMs: nowMs
    });
  }

  return projectiles;
}

function toAccuracy(shotsFired: number, hits: number): number {
  if (shotsFired <= 0) {
    return 0;
  }
  return Math.round((hits / shotsFired) * 10000) / 100;
}

export function stepSimulation(
  room: RoomState,
  dtMs: number,
  nowMs: number,
  queuedShots: QueuedShot[],
  config: SimulationConfig
): SimulationResult {
  const dtSec = Math.max(dtMs, 1) / 1000;
  const playerDeltas: Record<string, PlayerDelta> = {};
  const hitEvents: HitConfirmedEvent[] = [];

  const spawnedProjectiles = spawnProjectiles(room, queuedShots, config, nowMs, playerDeltas);
  const movedProjectiles: ProjectileState[] = [...room.match.projectiles, ...spawnedProjectiles].map((projectile) => ({
    ...projectile,
    x: projectile.x + projectile.vx * dtSec,
    y: projectile.y + projectile.vy * dtSec
  }));

  const spawnFromMs = room.match.lastMeteorSpawnMs ?? nowMs;
  const elapsedFromLastSpawn = Math.max(0, nowMs - spawnFromMs);
  const spawnCount = Math.floor(elapsedFromLastSpawn / config.meteorSpawnIntervalMs);
  const spawnedMeteors = Array.from({ length: spawnCount }, (_, idx) => createMeteor(room.match, config, idx, nowMs));
  const movedMeteors: MeteorState[] = [...room.match.meteors, ...spawnedMeteors].map((meteor) => ({
    ...meteor,
    y: meteor.y + meteor.speed * dtSec
  }));

  const nextMeteors = movedMeteors.map((meteor) => ({ ...meteor }));
  const nextProjectiles = movedProjectiles.map((projectile) => ({ ...projectile }));

  for (let projectileIndex = 0; projectileIndex < nextProjectiles.length; projectileIndex += 1) {
    const projectile = nextProjectiles[projectileIndex];
    if (!projectile) {
      continue;
    }

    let hitMeteorIndex = -1;
    for (let meteorIndex = 0; meteorIndex < nextMeteors.length; meteorIndex += 1) {
      const meteor = nextMeteors[meteorIndex];
      if (!meteor) {
        continue;
      }

      const maxDistance = projectile.radius + meteor.radius;
      const distance = Math.hypot(projectile.x - meteor.x, projectile.y - meteor.y);
      if (distance <= maxDistance) {
        hitMeteorIndex = meteorIndex;
        break;
      }
    }

    if (hitMeteorIndex < 0) {
      continue;
    }

    const meteor = nextMeteors[hitMeteorIndex];
    if (!meteor) {
      continue;
    }

    const ownerDelta = withPlayerDelta(playerDeltas, projectile.ownerId);
    ownerDelta.hitsDelta += 1;
    meteor.hp -= 1;

    let points = 0;
    if (meteor.hp <= 0) {
      points = meteor.type === "heavy" ? config.heavyMeteorPoints : config.lightMeteorPoints;
      ownerDelta.scoreDelta += points;
      nextMeteors.splice(hitMeteorIndex, 1);
    }

    hitEvents.push({
      meteorId: meteor.id,
      byPlayerId: projectile.ownerId,
      points
    });

    nextProjectiles.splice(projectileIndex, 1);
    projectileIndex -= 1;
  }

  let cityDamage = 0;
  const survivingMeteors: MeteorState[] = [];
  for (const meteor of nextMeteors) {
    if (meteor.y >= config.groundY) {
      cityDamage += 1;
      continue;
    }
    survivingMeteors.push(meteor);
  }

  const survivingProjectiles = nextProjectiles.filter(
    (projectile) =>
      projectile.y > config.projectileDespawnY &&
      projectile.x >= -config.projectileRadius &&
      projectile.x <= config.playfieldWidth + config.projectileRadius
  );

  const nextPlayerStats = { ...room.match.playerStats };
  for (const player of room.players.values()) {
    const current = room.match.playerStats[player.id] ?? { shotsFired: 0, hits: 0, accuracy: 0 };
    const delta = playerDeltas[player.id] ?? { scoreDelta: 0, shotsDelta: 0, hitsDelta: 0 };
    const shotsFired = current.shotsFired + delta.shotsDelta;
    const hits = current.hits + delta.hitsDelta;
    nextPlayerStats[player.id] = {
      shotsFired,
      hits,
      accuracy: toAccuracy(shotsFired, hits)
    };
  }

  const nextMatch: MatchRuntimeState = {
    ...room.match,
    cityHp: Math.max(0, room.match.cityHp - cityDamage),
    meteors: survivingMeteors,
    projectiles: survivingProjectiles,
    playerStats: nextPlayerStats,
    nextMeteorId: room.match.nextMeteorId + spawnCount,
    nextProjectileId: room.match.nextProjectileId + spawnedProjectiles.length,
    lastMeteorSpawnMs:
      spawnCount > 0
        ? spawnFromMs + spawnCount * config.meteorSpawnIntervalMs
        : room.match.lastMeteorSpawnMs ?? nowMs
  };

  return {
    nextMatch,
    playerDeltas,
    hitEvents
  };
}

export function buildLeaderboard(players: Iterable<PlayerState>, stats: MatchRuntimeState["playerStats"]): MatchRuntimeState["leaderboard"] {
  const sorted = Array.from(players).sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const statsA = stats[a.id] ?? { shotsFired: 0, hits: 0, accuracy: 0 };
    const statsB = stats[b.id] ?? { shotsFired: 0, hits: 0, accuracy: 0 };
    if (statsB.hits !== statsA.hits) {
      return statsB.hits - statsA.hits;
    }
    return a.playerName.localeCompare(b.playerName);
  });

  return sorted.map((player, index) => {
    const playerStats = stats[player.id] ?? { shotsFired: 0, hits: 0, accuracy: 0 };
    return {
      id: player.id,
      playerName: player.playerName,
      score: player.score,
      rank: index + 1,
      shotsFired: playerStats.shotsFired,
      hits: playerStats.hits,
      accuracy: playerStats.accuracy
    };
  });
}
