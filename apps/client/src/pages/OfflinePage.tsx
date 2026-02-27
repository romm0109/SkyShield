import { useEffect } from "react";
import { useNavigate } from "react-router";
import { MatchView, SHOT_COOLDOWN_MS } from "../game/MatchView.js";
import { useSessionStore } from "../app/useSessionStore.js";
import { useOfflineMatchState } from "../offline/useOfflineMatchState.js";
import { getCharacterById } from "../game/characters.js";
import { uiText } from "../app/uiText.js";

export function OfflinePage() {
  const text = uiText();
  const navigate = useNavigate();
  const { playerName, characterId, audioEnabled, setAudioEnabled, enterOfflineMode } = useSessionStore();
  const offlineMatch = useOfflineMatchState(playerName, characterId);
  const selectedCharacter = getCharacterById(characterId);
  const shouldRenderMatch =
    offlineMatch.phase === "countdown" || offlineMatch.phase === "in_game" || offlineMatch.phase === "game_over";

  useEffect(() => {
    enterOfflineMode();
  }, [enterOfflineMode]);

  return (
    <main className="page page-offline" dir="rtl">
      <section className="card room-header">
        <div>
          <p className="eyebrow">{text.offline.eyebrow}</p>
          <h1>{text.offline.title}</h1>
        </div>
        <div className="button-row">
          {offlineMatch.phase === "lobby" ? (
            <button type="button" onClick={offlineMatch.startMatch}>
              {text.offline.start}
            </button>
          ) : (
            <button type="button" onClick={offlineMatch.restartMatch}>
              {text.offline.retry}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              navigate("/", { replace: true });
            }}
          >
            {text.room.backToLobby}
          </button>
          <button type="button" onClick={() => setAudioEnabled(!audioEnabled)}>
            {audioEnabled ? text.audio.on : text.audio.off}
          </button>
        </div>
        <p className="status-line">{offlineMatch.status}</p>
      </section>

      <section className="card offline-profile">
        <h2>{text.offline.profileTitle}</h2>
        <p>
          <strong>{playerName.trim() || text.offline.defaultPilotName}</strong> | {selectedCharacter?.label ?? "Bibi"}
        </p>
        <p>{text.offline.profileCopy}</p>
      </section>

      {shouldRenderMatch ? (
        <MatchView
          phase={offlineMatch.phase}
          roomCode=""
          match={offlineMatch.match}
          countdownSeconds={offlineMatch.countdownSeconds}
          gameOver={offlineMatch.gameOver}
          lastHit={offlineMatch.lastHit}
          players={[
            {
              id: "offline-player",
              playerName: playerName.trim() || text.offline.defaultPilotName,
              characterId: selectedCharacter?.id ?? "bibi"
            }
          ]}
          onShoot={(payload) => {
            offlineMatch.fireShot(payload.targetX, payload.targetY, payload.clientTs);
          }}
          shootCooldownMs={SHOT_COOLDOWN_MS}
        />
      ) : (
        <section className="card waiting-shell offline-intro">
          <h2>{text.offline.readyTitle}</h2>
          <p>{text.offline.readySubtitle}</p>
        </section>
      )}
    </main>
  );
}
