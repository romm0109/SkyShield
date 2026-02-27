import { useMemo, useRef } from "react";
import { getSocket } from "../net/socket.js";
import type { GameOverSnapshot, HitConfirmedSnapshot, MatchSnapshot, MatchPhase } from "./types.js";

interface MatchViewProps {
  phase: MatchPhase;
  roomCode: string;
  match: MatchSnapshot;
  countdownSeconds: number | null;
  gameOver: GameOverSnapshot | null;
  lastHit: HitConfirmedSnapshot | null;
}

const SHOT_COOLDOWN_MS = 400;
const PLAYFIELD_WIDTH = 480;
const PLAYFIELD_HEIGHT = 720;

export function toPercentX(x: number): string {
  return `${(x / PLAYFIELD_WIDTH) * 100}%`;
}

export function toPercentY(y: number): string {
  return `${(y / PLAYFIELD_HEIGHT) * 100}%`;
}

export function MatchView({ phase, roomCode, match, countdownSeconds, gameOver, lastHit }: MatchViewProps) {
  const lastShotMsRef = useRef(0);
  const topLeaderboard = useMemo(() => match.leaderboard.slice(0, 4), [match.leaderboard]);

  const fireShot = (targetX: number, targetY: number): void => {
    const nowMs = Date.now();
    if (nowMs - lastShotMsRef.current < SHOT_COOLDOWN_MS || !roomCode) {
      return;
    }
    lastShotMsRef.current = nowMs;
    getSocket().emit("shoot", {
      roomCode,
      targetX: Math.max(0, Math.min(PLAYFIELD_WIDTH, targetX)),
      targetY: Math.max(0, Math.min(PLAYFIELD_HEIGHT, targetY)),
      clientTs: nowMs
    });
  };

  return (
    <section className="match-shell card">
      <header className="hud">
        <div>
          <p className="hud-label">Time</p>
          <p className="hud-value">{match.remainingSeconds}s</p>
        </div>
        <div>
          <p className="hud-label">City HP</p>
          <div className="hp-track">
            <div className="hp-fill" style={{ width: `${Math.max(0, Math.min(100, match.cityHp * 5))}%` }} />
          </div>
        </div>
        <div>
          <p className="hud-label">Top Score</p>
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
        {phase === "countdown" && <div className="overlay-pill">Match starts in {countdownSeconds ?? 3}</div>}
        {phase === "game_over" && gameOver && (
          <div className="overlay-pill">
            {gameOver.reason === "city_destroyed" ? "City Destroyed" : "Timer Complete"} | {gameOver.result.toUpperCase()}
          </div>
        )}
        {lastHit && <div className="hit-toast">Hit +{lastHit.points}</div>}
        {match.meteors.map((meteor) => (
          <div
            key={meteor.id}
            className={`meteor meteor-${meteor.type}`}
            style={{ left: toPercentX(meteor.x), top: toPercentY(meteor.y), width: meteor.radius * 2, height: meteor.radius * 2 }}
          />
        ))}
        {match.projectiles.map((projectile) => (
          <div
            key={projectile.id}
            className="projectile"
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
        <h2>Leaderboard</h2>
        {topLeaderboard.length === 0 ? (
          <p className="leaderboard-empty">No scores yet.</p>
        ) : (
          topLeaderboard.map((entry) => (
            <div className="leaderboard-row" key={entry.id}>
              <span>
                #{entry.rank} {entry.playerName}
              </span>
              <span>
                {entry.score} pts ({entry.accuracy}%)
              </span>
            </div>
          ))
        )}
      </aside>
    </section>
  );
}
