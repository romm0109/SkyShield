import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchRuntimeState, PlayerState, RoomState } from "../contracts/models.js";
import { buildLeaderboard, stepSimulation, type QueuedShot } from "../contracts/simulation.js";
import type { GameOverSnapshot, HitConfirmedSnapshot, MatchPhase, MatchSnapshot } from "../game/types.js";
import {
  OFFLINE_CITY_HP,
  OFFLINE_COUNTDOWN_SECONDS,
  OFFLINE_MATCH_DURATION_SECONDS,
  OFFLINE_SHOT_COOLDOWN_MS,
  OFFLINE_SIMULATION_CONFIG
} from "./offlineConfig.js";

const OFFLINE_ROOM_CODE = "OFFLINE";
const OFFLINE_PLAYER_ID = "offline-player";

function toMatchSnapshot(match: MatchRuntimeState): MatchSnapshot {
  return {
    remainingSeconds: match.remainingSeconds,
    cityHp: match.cityHp,
    meteors: match.meteors,
    projectiles: match.projectiles,
    playerSlots: match.playerSlots,
    leaderboard: match.leaderboard
  };
}

function createInitialMatchSnapshot(): MatchSnapshot {
  return {
    remainingSeconds: OFFLINE_MATCH_DURATION_SECONDS,
    cityHp: OFFLINE_CITY_HP,
    meteors: [],
    projectiles: [],
    playerSlots: [],
    leaderboard: []
  };
}

function createOfflinePlayer(playerName: string, characterId: string): PlayerState {
  return {
    id: OFFLINE_PLAYER_ID,
    playerName: playerName.trim() || "Pilot",
    characterId: characterId.trim() || "bibi",
    score: 0
  };
}

function createOfflineRoomState(player: PlayerState, nowMs: number): RoomState {
  return {
    roomCode: OFFLINE_ROOM_CODE,
    hostSocketId: OFFLINE_PLAYER_ID,
    phase: "in_game",
    players: new Map([[player.id, player]]),
    match: {
      countdownSeconds: null,
      remainingSeconds: OFFLINE_MATCH_DURATION_SECONDS,
      cityHp: OFFLINE_CITY_HP,
      meteors: [],
      projectiles: [],
      playerSlots: [
        {
          playerId: player.id,
          x: OFFLINE_SIMULATION_CONFIG.playfieldWidth / 2,
          y: OFFLINE_SIMULATION_CONFIG.groundY - 24,
          lane: 0
        }
      ],
      leaderboard: [],
      playerStats: {
        [player.id]: { shotsFired: 0, hits: 0, accuracy: 0 }
      },
      nextMeteorId: 1,
      nextProjectileId: 1,
      lastMeteorSpawnMs: nowMs
    }
  };
}

export function clampOfflineShotTarget(targetX: number, targetY: number): { targetX: number; targetY: number } {
  return {
    targetX: Math.max(0, Math.min(OFFLINE_SIMULATION_CONFIG.playfieldWidth, targetX)),
    targetY: Math.max(0, Math.min(OFFLINE_SIMULATION_CONFIG.groundY, targetY))
  };
}

export function shouldThrottleOfflineShot(lastShotMs: number, nextShotMs: number): boolean {
  return nextShotMs - lastShotMs < OFFLINE_SHOT_COOLDOWN_MS;
}

export function resolveOfflineMatchResult(cityHp: number, remainingSeconds: number): GameOverSnapshot | null {
  if (cityHp <= 0) {
    return {
      result: "lose",
      reason: "city_destroyed",
      finalLeaderboard: []
    };
  }

  if (remainingSeconds <= 0) {
    return {
      result: "win",
      reason: "timer_complete",
      finalLeaderboard: []
    };
  }

  return null;
}

function buildFinalLeaderboard(room: RoomState): GameOverSnapshot["finalLeaderboard"] {
  return Array.from(room.players.values())
    .sort((a, b) => b.score - a.score)
    .map((player) => ({
      playerName: player.playerName,
      characterId: player.characterId,
      score: player.score,
      accuracy: room.match.playerStats[player.id]?.accuracy ?? 0
    }));
}

export interface UseOfflineMatchStateValue {
  phase: MatchPhase;
  countdownSeconds: number | null;
  match: MatchSnapshot;
  gameOver: GameOverSnapshot | null;
  lastHit: HitConfirmedSnapshot | null;
  status: string;
  startMatch: () => void;
  restartMatch: () => void;
  fireShot: (targetX: number, targetY: number, clientTs: number) => void;
}

export function useOfflineMatchState(playerName: string, characterId: string): UseOfflineMatchStateValue {
  const [phase, setPhase] = useState<MatchPhase>("lobby");
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [match, setMatch] = useState<MatchSnapshot>(createInitialMatchSnapshot);
  const [gameOver, setGameOver] = useState<GameOverSnapshot | null>(null);
  const [lastHit, setLastHit] = useState<HitConfirmedSnapshot | null>(null);
  const [status, setStatus] = useState("Offline mode ready");

  const roomRef = useRef<RoomState | null>(null);
  const matchStartMsRef = useRef<number>(0);
  const lastTickMsRef = useRef<number>(0);
  const lastShotMsRef = useRef<number>(0);
  const shotQueueRef = useRef<QueuedShot[]>([]);
  const frameRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCountdownTimers = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (countdownTimeoutRef.current) {
      clearTimeout(countdownTimeoutRef.current);
      countdownTimeoutRef.current = null;
    }
  }, []);

  const stopFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const resetLoopState = useCallback(() => {
    clearCountdownTimers();
    stopFrame();
    roomRef.current = null;
    shotQueueRef.current = [];
    lastShotMsRef.current = 0;
    matchStartMsRef.current = 0;
    lastTickMsRef.current = 0;
  }, [clearCountdownTimers, stopFrame]);

  const endMatch = useCallback(
    (result: GameOverSnapshot["result"], reason: GameOverSnapshot["reason"]) => {
      const room = roomRef.current;
      if (!room) {
        return;
      }

      stopFrame();
      room.phase = "game_over";
      const finalLeaderboard = buildFinalLeaderboard(room);
      setGameOver({
        result,
        reason,
        finalLeaderboard
      });
      setPhase("game_over");
      setCountdownSeconds(null);
      setStatus(result === "win" ? "Offline match complete" : "City destroyed");
    },
    [stopFrame]
  );

  const tick = useCallback(
    (nowMs: number) => {
      const room = roomRef.current;
      if (!room || room.phase !== "in_game") {
        return;
      }

      const dtMs = Math.max(1, Math.min(250, nowMs - lastTickMsRef.current));
      lastTickMsRef.current = nowMs;
      const elapsedSeconds = Math.floor((nowMs - matchStartMsRef.current) / 1000);
      const remainingSeconds = Math.max(OFFLINE_MATCH_DURATION_SECONDS - elapsedSeconds, 0);

      const queuedShots = shotQueueRef.current;
      shotQueueRef.current = [];
      const simulation = stepSimulation(room, dtMs, nowMs, queuedShots, OFFLINE_SIMULATION_CONFIG);

      for (const [playerId, delta] of Object.entries(simulation.playerDeltas)) {
        const player = room.players.get(playerId);
        if (!player) {
          continue;
        }
        room.players.set(playerId, {
          ...player,
          score: player.score + delta.scoreDelta
        });
      }

      const leaderboard = buildLeaderboard(room.players.values(), simulation.nextMatch.playerStats);
      room.match = {
        ...simulation.nextMatch,
        remainingSeconds,
        leaderboard
      };
      setMatch(toMatchSnapshot(room.match));

      if (simulation.hitEvents.length > 0) {
        const recentHit = simulation.hitEvents.at(-1) ?? null;
        setLastHit(recentHit);
      }

      const result = resolveOfflineMatchResult(room.match.cityHp, remainingSeconds);
      if (result) {
        endMatch(result.result, result.reason);
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    },
    [endMatch]
  );

  const beginMatch = useCallback(() => {
    const nowMs = performance.now();
    const player = createOfflinePlayer(playerName, characterId);
    const room = createOfflineRoomState(player, nowMs);
    room.match.leaderboard = buildLeaderboard(room.players.values(), room.match.playerStats);
    roomRef.current = room;

    setPhase("in_game");
    setCountdownSeconds(null);
    setGameOver(null);
    setLastHit(null);
    setStatus("Defend the city");
    setMatch(toMatchSnapshot(room.match));

    matchStartMsRef.current = nowMs;
    lastTickMsRef.current = nowMs;
    shotQueueRef.current = [];
    lastShotMsRef.current = 0;
    stopFrame();
    frameRef.current = requestAnimationFrame(tick);
  }, [characterId, playerName, stopFrame, tick]);

  const startMatch = useCallback(() => {
    resetLoopState();
    setPhase("countdown");
    setGameOver(null);
    setLastHit(null);
    setStatus("Match starts soon");
    setMatch(createInitialMatchSnapshot());
    setCountdownSeconds(OFFLINE_COUNTDOWN_SECONDS);

    let seconds = OFFLINE_COUNTDOWN_SECONDS;
    countdownIntervalRef.current = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        return;
      }
      setCountdownSeconds(seconds);
    }, 1000);

    countdownTimeoutRef.current = setTimeout(() => {
      clearCountdownTimers();
      beginMatch();
    }, OFFLINE_COUNTDOWN_SECONDS * 1000);
  }, [beginMatch, clearCountdownTimers, resetLoopState]);

  const restartMatch = useCallback(() => {
    startMatch();
  }, [startMatch]);

  const fireShot = useCallback((targetX: number, targetY: number, clientTs: number) => {
    if (roomRef.current?.phase !== "in_game") {
      return;
    }

    if (shouldThrottleOfflineShot(lastShotMsRef.current, clientTs)) {
      return;
    }
    lastShotMsRef.current = clientTs;

    const clamped = clampOfflineShotTarget(targetX, targetY);
    shotQueueRef.current.push({
      playerId: OFFLINE_PLAYER_ID,
      targetX: clamped.targetX,
      targetY: clamped.targetY,
      clientTs
    });
  }, []);

  useEffect(() => () => resetLoopState(), [resetLoopState]);

  return {
    phase,
    countdownSeconds,
    match,
    gameOver,
    lastHit,
    status,
    startMatch,
    restartMatch,
    fireShot
  };
}


