import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/GameConfig';
import { DEPTH_SCALE } from '../core/Physics25D';
import { propKey } from './AssetLoader';
import { propsForStage, propScreenX, solidFootprintFor } from '../data/PropManifest';
import type { PropDef, SolidFootprint } from '../data/PropManifest';
import {
  FLOOR_OFFSET_PX,
  PROP_VISUALS,
  isOccludingFighter,
  propScaleFor,
} from '../data/VisualMetrics';
import type { ScreenRect } from '../data/VisualMetrics';

/** Render depth for each parallax layer. */
const BACK_DEPTH = -900; // behind the fighters, in front of the painted panels
/** Horizontal margin (px) beyond the screen before a prop is culled. */
const CULL_MARGIN = 200;
const OCCLUDED_ALPHA = 0.38;

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
      const visual = PROP_VISUALS[def.id];
      const frontDepth = (def.groundScreenY - FLOOR_OFFSET_PX) / DEPTH_SCALE;
      const sprite = scene.add
        .image(0, def.groundScreenY, key)
        .setOrigin(visual?.originX ?? 0.5, visual?.originY ?? 1)
        .setScale(propScaleFor(def.id, def.scale))
        .setScrollFactor(0)
        .setDepth(def.layer === 'front' ? frontDepth : BACK_DEPTH);
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
   * Front-layer props y-sort from their ground contact. They fade only when
   * their rendered rectangle is genuinely in front of and intersects a live
   * fighter; horizontal proximity alone is not enough.
   */
  update(cameraWorldX: number, fighters: readonly ScreenRect[] = []): void {
    for (const { def, sprite, parallax } of this.items) {
      const x = propScreenX(def.worldX, cameraWorldX, parallax);
      const halfW = sprite.displayWidth / 2 + CULL_MARGIN;
      if (x < -halfW || x > GAME_WIDTH + halfW) {
        sprite.setVisible(false);
        continue;
      }
      sprite.setVisible(true);
      sprite.setX(x);

      if (def.layer === 'front') {
        const bounds = sprite.getBounds();
        const propBounds: ScreenRect = {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          depth: sprite.depth,
        };
        const target = isOccludingFighter(propBounds, fighters) ? OCCLUDED_ALPHA : (def.alpha ?? 1);
        sprite.setAlpha(sprite.alpha + (target - sprite.alpha) * 0.18);
      }
    }
  }

  destroy(): void {
    for (const { sprite } of this.items) sprite.destroy();
    this.items = [];
  }
}
