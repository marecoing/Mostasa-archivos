import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/GameConfig';
import { propKey } from './AssetLoader';
import { propsForStage, propScreenX, solidFootprintFor } from '../data/PropManifest';
import type { PropDef, SolidFootprint } from '../data/PropManifest';

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
  /** solid props are world-anchored (parallax 1) and block movement */
  parallax: number;
}

export interface PlacedSolidProp {
  worldX: number;
  groundScreenY: number;
  footprint: SolidFootprint;
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
      // Solid front props are pinned to the street (parallax 1) so their
      // collision footprint and their pixels stay in the same place.
      const solid = def.layer === 'front' && solidFootprintFor(def.id);
      this.items.push({ def, sprite, parallax: solid ? 1 : def.parallax });
    }
  }

  /** World-anchored footprints of the solid props placed on this stage. */
  solidProps(): PlacedSolidProp[] {
    const out: PlacedSolidProp[] = [];
    for (const { def, parallax } of this.items) {
      if (def.layer !== 'front' || parallax !== 1) continue;
      const footprint = solidFootprintFor(def.id);
      if (footprint) out.push({ worldX: def.worldX, groundScreenY: def.groundScreenY, footprint });
    }
    return out;
  }

  /** True if any prop actually loaded. */
  get isReady(): boolean {
    return this.items.length > 0;
  }

  /**
   * Scroll every prop for the current camera position, culling off-screen.
   * Front-layer props that overlap the player's screen position fade to a
   * ghost so they never hide the fight (classic brawler occluder handling).
   */
  update(cameraWorldX: number, playerScreenX?: number): void {
    for (const { def, sprite, parallax } of this.items) {
      const x = propScreenX(def.worldX, cameraWorldX, parallax);
      const halfW = sprite.displayWidth / 2 + CULL_MARGIN;
      if (x < -halfW || x > GAME_WIDTH + halfW) {
        sprite.setVisible(false);
        continue;
      }
      sprite.setVisible(true);
      sprite.setX(x);

      if (def.layer === 'front' && playerScreenX !== undefined) {
        const overlap = Math.abs(x - playerScreenX) < sprite.displayWidth / 2 + 46;
        const target = overlap ? 0.38 : (def.alpha ?? 1);
        sprite.setAlpha(sprite.alpha + (target - sprite.alpha) * 0.18);
      }
    }
  }

  destroy(): void {
    for (const { sprite } of this.items) sprite.destroy();
    this.items = [];
  }
}
