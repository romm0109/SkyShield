import { describe, expect, it } from "vitest";
import { clampPlayfieldTarget, toPercentX, toPercentY } from "./MatchView.js";
import { toPlayerSlotStyle, toProjectileOwnerClass } from "./playerVisuals.js";
import { normalizeRoomCode } from "../app/useSessionStore.js";

describe("MatchView coordinate helpers", () => {
  it("converts X coordinate to percentage", () => {
    expect(toPercentX(240)).toBe("50%");
  });

  it("converts Y coordinate to percentage", () => {
    expect(toPercentY(360)).toBe("50%");
  });

  it("clamps target coordinates to playfield bounds", () => {
    expect(clampPlayfieldTarget(-10, 900)).toEqual({ targetX: 0, targetY: 720 });
    expect(clampPlayfieldTarget(490, -3)).toEqual({ targetX: 480, targetY: 0 });
  });

  it("maps slot coordinates to CSS style values", () => {
    expect(toPlayerSlotStyle({ playerId: "p1", x: 240, y: 360 })).toEqual({
      left: "50%",
      top: "50%"
    });
  });

  it("creates deterministic projectile owner classes", () => {
    const ownerClass = toProjectileOwnerClass("player-123");
    expect(ownerClass.startsWith("projectile-owner-")).toBe(true);
    expect(toProjectileOwnerClass("player-123")).toBe(ownerClass);
  });
});

describe("session helper utilities", () => {
  it("normalizes room code to uppercase trimmed value", () => {
    expect(normalizeRoomCode(" ab12 ")).toBe("AB12");
  });
});
