import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCreateRoomPayload, isJoinRoomPayload, isShootPayload, isStartGamePayload } from "./events.js";

describe("event payload guards", () => {
  it("accepts valid create_room payload", () => {
    assert.equal(isCreateRoomPayload({ playerName: "Dana", characterId: "scout" }), true);
  });

  it("rejects invalid create_room payload", () => {
    assert.equal(isCreateRoomPayload({ playerName: " ", characterId: "scout" }), false);
  });

  it("accepts valid join_room payload", () => {
    assert.equal(
      isJoinRoomPayload({
        roomCode: "AB12",
        playerName: "Dana",
        characterId: "scout"
      }),
      true
    );
  });

  it("rejects invalid join_room payload", () => {
    assert.equal(
      isJoinRoomPayload({
        roomCode: "ab-1",
        playerName: "Dana",
        characterId: "scout"
      }),
      false
    );
  });

  it("accepts valid start_game payload", () => {
    assert.equal(isStartGamePayload({ roomCode: "AB12" }), true);
  });

  it("rejects invalid start_game payload with lowercase and symbols", () => {
    assert.equal(isStartGamePayload({ roomCode: "ab-1" }), false);
  });

  it("rejects empty start_game payload", () => {
    assert.equal(isStartGamePayload({}), false);
  });

  it("accepts valid shoot payload", () => {
    assert.equal(
      isShootPayload({
        roomCode: "AB12",
        targetX: 320,
        targetY: 180,
        clientTs: 1700000000000
      }),
      true
    );
  });

  it("rejects shoot payload with out-of-range coordinates", () => {
    assert.equal(
      isShootPayload({
        roomCode: "AB12",
        targetX: -1,
        targetY: 100,
        clientTs: 1700000000000
      }),
      false
    );
  });

  it("rejects shoot payload with missing client timestamp", () => {
    assert.equal(
      isShootPayload({
        roomCode: "AB12",
        targetX: 120,
        targetY: 100
      }),
      false
    );
  });

  it("rejects shoot payload with malformed room code", () => {
    assert.equal(
      isShootPayload({
        roomCode: "ab-1",
        targetX: 120,
        targetY: 100,
        clientTs: 1700000000000
      }),
      false
    );
  });
});
