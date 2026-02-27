import { useEffect, useMemo, useRef } from "react";
import type { PlayerState } from "@skyshield/shared-types";
import { getSocket } from "../net/socket.js";
import cityImage from "../assets/city.png";
import heavyMissileImage from "../assets/missile.png";
import lightMissileImage from "../assets/small_missile.png";
import { uiText } from "../app/uiText.js";
import { playHit, playShoot } from "../audio/sfx.js";
import { getCharacterById } from "./characters.js";
import { toPercentX as toVisualPercentX, toPercentY as toVisualPercentY, toPlayerSlotStyle, toProjectileOwnerClass } from "./playerVisuals.js";
import type { GameOverSnapshot, HitConfirmedSnapshot, MatchSnapshot, MatchPhase } from "./types.js";

interface MatchViewProps {
  phase: MatchPhase;
  roomCode: string;
  match: MatchSnapshot;
  countdownSeconds: number | null;
  gameOver: GameOverSnapshot | null;
  lastHit: HitConfirmedSnapshot | null;
  players?: Array<Pick<PlayerState, "id" | "playerName" | "characterId">>;
  onShoot?: (payload: ShotPayload) => void;
  shootCooldownMs?: number;
}

export interface ShotPayload {
  targetX: number;
  targetY: number;
  clientTs: number;
}

export const SHOT_COOLDOWN_MS = 400;
const PLAYFIELD_WIDTH = 480;
const PLAYFIELD_HEIGHT = 720;

export function toPercentX(x: number): string {
  return toVisualPercentX(x);
}

export function toPercentY(y: number): string {
  return toVisualPercentY(y);
}

export function clampPlayfieldTarget(targetX: number, targetY: number): { targetX: number; targetY: number } {
  return {
    targetX: Math.max(0, Math.min(PLAYFIELD_WIDTH, targetX)),
    targetY: Math.max(0, Math.min(PLAYFIELD_HEIGHT, targetY))
  };
}

export function toGameOverReasonText(gameOver: GameOverSnapshot): string {
  const text = uiText();
  return gameOver.reason === "city_destroyed" ? text.match.reasonCityDestroyed : text.match.reasonTimer;
}

export function toGameOverResultText(gameOver: GameOverSnapshot): string {
  const text = uiText();
  return gameOver.result === "win" ? text.match.win : text.match.lose;
}

export function MatchView({
  phase,
  roomCode,
  match,
  countdownSeconds,
  gameOver,
  lastHit,
  players = [],
  onShoot,
  shootCooldownMs = SHOT_COOLDOWN_MS
}: MatchViewProps) {
  const text = uiText();
  const lastShotMsRef = useRef(0);
  const lastHitSignatureRef = useRef("");
  const topLeaderboard = useMemo(() => match.leaderboard.slice(0, 4), [match.leaderboard]);
  const finalLeaderboard = gameOver?.finalLeaderboard ?? [];
  const playersById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);

  const fireShot = (targetX: number, targetY: number): void => {
    const nowMs = Date.now();
    if (nowMs - lastShotMsRef.current < shootCooldownMs) {
      return;
    }

    lastShotMsRef.current = nowMs;
    const clamped = clampPlayfieldTarget(targetX, targetY);
    void playShoot();

    if (onShoot) {
      onShoot({
        targetX: clamped.targetX,
        targetY: clamped.targetY,
        clientTs: nowMs
      });
      return;
    }

    if (!roomCode) {
      return;
    }

    getSocket().emit("shoot", {
      roomCode,
      targetX: clamped.targetX,
      targetY: clamped.targetY,
      clientTs: nowMs
    });
  };

  useEffect(() => {
    if (!lastHit) {
      return;
    }

    const signature = `${lastHit.byPlayerId}:${lastHit.meteorId}:${lastHit.points}`;
    if (signature === lastHitSignatureRef.current) {
      return;
    }
    lastHitSignatureRef.current = signature;
    void playHit();
  }, [lastHit]);

  return (
    <section className="match-shell card">
      <header className="hud">
        <div>
          <p className="hud-label">{text.match.hudTime}</p>
          <p className="hud-value">{match.remainingSeconds}s</p>
        </div>
        <div>
          <p className="hud-label">{text.match.hudCityHp}</p>
          <div className="hp-track">
            <div className="hp-fill" style={{ width: `${Math.max(0, Math.min(100, match.cityHp * 5))}%` }} />
          </div>
        </div>
        <div>
          <p className="hud-label">{text.match.hudTopScore}</p>
          <p className="hud-value">{topLeaderboard[0]?.score ?? 0}</p>
        </div>
      </header>

      <div
        className="playfield"
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          fireShot(event.clientX - rect.left, event.clientY - rect.top);
        }}
      >
        <img className="city-layer" src={cityImage} alt="" aria-hidden />
        {phase === "countdown" && (
          <div className="overlay-pill">
            {text.match.countdownPrefix} {countdownSeconds ?? 3}
          </div>
        )}
        {phase === "game_over" && gameOver && (
          <div className="overlay-pill game-over-panel">
            <h3>{text.match.resultPanelTitle}</h3>
            <p>
              {toGameOverResultText(gameOver)} | {toGameOverReasonText(gameOver)}
            </p>
            <h4>{text.match.finalLeaderboardTitle}</h4>
            <ul className="plain-list">
              {finalLeaderboard.map((entry, index) => (
                <li key={`${entry.playerName}-${index}`}>
                  <span>
                    #{index + 1} {entry.playerName}
                  </span>
                  <span>
                    {entry.score} {text.lobby.scoreUnit} ({text.match.accuracyLabel}: {entry.accuracy}%)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {lastHit && (
          <div className="hit-toast">
            {text.match.hitPrefix} +{lastHit.points}
          </div>
        )}

        {match.meteors.map((meteor) => (
          <div
            key={meteor.id}
            className="meteor"
            style={{ left: toPercentX(meteor.x), top: toPercentY(meteor.y), width: meteor.radius * 2, height: meteor.radius * 2 }}
          >
            <img
              className="meteor-image"
              src={meteor.type === "light" ? lightMissileImage : heavyMissileImage}
              alt=""
              aria-hidden
              draggable={false}
            />
          </div>
        ))}

        {match.playerSlots.map((slot) => {
          const player = playersById.get(slot.playerId);
          const character = getCharacterById(player?.characterId ?? "");
          const style = toPlayerSlotStyle(slot);

          return (
            <div key={slot.playerId} className="player-actor" style={style}>
              <div className="cannon" />
              {character && <img className="player-avatar" src={character.imageSrc} alt={character.label} />}
              <span className="player-tag">{player?.playerName ?? "Player"}</span>
            </div>
          );
        })}

        {match.projectiles.map((projectile) => (
          <div
            key={projectile.id}
            className={`projectile ${toProjectileOwnerClass(projectile.ownerId)}`}
            style={{
              left: toPercentX(projectile.x),
              top: toPercentY(projectile.y),
              width: projectile.radius * 2,
              height: projectile.radius * 2
            }}
          />
        ))}
      </div>

      <aside className="leaderboard">
        <h2>{text.match.leaderboardTitle}</h2>
        {topLeaderboard.length === 0 ? (
          <p className="leaderboard-empty">{text.match.leaderboardEmpty}</p>
        ) : (
          topLeaderboard.map((entry) => (
            <div className="leaderboard-row" key={entry.id}>
              <span>
                #{entry.rank} {entry.playerName}
              </span>
              <span>
                {entry.score} {text.lobby.scoreUnit} ({entry.accuracy}%)
              </span>
            </div>
          ))
        )}
      </aside>
    </section>
  );
}
