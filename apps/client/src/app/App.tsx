import { useEffect, useMemo, useState } from "react";
import type { LobbyState } from "@skyshield/shared-types";
import { MatchView } from "../game/MatchView.js";
import { useMatchState } from "../game/useMatchState.js";
import { connectSocket, getSocket } from "../net/socket.js";

const PLAYER_NAME_KEY = "skyshield.playerName";
const CHARACTER_ID_KEY = "skyshield.characterId";

function readInitialProfile(): { playerName: string; characterId: string } {
  return {
    playerName: localStorage.getItem(PLAYER_NAME_KEY) ?? "",
    characterId: localStorage.getItem(CHARACTER_ID_KEY) ?? "scout"
  };
}

export function App() {
  const initialProfile = useMemo(readInitialProfile, []);
  const [playerName, setPlayerName] = useState(initialProfile.playerName);
  const [characterId, setCharacterId] = useState(initialProfile.characterId);
  const [roomCode, setRoomCode] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const matchState = useMatchState(lobbyState, roomCode);

  useEffect(() => {
    const socket = getSocket();
    connectSocket();

    const onConnect = () => setStatus(`Connected (${socket.id ?? "n/a"})`);
    const onDisconnect = () => setStatus("Disconnected");
    const onRoomCreated = (payload: { roomCode: string }) => setRoomCode(payload.roomCode);
    const onLobbyState = (payload: LobbyState) => setLobbyState(payload);
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

  const saveProfile = (): boolean => {
    const trimmedName = playerName.trim();
    const trimmedCharacterId = characterId.trim();
    if (trimmedName.length < 2 || trimmedName.length > 16 || trimmedCharacterId.length === 0) {
      setStatus("Provide valid player and character values");
      return false;
    }
    localStorage.setItem(PLAYER_NAME_KEY, trimmedName);
    localStorage.setItem(CHARACTER_ID_KEY, trimmedCharacterId);
    return true;
  };

  const createRoom = (): void => {
    if (!saveProfile()) {
      return;
    }
    getSocket().emit("create_room", {
      playerName: playerName.trim(),
      characterId: characterId.trim()
    });
  };

  const joinRoom = (): void => {
    if (!saveProfile()) {
      return;
    }
    getSocket().emit("join_room", {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: playerName.trim(),
      characterId: characterId.trim()
    });
  };

  const startGame = (): void => {
    const activeRoomCode = matchState.roomCode || roomCode.trim().toUpperCase();
    if (!activeRoomCode) {
      setStatus("Missing room code");
      return;
    }
    getSocket().emit("start_game", { roomCode: activeRoomCode });
  };

  return (
    <main className="app-shell">
      <p>{status}</p>
      <div className="controls">
        <input
          placeholder="Player name"
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
        />
        <input
          placeholder="Character id"
          value={characterId}
          onChange={(event) => setCharacterId(event.target.value)}
        />
        <input
          placeholder="Room code"
          maxLength={6}
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
        />
        <button type="button" onClick={createRoom}>
          Create Room
        </button>
        <button type="button" onClick={joinRoom}>
          Join Room
        </button>
        <button type="button" onClick={startGame} disabled={!matchState.roomCode}>
          Start Game
        </button>
      </div>
      {matchState.phase === "in_game" || matchState.phase === "countdown" || matchState.phase === "game_over" ? (
        <MatchView
          phase={matchState.phase}
          roomCode={matchState.roomCode}
          match={matchState.match}
          countdownSeconds={matchState.countdownSeconds}
          gameOver={matchState.gameOver}
          lastHit={matchState.lastHit}
        />
      ) : (
        <pre>{matchState.lobbyState ? JSON.stringify(matchState.lobbyState, null, 2) : "Lobby state will appear here."}</pre>
      )}
    </main>
  );
}
