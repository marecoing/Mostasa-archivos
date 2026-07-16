import Phaser from 'phaser';
import { loadVfxSheets } from './VfxSystem';
import { loadStagePanels } from './StageBackground';
import { BREAKABLE_LIST } from '../data/BreakableManifest';
import { WEAPON_LIST, PICKUP_LIST, REWARD_LIST } from '../data/ItemManifest';

/** Texture key helpers so scenes and systems agree on names. */
export const breakableKey = (id: string): string => `breakable_${id}`;
export const itemKey = (id: string): string => `item_${id}`;

/**
 * Load every runtime asset for the current playable slice (Escenario 1).
 * Stage backgrounds beyond Once are lazy — only runtime-ready stages load
 * their panels (Biblia Maestra §32).
 */
export function loadStageAssets(scene: Phaser.Scene, stageId: string): void {
  loadStagePanels(scene, stageId);
  loadVfxSheets(scene);

  // Destructibles as 4-frame sheets.
  for (const b of BREAKABLE_LIST) {
    scene.load.spritesheet(breakableKey(b.id), b.path, {
      frameWidth: b.frameWidth,
      frameHeight: b.frameHeight,
    });
  }

  // Single-frame collectibles + weapons.
  for (const item of [...WEAPON_LIST, ...PICKUP_LIST, ...REWARD_LIST]) {
    scene.load.image(itemKey(item.id), item.path);
  }
}
