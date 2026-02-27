import { useEffect } from "react";
import { useNavigate } from "react-router";
import { normalizeRoomCode, useSessionStore } from "../app/useSessionStore.js";
import { uiText } from "../app/uiText.js";
import { CHARACTER_OPTIONS, getCharacterById } from "../game/characters.js";

export function LobbyPage() {
  const text = uiText();
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
    audioEnabled,
    setAudioEnabled,
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
    <main className="page page-lobby" dir="rtl">
      <section className="lobby-hero card">
        <p className="eyebrow">{text.appName}</p>
        <h1>{text.lobby.title}</h1>
        <p className="lead">{text.lobby.subtitle}</p>
      </section>

      <section className="card form-grid">
        <label>
          {text.lobby.playerNameLabel}
          <input
            placeholder={text.lobby.playerNamePlaceholder}
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
          />
        </label>
        <fieldset className="character-picker">
          <legend>{text.lobby.characterLabel}</legend>
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
          {text.lobby.roomCodeLabel}
          <input
            placeholder={text.lobby.roomCodePlaceholder}
            maxLength={6}
            value={roomCodeInput}
            onChange={(event) => setRoomCodeInput(normalizeRoomCode(event.target.value))}
          />
        </label>
        <div className="button-row">
          <button type="button" onClick={createRoom}>
            {text.lobby.createRoom}
          </button>
          <button type="button" onClick={joinRoom}>
            {text.lobby.joinRoom}
          </button>
          <button
            type="button"
            onClick={() => {
              enterOfflineMode();
              navigate("/offline");
            }}
          >
            {text.lobby.offlineMode}
          </button>
          <button type="button" onClick={() => setAudioEnabled(!audioEnabled)}>
            {audioEnabled ? text.audio.on : text.audio.off}
          </button>
        </div>
        <p className="status-line">{status}</p>
      </section>

      <section className="card lobby-preview">
        <h2>{text.lobby.snapshotTitle}</h2>
        {!lobbyState ? (
          <p>{text.lobby.noRoomData}</p>
        ) : (
          <>
            <p>
              {text.lobby.roomPrefix} <strong>{lobbyState.roomCode}</strong>
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
                    <span>
                      {player.score} {text.lobby.scoreUnit}
                    </span>
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
