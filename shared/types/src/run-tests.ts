import assert from "node:assert/strict";
import { isCreateRoomPayload, isJoinRoomPayload, isShootPayload, isStartGamePayload } from "./events.js";
import "./simulation.spec.js";

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
assert.equal(isStartGamePayload({ roomCode: "AB12" }), true);
assert.equal(isStartGamePayload({ roomCode: "ab-1" }), false);
assert.equal(isStartGamePayload({}), false);
assert.equal(
  isShootPayload({
    roomCode: "AB12",
    targetX: 300,
    targetY: 240,
    clientTs: 1700000000000
  }),
  true
);
assert.equal(
  isShootPayload({
    roomCode: "AB12",
    targetX: -1,
    targetY: 240,
    clientTs: 1700000000000
  }),
  false
);
assert.equal(
  isShootPayload({
    roomCode: "bad!",
    targetX: 300,
    targetY: 240,
    clientTs: 1700000000000
  }),
  false
);
assert.equal(
  isShootPayload({
    roomCode: "AB12",
    targetX: 300,
    targetY: 240
  }),
  false
);

console.log("shared/types tests passed");
