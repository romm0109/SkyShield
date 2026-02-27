import { describe, expect, it } from "vitest";
import { clampOfflineShotTarget, resolveOfflineMatchResult, shouldThrottleOfflineShot } from "./useOfflineMatchState.js";

describe("offline match helpers", () => {
  it("clamps offline shot coordinates to playfield bounds", () => {
    expect(clampOfflineShotTarget(-25, 1000)).toEqual({ targetX: 0, targetY: 720 });
    expect(clampOfflineShotTarget(999, -3)).toEqual({ targetX: 480, targetY: 0 });
  });

  it("throttles shots inside 400ms reload window", () => {
    expect(shouldThrottleOfflineShot(1000, 1200)).toBe(true);
    expect(shouldThrottleOfflineShot(1000, 1400)).toBe(false);
  });

  it("resolves city destruction and timer-complete outcomes", () => {
    expect(resolveOfflineMatchResult(0, 120)).toMatchObject({ result: "lose", reason: "city_destroyed" });
    expect(resolveOfflineMatchResult(3, 0)).toMatchObject({ result: "win", reason: "timer_complete" });
    expect(resolveOfflineMatchResult(3, 55)).toBeNull();
  });
});
