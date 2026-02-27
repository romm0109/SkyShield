import type { PlayerSlotState, PlayerState } from "@skyshield/shared-types";

const DEFAULT_SIDE_PADDING = 56;
const DEFAULT_CANNON_OFFSET_Y = 24;

export interface PlayerSlotLayoutConfig {
  playfieldWidth: number;
  groundY: number;
  sidePadding?: number;
  cannonOffsetY?: number;
}

export interface CannonOrigin {
  x: number;
  y: number;
}

function normalizePlayers(players: Iterable<PlayerState>): PlayerState[] {
  return Array.from(players).sort((left, right) => left.id.localeCompare(right.id));
}

export function buildPlayerSlots(players: Iterable<PlayerState>, config: PlayerSlotLayoutConfig): PlayerSlotState[] {
  const normalizedPlayers = normalizePlayers(players);
  if (normalizedPlayers.length === 0) {
    return [];
  }

  const sidePadding = Math.max(0, config.sidePadding ?? DEFAULT_SIDE_PADDING);
  const availableWidth = Math.max(0, config.playfieldWidth - sidePadding * 2);
  const y = config.groundY - Math.max(0, config.cannonOffsetY ?? DEFAULT_CANNON_OFFSET_Y);
  const laneStep = normalizedPlayers.length === 1 ? 0 : availableWidth / (normalizedPlayers.length - 1);

  return normalizedPlayers.map((player, index) => ({
    playerId: player.id,
    x: normalizedPlayers.length === 1 ? config.playfieldWidth / 2 : sidePadding + laneStep * index,
    y,
    lane: index
  }));
}

export function getCannonOriginByPlayerId(playerId: string, slots: PlayerSlotState[]): CannonOrigin | null {
  for (const slot of slots) {
    if (slot.playerId === playerId) {
      return { x: slot.x, y: slot.y };
    }
  }
  return null;
}

