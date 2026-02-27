import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { LobbyState } from "@skyshield/shared-types";
import { useMatchState, type UseMatchStateValue } from "../game/useMatchState.js";
import { connectSocket, getSocket } from "../net/socket.js";

const PLAYER_NAME_KEY = "skyshield.playerName";
const CHARACTER_ID_KEY = "skyshield.characterId";

export function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase();
}

interface ProfileSnapshot {
  playerName: string;
  characterId: string;
}

function readInitialProfile(): ProfileSnapshot {
  return {
    playerName: localStorage.getItem(PLAYER_NAME_KEY) ?? "",
    characterId: localStorage.getItem(CHARACTER_ID_KEY) ?? "scout"
  };
}

function isValidProfile(profile: ProfileSnapshot): boolean {
  const trimmedName = profile.playerName.trim();
  const trimmedCharacterId = profile.characterId.trim();
  return trimmedName.length >= 2 && trimmedName.length <= 16 && trimmedCharacterId.length > 0;
}

export interface SessionStoreValue {
  playerName: string;
  characterId: string;
  roomCodeInput: string;
  activeRoomCode: string;
  status: string;
  lobbyState: LobbyState | null;
  matchState: UseMatchStateValue;
  setPlayerName: (value: string) => void;
  setCharacterId: (value: string) => void;
  setRoomCodeInput: (value: string) => void;
  createRoom: () => void;
  joinRoom: () => void;
  startGame: () => void;
  clearSessionRoom: () => void;
}

const SessionStoreContext = createContext<SessionStoreValue | null>(null);

export function SessionStoreProvider({ children }: { children: ReactNode }) {
  const initialProfile = useMemo(readInitialProfile, []);
  const [playerName, setPlayerName] = useState(initialProfile.playerName);
  const [characterId, setCharacterId] = useState(initialProfile.characterId);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [activeRoomCode, setActiveRoomCode] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const matchState = useMatchState(lobbyState, activeRoomCode);

  useEffect(() => {
    const socket = getSocket();
    connectSocket();

    const onConnect = () => setStatus(`Connected (${socket.id ?? "n/a"})`);
    const onDisconnect = () => {
      setStatus("Disconnected");
      setLobbyState(null);
      setActiveRoomCode("");
    };
    const onRoomCreated = (payload: { roomCode: string }) => {
      setActiveRoomCode(payload.roomCode);
      setRoomCodeInput(payload.roomCode);
    };
    const onLobbyState = (payload: LobbyState) => {
      setLobbyState(payload);
      setActiveRoomCode(payload.roomCode);
      setRoomCodeInput(payload.roomCode);
    };
    const onError = (payload: { code: string }) => setStatus(`Error: ${payload.code}`);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room_created", onRoomCreated);
    socket.on("lobby_state", onLobbyState);
    socket.on("error_event", onError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room_created", onRoomCreated);
      socket.off("lobby_state", onLobbyState);
      socket.off("error_event", onError);
    };
  }, []);

  const persistProfile = (): boolean => {
    const profile = { playerName, characterId };
    if (!isValidProfile(profile)) {
      setStatus("Provide valid player and character values");
      return false;
    }
    localStorage.setItem(PLAYER_NAME_KEY, profile.playerName.trim());
    localStorage.setItem(CHARACTER_ID_KEY, profile.characterId.trim());
    return true;
  };

  const createRoom = (): void => {
    if (!persistProfile()) {
      return;
    }
    getSocket().emit("create_room", {
      playerName: playerName.trim(),
      characterId: characterId.trim()
    });
  };

  const joinRoom = (): void => {
    if (!persistProfile()) {
      return;
    }
    const normalizedCode = normalizeRoomCode(roomCodeInput);
    if (!normalizedCode) {
      setStatus("Missing room code");
      return;
    }
    getSocket().emit("join_room", {
      roomCode: normalizedCode,
      playerName: playerName.trim(),
      characterId: characterId.trim()
    });
  };

  const startGame = (): void => {
    const roomCode = matchState.roomCode || normalizeRoomCode(roomCodeInput);
    if (!roomCode) {
      setStatus("Missing room code");
      return;
    }
    getSocket().emit("start_game", { roomCode });
  };

  const clearSessionRoom = (): void => {
    setActiveRoomCode("");
    setLobbyState(null);
  };

  const value: SessionStoreValue = {
    playerName,
    characterId,
    roomCodeInput,
    activeRoomCode,
    status,
    lobbyState,
    matchState,
    setPlayerName,
    setCharacterId,
    setRoomCodeInput,
    createRoom,
    joinRoom,
    startGame,
    clearSessionRoom
  };

  return createElement(SessionStoreContext.Provider, { value }, children);
}

export function useSessionStore(): SessionStoreValue {
  const context = useContext(SessionStoreContext);
  if (!context) {
    throw new Error("useSessionStore must be used within SessionStoreProvider");
  }
  return context;
}
