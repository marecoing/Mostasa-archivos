import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/GameConfig';
import { propKey } from './AssetLoader';
import { propsForStage, propScreenX } from '../data/PropManifest';
import type { PropDef } from '../data/PropManifest';

/** Render depth for each parallax layer. */
const BACK_DEPTH = -900; // behind the fighters, in front of the painted panels
const FRONT_DEPTH = 700; // in front of the fighters (they pass behind these)
/** Horizontal margin (px) beyond the screen before a prop is culled. */
const CULL_MARGIN = 200;
/**
 * Global size correction: the prop art was authored oversized relative to the
 * fighters, so every prop is scaled down uniformly to sit in proportion.
 */
const PROP_SCALE_MULT = 0.72;

interface PropSprite {
  def: PropDef;
  sprite: Phaser.GameObjects.Image;
}

/**
 * Places and scrolls a stage's decorative props (PropManifest) in two parallax
 * layers. Purely cosmetic: no collision, no gameplay effect. Off-screen props
 * are hidden so a long street stays cheap to draw.
 */
export class PropSystem {
  private items: PropSprite[] = [];

  constructor(scene: Phaser.Scene, stageId: string) {
    for (const def of propsForStage(stageId)) {
      const key = propKey(def.id);
      if (!scene.textures.exists(key)) continue;
      const sprite = scene.add
        .image(0, def.groundScreenY, key)
        .setOrigin(0.5, 1)
        .setScale(def.scale * PROP_SCALE_MULT)
        .setScrollFactor(0)
        .setDepth(def.layer === 'front' ? FRONT_DEPTH : BACK_DEPTH);
      if (def.flip) sprite.setFlipX(true);
      if (def.alpha !== undefined) sprite.setAlpha(def.alpha);
      this.items.push({ def, sprite });
    }
  }

  /** True if any prop actually loaded. */
  get isReady(): boolean {
    return this.items.length > 0;
  }

  /** Scroll every prop for the current camera position, culling off-screen. */
  update(cameraWorldX: number): void {
    for (const { def, sprite } of this.items) {
      const x = propScreenX(def.worldX, cameraWorldX, def.parallax);
      const halfW = sprite.displayWidth / 2 + CULL_MARGIN;
      if (x < -halfW || x > GAME_WIDTH + halfW) {
        sprite.setVisible(false);
        continue;
      }
      sprite.setVisible(true);
      sprite.setX(x);
    }
  }

  destroy(): void {
    for (const { sprite } of this.items) sprite.destroy();
    this.items = [];
  }
}
