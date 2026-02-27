import { useEffect } from "react";
import { useNavigate } from "react-router";
import { normalizeRoomCode, useSessionStore } from "../app/useSessionStore.js";
import { CHARACTER_OPTIONS, getCharacterById } from "../game/characters.js";

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
    joinRoom,
    enterOfflineMode
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
        <fieldset className="character-picker">
          <legend>Character</legend>
          <div className="character-grid">
            {CHARACTER_OPTIONS.map((character) => {
              const isSelected = character.id === characterId;
              return (
                <button
                  key={character.id}
                  type="button"
                  className={`character-card${isSelected ? " is-selected" : ""}`}
                  aria-pressed={isSelected}
                  onClick={() => setCharacterId(character.id)}
                >
                  <img src={character.imageSrc} alt={character.label} loading="lazy" />
                  <span>{character.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
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
          <button
            type="button"
            onClick={() => {
              enterOfflineMode();
              navigate("/offline");
            }}
          >
            Singleplayer (Offline)
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
              {lobbyState.players.map((player) => {
                const character = getCharacterById(player.characterId);
                return (
                  <li key={player.id}>
                    <span className="player-pill">
                      {character ? <img src={character.imageSrc} alt={character.label} /> : <span className="player-avatar-fallback" />}
                      <span>{player.playerName}</span>
                    </span>
                    <span>{player.score} pts</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
