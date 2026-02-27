import { useEffect } from "react";
import { useNavigate } from "react-router";
import { MatchView, SHOT_COOLDOWN_MS } from "../game/MatchView.js";
import { useSessionStore } from "../app/useSessionStore.js";
import { useOfflineMatchState } from "../offline/useOfflineMatchState.js";

export function OfflinePage() {
  const navigate = useNavigate();
  const { playerName, characterId, enterOfflineMode } = useSessionStore();
  const offlineMatch = useOfflineMatchState(playerName, characterId);
  const shouldRenderMatch =
    offlineMatch.phase === "countdown" || offlineMatch.phase === "in_game" || offlineMatch.phase === "game_over";

  useEffect(() => {
    enterOfflineMode();
  }, [enterOfflineMode]);

  return (
    <main className="page page-offline">
      <section className="card room-header">
        <div>
          <p className="eyebrow">Singleplayer</p>
          <h1>Offline Defense</h1>
        </div>
        <div className="button-row">
          {offlineMatch.phase === "lobby" ? (
            <button type="button" onClick={offlineMatch.startMatch}>
              Start Offline Match
            </button>
          ) : (
            <button type="button" onClick={offlineMatch.restartMatch}>
              Retry Match
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              navigate("/", { replace: true });
            }}
          >
            Back to Lobby
          </button>
        </div>
        <p className="status-line">{offlineMatch.status}</p>
      </section>

      <section className="card offline-profile">
        <h2>Pilot Profile</h2>
        <p>
          <strong>{playerName.trim() || "Pilot"}</strong> · {characterId.trim() || "scout"}
        </p>
        <p>Runs locally in your browser with no gameplay socket events.</p>
      </section>

      {shouldRenderMatch ? (
        <MatchView
          phase={offlineMatch.phase}
          roomCode=""
          match={offlineMatch.match}
          countdownSeconds={offlineMatch.countdownSeconds}
          gameOver={offlineMatch.gameOver}
          lastHit={offlineMatch.lastHit}
          onShoot={(payload) => {
            offlineMatch.fireShot(payload.targetX, payload.targetY, payload.clientTs);
          }}
          shootCooldownMs={SHOT_COOLDOWN_MS}
        />
      ) : (
        <section className="card waiting-shell offline-intro">
          <h2>Ready For Launch</h2>
          <p>Start a full 10-minute defense session with the same simulation rules used by multiplayer.</p>
        </section>
      )}
    </main>
  );
}
