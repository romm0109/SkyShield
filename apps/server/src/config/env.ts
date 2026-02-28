const DEFAULTS = {
  PORT: 3000,
  CLIENT_ORIGIN: "http://localhost:4200",
  MAX_PLAYERS_PER_ROOM: 8,
  MATCH_DURATION_SECONDS: 120,
  CITY_HP_DEFAULT: 20,
  TICK_RATE_HZ: 24,
  PLAYFIELD_WIDTH: 480,
  METEOR_GROUND_Y: 720,
  METEOR_SPAWN_INTERVAL_MS: 900,
  METEOR_LIGHT_SPEED: 130,
  METEOR_HEAVY_SPEED: 80,
  METEOR_LIGHT_RADIUS: 24,
  METEOR_HEAVY_RADIUS: 34,
  METEOR_HEAVY_SPAWN_EVERY: 4,
  PROJECTILE_SPEED: 950,
  PROJECTILE_RADIUS: 10,
  PROJECTILE_DESPAWN_Y: -60
} as const;

function parsePositiveInt(name: string, rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric env ${name}: ${rawValue}`);
  }

  return parsed;
}

function parseFiniteNumber(name: string, rawValue: string | undefined, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric env ${name}: ${rawValue}`);
  }

  return parsed;
}

export interface AppEnv {
  PORT: number;
  CLIENT_ORIGIN: string;
  MAX_PLAYERS_PER_ROOM: number;
  MATCH_DURATION_SECONDS: number;
  CITY_HP_DEFAULT: number;
  TICK_RATE_HZ: number;
  PLAYFIELD_WIDTH: number;
  METEOR_GROUND_Y: number;
  METEOR_SPAWN_INTERVAL_MS: number;
  METEOR_LIGHT_SPEED: number;
  METEOR_HEAVY_SPEED: number;
  METEOR_LIGHT_RADIUS: number;
  METEOR_HEAVY_RADIUS: number;
  METEOR_HEAVY_SPAWN_EVERY: number;
  PROJECTILE_SPEED: number;
  PROJECTILE_RADIUS: number;
  PROJECTILE_DESPAWN_Y: number;
}

export function loadEnv(): AppEnv {
  return {
    PORT: parsePositiveInt("PORT", process.env.PORT, DEFAULTS.PORT),
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? DEFAULTS.CLIENT_ORIGIN,
    MAX_PLAYERS_PER_ROOM: parsePositiveInt(
      "MAX_PLAYERS_PER_ROOM",
      process.env.MAX_PLAYERS_PER_ROOM,
      DEFAULTS.MAX_PLAYERS_PER_ROOM
    ),
    MATCH_DURATION_SECONDS: parsePositiveInt(
      "MATCH_DURATION_SECONDS",
      process.env.MATCH_DURATION_SECONDS,
      DEFAULTS.MATCH_DURATION_SECONDS
    ),
    CITY_HP_DEFAULT: parsePositiveInt(
      "CITY_HP_DEFAULT",
      process.env.CITY_HP_DEFAULT,
      DEFAULTS.CITY_HP_DEFAULT
    ),
    TICK_RATE_HZ: parsePositiveInt(
      "TICK_RATE_HZ",
      process.env.TICK_RATE_HZ,
      DEFAULTS.TICK_RATE_HZ
    ),
    PLAYFIELD_WIDTH: parsePositiveInt(
      "PLAYFIELD_WIDTH",
      process.env.PLAYFIELD_WIDTH,
      DEFAULTS.PLAYFIELD_WIDTH
    ),
    METEOR_GROUND_Y: parsePositiveInt(
      "METEOR_GROUND_Y",
      process.env.METEOR_GROUND_Y,
      DEFAULTS.METEOR_GROUND_Y
    ),
    METEOR_SPAWN_INTERVAL_MS: parsePositiveInt(
      "METEOR_SPAWN_INTERVAL_MS",
      process.env.METEOR_SPAWN_INTERVAL_MS,
      DEFAULTS.METEOR_SPAWN_INTERVAL_MS
    ),
    METEOR_LIGHT_SPEED: parsePositiveInt(
      "METEOR_LIGHT_SPEED",
      process.env.METEOR_LIGHT_SPEED,
      DEFAULTS.METEOR_LIGHT_SPEED
    ),
    METEOR_HEAVY_SPEED: parsePositiveInt(
      "METEOR_HEAVY_SPEED",
      process.env.METEOR_HEAVY_SPEED,
      DEFAULTS.METEOR_HEAVY_SPEED
    ),
    METEOR_LIGHT_RADIUS: parsePositiveInt(
      "METEOR_LIGHT_RADIUS",
      process.env.METEOR_LIGHT_RADIUS,
      DEFAULTS.METEOR_LIGHT_RADIUS
    ),
    METEOR_HEAVY_RADIUS: parsePositiveInt(
      "METEOR_HEAVY_RADIUS",
      process.env.METEOR_HEAVY_RADIUS,
      DEFAULTS.METEOR_HEAVY_RADIUS
    ),
    METEOR_HEAVY_SPAWN_EVERY: parsePositiveInt(
      "METEOR_HEAVY_SPAWN_EVERY",
      process.env.METEOR_HEAVY_SPAWN_EVERY,
      DEFAULTS.METEOR_HEAVY_SPAWN_EVERY
    ),
    PROJECTILE_SPEED: parsePositiveInt(
      "PROJECTILE_SPEED",
      process.env.PROJECTILE_SPEED,
      DEFAULTS.PROJECTILE_SPEED
    ),
    PROJECTILE_RADIUS: parsePositiveInt(
      "PROJECTILE_RADIUS",
      process.env.PROJECTILE_RADIUS,
      DEFAULTS.PROJECTILE_RADIUS
    ),
    PROJECTILE_DESPAWN_Y: parseFiniteNumber(
      "PROJECTILE_DESPAWN_Y",
      process.env.PROJECTILE_DESPAWN_Y,
      DEFAULTS.PROJECTILE_DESPAWN_Y
    )
  };
}
