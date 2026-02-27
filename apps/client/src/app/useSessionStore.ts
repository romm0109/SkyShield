import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { LobbyState } from "@skyshield/shared-types";
import { setSfxEnabled } from "../audio/sfx.js";
import { useMatchState, type UseMatchStateValue } from "../game/useMatchState.js";
import { DEFAULT_CHARACTER_ID, isValidCharacterId } from "../game/characters.js";
import { connectSocket, getSocket } from "../net/socket.js";
import { uiText } from "./uiText.js";

const PLAYER_NAME_KEY = "skyshield.playerName";
const CHARACTER_ID_KEY = "skyshield.characterId";
const AUDIO_ENABLED_KEY = "skyshield.audioEnabled";
const TEXT = uiText();

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

function readInitialAudioEnabled(): boolean {
  const rawValue = localStorage.getItem(AUDIO_ENABLED_KEY);
  if (rawValue === null) {
    return true;
  }

  return rawValue === "true";
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
  audioEnabled: boolean;
  setPlayerName: (value: string) => void;
  setCharacterId: (value: string) => void;
  setRoomCodeInput: (value: string) => void;
  setAudioEnabled: (enabled: boolean) => void;
  createRoom: () => void;
  joinRoom: () => void;
  startGame: () => void;
  clearSessionRoom: () => void;
  enterOfflineMode: () => void;
}

const SessionStoreContext = createContext<SessionStoreValue | null>(null);

export function SessionStoreProvider({ children }: { children: ReactNode }) {
  const initialProfile = useMemo(readInitialProfile, []);
  const initialAudioEnabled = useMemo(readInitialAudioEnabled, []);
  const [playerName, setPlayerName] = useState(initialProfile.playerName);
  const [characterId, setCharacterId] = useState(initialProfile.characterId);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [activeRoomCode, setActiveRoomCode] = useState("");
  const [status, setStatus] = useState<string>(TEXT.status.disconnected);
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [audioEnabled, setAudioEnabledState] = useState(initialAudioEnabled);
  const matchState = useMatchState(lobbyState, activeRoomCode);
  const offlineModeRef = useRef(false);
  const audioEnabledRef = useRef(initialAudioEnabled);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    setSfxEnabled(audioEnabled);
  }, [audioEnabled]);

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setStatus(`${TEXT.status.connectedPrefix} (${socket.id ?? "n/a"})`);
      socket.emit("set_audio_pref", { enabled: audioEnabledRef.current });
    };
    const onDisconnect = () => {
      setStatus(TEXT.status.disconnected);
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
    const onError = (payload: { code: string }) => setStatus(`${TEXT.status.errorPrefix}: ${payload.code}`);

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
      setStatus(TEXT.status.invalidProfile);
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
    const socket = getSocket();
    socket.emit("set_audio_pref", { enabled: audioEnabledRef.current });
    socket.emit("create_room", {
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
      setStatus(TEXT.status.missingRoomCode);
      return;
    }
    connectSocket();
    const socket = getSocket();
    socket.emit("set_audio_pref", { enabled: audioEnabledRef.current });
    socket.emit("join_room", {
      roomCode: normalizedCode,
      playerName: playerName.trim(),
      characterId: isValidCharacterId(characterId) ? characterId.trim() : DEFAULT_CHARACTER_ID
    });
  };

  const startGame = (): void => {
    offlineModeRef.current = false;
    const roomCode = matchState.roomCode || normalizeRoomCode(roomCodeInput);
    if (!roomCode) {
      setStatus(TEXT.status.missingRoomCode);
      return;
    }
    connectSocket();
    const socket = getSocket();
    socket.emit("set_audio_pref", { enabled: audioEnabledRef.current });
    socket.emit("start_game", { roomCode });
  };

  const setAudioEnabled = (enabled: boolean): void => {
    setAudioEnabledState(enabled);
    localStorage.setItem(AUDIO_ENABLED_KEY, String(enabled));
    const socket = getSocket();
    if (socket.connected) {
      socket.emit("set_audio_pref", { enabled });
    }
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
    setStatus(TEXT.status.offlineActive);
  };

  const value: SessionStoreValue = {
    playerName,
    characterId,
    roomCodeInput,
    activeRoomCode,
    status,
    lobbyState,
    matchState,
    audioEnabled,
    setPlayerName,
    setCharacterId,
    setRoomCodeInput,
    setAudioEnabled,
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
