import { useEffect } from "react";
import { useNavigate } from "react-router";
import { normalizeRoomCode, useSessionStore } from "../app/useSessionStore.js";

export function LobbyPage() {
  const navigate = useNavigate();
  const {
    playerName,
    characterId,
    roomCodeInput,
    status,
    activeRoomCode,
    lobbyState,
    matchState,
    setPlayerName,
    setCharacterId,
    setRoomCodeInput,
    createRoom,
    joinRoom
  } = useSessionStore();

  useEffect(() => {
    const sessionRoomCode = matchState.roomCode || activeRoomCode;
    if (sessionRoomCode) {
      navigate(`/room/${sessionRoomCode}`, { replace: true });
    }
  }, [activeRoomCode, matchState.roomCode, navigate]);

  return (
    <main className="page page-lobby">
      <section className="lobby-hero card">
        <p className="eyebrow">SkyShield</p>
        <h1>Room Control</h1>
        <p className="lead">Create or join a room, then move into the live command center.</p>
      </section>

      <section className="card form-grid">
        <label>
          Player name
          <input
            placeholder="2-16 chars"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
          />
        </label>
        <label>
          Character id
          <input
            placeholder="scout"
            value={characterId}
            onChange={(event) => setCharacterId(event.target.value)}
          />
        </label>
        <label>
          Room code
          <input
            placeholder="AB12"
            maxLength={6}
            value={roomCodeInput}
            onChange={(event) => setRoomCodeInput(normalizeRoomCode(event.target.value))}
          />
        </label>
        <div className="button-row">
          <button type="button" onClick={createRoom}>
            Create Room
          </button>
          <button type="button" onClick={joinRoom}>
            Join Room
          </button>
        </div>
        <p className="status-line">{status}</p>
      </section>

      <section className="card lobby-preview">
        <h2>Lobby Snapshot</h2>
        {!lobbyState ? (
          <p>No room data yet.</p>
        ) : (
          <>
            <p>
              Room <strong>{lobbyState.roomCode}</strong>
            </p>
            <ul className="plain-list">
              {lobbyState.players.map((player) => (
                <li key={player.id}>
                  {player.playerName} · {player.characterId} · {player.score} pts
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
