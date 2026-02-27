import assert from "node:assert/strict";
import { RoomStore } from "./rooms/roomStore.js";

const store = new RoomStore(8);
const room = store.createRoom({
  socketId: "host-1",
  playerName: "Host",
  characterId: "scout"
});

assert.equal(room.roomCode.length, 4);
assert.equal(room.hostSocketId, "host-1");
assert.equal(room.phase, "lobby");
assert.equal(room.match.countdownSeconds, null);
assert.equal(room.players.size, 1);

const limited = new RoomStore(1);
const limitedRoom = limited.createRoom({
  socketId: "host-1",
  playerName: "Host",
  characterId: "scout"
});
const joinResult = limited.joinRoom({
  roomCode: limitedRoom.roomCode,
  socketId: "p2",
  playerName: "P2",
  characterId: "pilot"
});
assert.equal("error" in joinResult ? joinResult.error : undefined, "ROOM_FULL");

store.joinRoom({
  roomCode: room.roomCode,
  socketId: "p2",
  playerName: "Guest",
  characterId: "pilot"
});
const updated = store.removePlayer("host-1");
assert.equal(updated?.hostSocketId, "p2");
assert.equal(store.isHost(room.roomCode, "p2"), true);
assert.equal(store.isHost(room.roomCode, "host-1"), false);

console.log("apps/server unit tests passed");
