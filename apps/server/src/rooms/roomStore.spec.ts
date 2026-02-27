import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RoomStore } from "./roomStore.js";

describe("RoomStore", () => {
  it("creates a room with host player", () => {
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
  });

  it("rejects joins when room is full", () => {
    const store = new RoomStore(1);
    const room = store.createRoom({
      socketId: "host-1",
      playerName: "Host",
      characterId: "scout"
    });

    const result = store.joinRoom({
      roomCode: room.roomCode,
      socketId: "p2",
      playerName: "P2",
      characterId: "pilot"
    });

    assert.equal("error" in result ? result.error : undefined, "ROOM_FULL");
  });

  it("reassigns host on host disconnect", () => {
    const store = new RoomStore(8);
    const room = store.createRoom({
      socketId: "host-1",
      playerName: "Host",
      characterId: "scout"
    });
    store.joinRoom({
      roomCode: room.roomCode,
      socketId: "p2",
      playerName: "P2",
      characterId: "pilot"
    });

    const updated = store.removePlayer("host-1");
    assert.equal(updated?.hostSocketId, "p2");
  });

  it("checks host ownership by socket id", () => {
    const store = new RoomStore(8);
    const room = store.createRoom({
      socketId: "host-1",
      playerName: "Host",
      characterId: "scout"
    });
    store.joinRoom({
      roomCode: room.roomCode,
      socketId: "p2",
      playerName: "P2",
      characterId: "pilot"
    });

    assert.equal(store.isHost(room.roomCode, "host-1"), true);
    assert.equal(store.isHost(room.roomCode, "p2"), false);
  });
});
