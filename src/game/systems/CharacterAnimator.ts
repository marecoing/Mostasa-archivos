import Phaser from 'phaser';
import {
  MOSTASA_ANIMS,
  enemyAnimsFor,
  clipFrames,
  gridFor,
} from '../data/AnimationData';
import type { AnimClip } from '../data/AnimationData';

/** Texture keys for every Escenario 1 character sheet. */
export const CHARACTER_SHEETS: { key: string; file: string }[] = [
  { key: 'mostasa',   file: 'assets/characters/mostasa.png' },
  { key: 'enemy_001', file: 'assets/characters/enemy_001.png' },
  { key: 'enemy_002', file: 'assets/characters/enemy_002.png' },
  { key: 'enemy_003', file: 'assets/characters/enemy_003.png' },
  { key: 'enemy_004', file: 'assets/characters/enemy_004.png' },
  { key: 'enemy_005', file: 'assets/characters/enemy_005.png' },
  { key: 'enemy_006', file: 'assets/characters/enemy_006.png' },
  { key: 'enemy_007', file: 'assets/characters/enemy_007.png' },
  { key: 'enemy_008', file: 'assets/characters/enemy_008.png' },
  { key: 'enemy_009', file: 'assets/characters/enemy_009.png' },
  { key: 'enemy_010', file: 'assets/characters/enemy_010.png' },
];

/** Load all character sheets, each with its own measured frame size. */
export function loadCharacterSheets(scene: Phaser.Scene): void {
  for (const sheet of CHARACTER_SHEETS) {
    const g = gridFor(sheet.key);
    scene.load.spritesheet(sheet.key, sheet.file, {
      frameWidth: g.frameWidth,
      frameHeight: g.frameHeight,
    });
  }
}

function registerAnims(
  scene: Phaser.Scene,
  textureKey: string,
  config: Record<string, AnimClip>,
): void {
  if (!scene.textures.exists(textureKey)) return;
  const grid = gridFor(textureKey);
  const totalFrames = scene.textures.get(textureKey).frameTotal - 1; // -1 for __BASE

  for (const [state, c] of Object.entries(config)) {
    const animKey = `${textureKey}_${state}`;
    if (scene.anims.exists(animKey)) continue;

    // Clamp frames that fall outside the actual sheet (guards short sheets)
    const frames = clipFrames(c, grid.cols).filter((f) => f < totalFrames);
    if (frames.length === 0) continue;

    scene.anims.create({
      key: animKey,
      frames: frames.map((frame) => ({ key: textureKey, frame })),
      frameRate: c.frameRate,
      repeat: c.loop ? -1 : 0,
    });
  }
}

/** Register every character's animation set. Call once in the gameplay scene. */
export function registerAllCharacterAnims(scene: Phaser.Scene): void {
  registerAnims(scene, 'mostasa', MOSTASA_ANIMS);
  for (let i = 1; i <= 10; i++) {
    const key = `enemy_${String(i).padStart(3, '0')}`;
    registerAnims(scene, key, enemyAnimsFor(key));
  }
}

/**
 * Play the animation for a given logical state on a sprite, without
 * restarting it if it is already the current animation. Falls back to
 * `idle` when the state has no clip.
 */
export function playState(
  sprite: Phaser.GameObjects.Sprite,
  textureKey: string,
  state: string,
): void {
  const desired = `${textureKey}_${state}`;
  const fallback = `${textureKey}_idle`;
  const scene = sprite.scene;

  const target = scene.anims.exists(desired) ? desired : fallback;
  if (!scene.anims.exists(target)) return;

  const current = sprite.anims.currentAnim;
  if (current && current.key === target) return;
  sprite.play(target, true);
}
