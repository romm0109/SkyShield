import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LobbyState } from "@skyshield/shared-types";
import { useMatchState, type UseMatchStateValue } from "../game/useMatchState.js";
import { DEFAULT_CHARACTER_ID, isValidCharacterId } from "../game/characters.js";
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
  const storedCharacterId = localStorage.getItem(CHARACTER_ID_KEY) ?? DEFAULT_CHARACTER_ID;
  const normalizedCharacterId = isValidCharacterId(storedCharacterId) ? storedCharacterId.trim() : DEFAULT_CHARACTER_ID;
  return {
    playerName: localStorage.getItem(PLAYER_NAME_KEY) ?? "",
    characterId: normalizedCharacterId
  };
}

function isValidProfile(profile: ProfileSnapshot): boolean {
  const trimmedName = profile.playerName.trim();
  return trimmedName.length >= 2 && trimmedName.length <= 16 && isValidCharacterId(profile.characterId);
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
  enterOfflineMode: () => void;
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
  const offlineModeRef = useRef(false);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setStatus(`Connected (${socket.id ?? "n/a"})`);
    const onDisconnect = () => {
      setStatus("Disconnected");
      setLobbyState(null);
      setActiveRoomCode("");
    };
    const onRoomCreated = (payload: { roomCode: string }) => {
      if (offlineModeRef.current) {
        return;
      }
      setActiveRoomCode(payload.roomCode);
      setRoomCodeInput(payload.roomCode);
    };
    const onLobbyState = (payload: LobbyState) => {
      if (offlineModeRef.current) {
        return;
      }
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
    const normalizedCharacterId = isValidCharacterId(characterId) ? characterId.trim() : DEFAULT_CHARACTER_ID;
    const profile = { playerName, characterId: normalizedCharacterId };
    if (!isValidProfile(profile)) {
      setStatus("Provide valid player and character values");
      return false;
    }
    if (normalizedCharacterId !== characterId) {
      setCharacterId(normalizedCharacterId);
    }
    localStorage.setItem(PLAYER_NAME_KEY, profile.playerName.trim());
    localStorage.setItem(CHARACTER_ID_KEY, profile.characterId);
    return true;
  };

  const createRoom = (): void => {
    if (!persistProfile()) {
      return;
    }
    offlineModeRef.current = false;
    connectSocket();
    getSocket().emit("create_room", {
      playerName: playerName.trim(),
      characterId: isValidCharacterId(characterId) ? characterId.trim() : DEFAULT_CHARACTER_ID
    });
  };

  const joinRoom = (): void => {
    if (!persistProfile()) {
      return;
    }
    offlineModeRef.current = false;
    const normalizedCode = normalizeRoomCode(roomCodeInput);
    if (!normalizedCode) {
      setStatus("Missing room code");
      return;
    }
    connectSocket();
    getSocket().emit("join_room", {
      roomCode: normalizedCode,
      playerName: playerName.trim(),
      characterId: isValidCharacterId(characterId) ? characterId.trim() : DEFAULT_CHARACTER_ID
    });
  };

  const startGame = (): void => {
    offlineModeRef.current = false;
    const roomCode = matchState.roomCode || normalizeRoomCode(roomCodeInput);
    if (!roomCode) {
      setStatus("Missing room code");
      return;
    }
    connectSocket();
    getSocket().emit("start_game", { roomCode });
  };

  const clearSessionRoom = (): void => {
    offlineModeRef.current = false;
    setActiveRoomCode("");
    setLobbyState(null);
  };

  const enterOfflineMode = (): void => {
    offlineModeRef.current = true;
    setActiveRoomCode("");
    setLobbyState(null);
    setRoomCodeInput("");
    setStatus("Offline mode active");
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
    clearSessionRoom,
    enterOfflineMode
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
