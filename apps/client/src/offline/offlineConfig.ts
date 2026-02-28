import type { SimulationConfig } from "../contracts/simulation.js";

export const OFFLINE_MATCH_DURATION_SECONDS = 600;
export const OFFLINE_CITY_HP = 20;
export const OFFLINE_COUNTDOWN_SECONDS = 3;
export const OFFLINE_SHOT_COOLDOWN_MS = 400;

// Keep these values aligned with apps/server/src/config/env.ts defaults.
export const OFFLINE_SIMULATION_CONFIG: SimulationConfig = {
  playfieldWidth: 480,
  groundY: 720,
  meteorSpawnIntervalMs: 900,
  meteorLightSpeed: 130,
  meteorHeavySpeed: 80,
  meteorLightRadius: 24,
  meteorHeavyRadius: 34,
  meteorHeavySpawnEvery: 4,
  projectileSpeed: 950,
  projectileRadius: 10,
  projectileDespawnY: -60,
  lightMeteorPoints: 10,
  heavyMeteorPoints: 25
};

