import { useEffect, useRef, useState } from "react";
import type { LobbyState } from "@skyshield/shared-types";
import { getSocket } from "../net/socket.js";
import { playGameOver } from "../audio/sfx.js";
import type { GameOverSnapshot, HitConfirmedSnapshot, MatchPhase, MatchSnapshot } from "./types.js";

const EMPTY_MATCH: MatchSnapshot = {
  remainingSeconds: 0,
  cityHp: 0,
  meteors: [],
  projectiles: [],
  playerSlots: [],
  leaderboard: []
};

export interface UseMatchStateValue {
  phase: MatchPhase;
  countdownSeconds: number | null;
  lastHit: HitConfirmedSnapshot | null;
  match: MatchSnapshot;
  gameOver: GameOverSnapshot | null;
  lobbyState: LobbyState | null;
  roomCode: string;
}

export function useMatchState(initialLobbyState: LobbyState | null, initialRoomCode: string): UseMatchStateValue {
  const [phase, setPhase] = useState<MatchPhase>("lobby");
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [lastHit, setLastHit] = useState<HitConfirmedSnapshot | null>(null);
  const [match, setMatch] = useState<MatchSnapshot>(EMPTY_MATCH);
  const [gameOver, setGameOver] = useState<GameOverSnapshot | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(initialLobbyState);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const lastGameOverSignatureRef = useRef("");

  useEffect(() => {
    setLobbyState(initialLobbyState);
  }, [initialLobbyState]);

  useEffect(() => {
    setRoomCode(initialRoomCode);
    if (!initialRoomCode) {
      setPhase("lobby");
      setCountdownSeconds(null);
      setGameOver(null);
      setLastHit(null);
      setMatch(EMPTY_MATCH);
      lastGameOverSignatureRef.current = "";
    }
  }, [initialRoomCode]);

  useEffect(() => {
    const socket = getSocket();

    const onCountdown = (payload: { seconds: number }) => {
      setCountdownSeconds(payload.seconds);
      setPhase("countdown");
    };
    const onGameState = (payload: MatchSnapshot) => {
      setMatch(payload);
      setPhase("in_game");
      setCountdownSeconds(null);
    };
    const onHitConfirmed = (payload: HitConfirmedSnapshot) => {
      setLastHit(payload);
    };
    const onGameOver = (payload: GameOverSnapshot) => {
      const signature = `${payload.result}:${payload.reason}:${payload.finalLeaderboard
        .map((entry) => `${entry.playerName}:${entry.score}:${entry.accuracy}`)
        .join("|")}`;
      if (signature !== lastGameOverSignatureRef.current) {
        lastGameOverSignatureRef.current = signature;
        void playGameOver();
      }
      setGameOver(payload);
      setPhase("game_over");
      setCountdownSeconds(null);
    };

    socket.on("game_countdown", onCountdown);
    socket.on("game_state", onGameState);
    socket.on("hit_confirmed", onHitConfirmed);
    socket.on("game_over", onGameOver);

    return () => {
      socket.off("game_countdown", onCountdown);
      socket.off("game_state", onGameState);
      socket.off("hit_confirmed", onHitConfirmed);
      socket.off("game_over", onGameOver);
    };
  }, []);

  return {
    phase,
    countdownSeconds,
    lastHit,
    match,
    gameOver,
    lobbyState,
    roomCode
  };
}
