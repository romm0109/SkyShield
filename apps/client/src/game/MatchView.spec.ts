import { describe, expect, it } from "vitest";
import { toPercentX, toPercentY } from "./MatchView.js";

describe("MatchView coordinate helpers", () => {
  it("converts X coordinate to percentage", () => {
    expect(toPercentX(240)).toBe("50%");
  });

  it("converts Y coordinate to percentage", () => {
    expect(toPercentY(360)).toBe("50%");
  });
});
