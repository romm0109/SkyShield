import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSocketRateLimiter } from "./rateLimit.js";

describe("createSocketRateLimiter", () => {
  it("allows first event per socket/event key", () => {
    let nowMs = 1_000;
    const limiter = createSocketRateLimiter({ minIntervalMs: 500, now: () => nowMs });

    assert.equal(limiter.allow("s1", "create_room"), true);
  });

  it("blocks rapid repeated event and allows after interval", () => {
    let nowMs = 1_000;
    const limiter = createSocketRateLimiter({ minIntervalMs: 500, now: () => nowMs });

    assert.equal(limiter.allow("s1", "join_room"), true);
    nowMs += 120;
    assert.equal(limiter.allow("s1", "join_room"), false);
    nowMs += 500;
    assert.equal(limiter.allow("s1", "join_room"), true);
  });

  it("isolates rate limits per socket and event", () => {
    let nowMs = 1_000;
    const limiter = createSocketRateLimiter({ minIntervalMs: 500, now: () => nowMs });

    assert.equal(limiter.allow("s1", "start_game"), true);
    assert.equal(limiter.allow("s2", "start_game"), true);
    assert.equal(limiter.allow("s1", "join_room"), true);

    nowMs += 100;
    assert.equal(limiter.allow("s1", "start_game"), false);
    assert.equal(limiter.allow("s2", "start_game"), false);
    assert.equal(limiter.allow("s1", "join_room"), false);
  });
});
