import { useEffect, useState } from "react";
import type { LobbyState } from "@skyshield/shared-types";
import { getSocket } from "../net/socket.js";
import type { GameOverSnapshot, HitConfirmedSnapshot, MatchPhase, MatchSnapshot } from "./types.js";

const EMPTY_MATCH: MatchSnapshot = {
  remainingSeconds: 0,
  cityHp: 0,
  meteors: [],
  projectiles: [],
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

  useEffect(() => {
    setLobbyState(initialLobbyState);
  }, [initialLobbyState]);

  useEffect(() => {
    setRoomCode(initialRoomCode);
  }, [initialRoomCode]);

  useEffect(() => {
    const socket = getSocket();

    const onRoomCreated = (payload: { roomCode: string }) => {
      setRoomCode(payload.roomCode);
      setPhase("lobby");
      setGameOver(null);
    };
    const onLobbyState = (payload: LobbyState) => {
      setLobbyState(payload);
      setRoomCode(payload.roomCode);
      setPhase((current) => (current === "in_game" || current === "countdown" ? current : "lobby"));
    };
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
      setGameOver(payload);
      setPhase("game_over");
      setCountdownSeconds(null);
    };

    socket.on("room_created", onRoomCreated);
    socket.on("lobby_state", onLobbyState);
    socket.on("game_countdown", onCountdown);
    socket.on("game_state", onGameState);
    socket.on("hit_confirmed", onHitConfirmed);
    socket.on("game_over", onGameOver);

    return () => {
      socket.off("room_created", onRoomCreated);
      socket.off("lobby_state", onLobbyState);
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
