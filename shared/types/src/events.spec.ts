import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isCreateRoomPayload, isJoinRoomPayload, isStartGamePayload } from "./events.js";

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
});
