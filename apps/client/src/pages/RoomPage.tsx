import { Navigate, useNavigate, useParams } from "react-router";
import { MatchView } from "../game/MatchView.js";
import { getCharacterById } from "../game/characters.js";
import { getSocket } from "../net/socket.js";
import { normalizeRoomCode, useSessionStore } from "../app/useSessionStore.js";

export function RoomPage() {
  const navigate = useNavigate();
  const { roomCode } = useParams();
  const routeRoomCode = normalizeRoomCode(roomCode ?? "");
  const { status, activeRoomCode, lobbyState, matchState, startGame, clearSessionRoom } = useSessionStore();

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
    <main className="page page-room">
      <section className="card room-header">
        <div>
          <p className="eyebrow">Room</p>
          <h1>{activeRoomCode}</h1>
        </div>
        <div className="button-row">
          <button type="button" onClick={startGame} disabled={!isHost || !lobbyState}>
            {isHost ? "Start Game" : "Host Only"}
          </button>
          <button
            type="button"
            onClick={() => {
              clearSessionRoom();
              navigate("/", { replace: true });
            }}
          >
            Back to Lobby
          </button>
        </div>
        <p className="status-line">{status}</p>
      </section>

      <section className="card room-meta">
        <h2>Players</h2>
        {!lobbyState ? (
          <p>Waiting for lobby sync.</p>
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
                  <span>{player.score} pts</span>
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
          <h2>Waiting For Match Start</h2>
          <p>Host can start when players are ready.</p>
        </section>
      )}
    </main>
  );
}
