const DEFAULTS = {
  PORT: 3000,
  CLIENT_ORIGIN: "http://localhost:4200",
  MAX_PLAYERS_PER_ROOM: 8,
  MATCH_DURATION_SECONDS: 600,
  CITY_HP_DEFAULT: 20,
  TICK_RATE_HZ: 24
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

export interface AppEnv {
  PORT: number;
  CLIENT_ORIGIN: string;
  MAX_PLAYERS_PER_ROOM: number;
  MATCH_DURATION_SECONDS: number;
  CITY_HP_DEFAULT: number;
  TICK_RATE_HZ: number;
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
    )
  };
}
