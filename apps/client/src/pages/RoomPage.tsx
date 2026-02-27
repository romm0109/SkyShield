import { Navigate, useNavigate, useParams } from "react-router";
import { MatchView } from "../game/MatchView.js";
import { getCharacterById } from "../game/characters.js";
import { getSocket } from "../net/socket.js";
import { normalizeRoomCode, useSessionStore } from "../app/useSessionStore.js";
import { uiText } from "../app/uiText.js";

export function RoomPage() {
  const text = uiText();
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const routeRoomCode = normalizeRoomCode(roomCode ?? "");
  const { status, activeRoomCode, lobbyState, matchState, audioEnabled, setAudioEnabled, startGame, clearSessionRoom } =
    useSessionStore();

  if (!routeRoomCode) {
    return <Navigate to="/" replace />;
  }

  if (!activeRoomCode) {
    return <Navigate to="/" replace />;
  }

  if (activeRoomCode !== routeRoomCode) {
    return <Navigate to={`/room/${activeRoomCode}`} replace />;
  }

  const socketId = getSocket().id ?? "";
  const isHost = Boolean(lobbyState && lobbyState.hostSocketId === socketId);
  const phase = matchState.phase;
  const shouldRenderMatch = phase === "countdown" || phase === "in_game" || phase === "game_over";

  return (
    <main className="page page-room" dir="rtl">
      <section className="card room-header">
        <div>
          <p className="eyebrow">{text.room.eyebrow}</p>
          <h1>{activeRoomCode}</h1>
        </div>
        <div className="button-row">
          <button type="button" onClick={startGame} disabled={!isHost || !lobbyState}>
            {isHost ? (phase === "game_over" ? text.room.playAgain : text.room.startGame) : text.room.hostOnly}
          </button>
          <button
            type="button"
            onClick={() => {
              clearSessionRoom();
              navigate("/", { replace: true });
            }}
          >
            {text.room.backToLobby}
          </button>
          <button type="button" onClick={() => setAudioEnabled(!audioEnabled)}>
            {audioEnabled ? text.audio.on : text.audio.off}
          </button>
        </div>
        <p className="status-line">{status}</p>
      </section>

      <section className="card room-meta">
        <h2>{text.room.playersTitle}</h2>
        {!lobbyState ? (
          <p>{text.room.waitingForSync}</p>
        ) : (
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
        )}
      </section>

      {shouldRenderMatch ? (
        <MatchView
          phase={phase}
          roomCode={matchState.roomCode}
          match={matchState.match}
          countdownSeconds={matchState.countdownSeconds}
          gameOver={matchState.gameOver}
          lastHit={matchState.lastHit}
          players={lobbyState?.players ?? []}
        />
      ) : (
        <section className="card waiting-shell">
          <h2>{text.room.waitingForMatchTitle}</h2>
          <p>{text.room.waitingForMatchSubtitle}</p>
        </section>
      )}
    </main>
  );
}
