import type { PlayerSlotState } from "../contracts/models.js";

export const PLAYFIELD_WIDTH = 480;
export const PLAYFIELD_HEIGHT = 720;

export function toPercentX(x: number): string {
  return `${(x / PLAYFIELD_WIDTH) * 100}%`;
}

export function toPercentY(y: number): string {
  return `${(y / PLAYFIELD_HEIGHT) * 100}%`;
}

export function toPlayerSlotStyle(slot: PlayerSlotState): { left: string; top: string } {
  return {
    left: toPercentX(slot.x),
    top: toPercentY(slot.y)
  };
}

export function toProjectileOwnerClass(ownerId: string): string {
  let hash = 0;
  for (let index = 0; index < ownerId.length; index += 1) {
    hash = (hash + ownerId.charCodeAt(index) * (index + 1)) % 4;
  }
  return `projectile-owner-${hash}`;
}


