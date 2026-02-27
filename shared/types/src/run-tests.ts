import assert from "node:assert/strict";
import { isCreateRoomPayload, isJoinRoomPayload } from "./events.js";

assert.equal(isCreateRoomPayload({ playerName: "Dana", characterId: "scout" }), true);
assert.equal(isCreateRoomPayload({ playerName: " ", characterId: "scout" }), false);
assert.equal(
  isJoinRoomPayload({
    roomCode: "AB12",
    playerName: "Dana",
    characterId: "scout"
  }),
  true
);
assert.equal(
  isJoinRoomPayload({
    roomCode: "ab-1",
    playerName: "Dana",
    characterId: "scout"
  }),
  false
);

console.log("shared/types tests passed");
