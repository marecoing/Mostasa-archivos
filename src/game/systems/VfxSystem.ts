import Phaser from 'phaser';
import { VFX, VFX_LIST } from '../data/VfxManifest';
import type { VfxDef } from '../data/VfxManifest';

/** Load every VFX strip as a spritesheet. Call in preload(). */
export function loadVfxSheets(scene: Phaser.Scene): void {
  for (const def of VFX_LIST) {
    scene.load.spritesheet(`vfx_${def.id}`, def.path, {
      frameWidth: def.frameWidth,
      frameHeight: def.frameHeight,
    });
  }
}

/**
 * Fire-and-forget 2D effect player. Registers one-shot animations for each
 * VFX and spawns a self-destroying sprite at a screen position on demand.
 */
export class VfxSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.registerAnims();
  }

  private registerAnims(): void {
    for (const def of VFX_LIST) {
      const key = `vfx_${def.id}`;
      const animKey = `${key}_play`;
      if (!this.scene.textures.exists(key) || this.scene.anims.exists(animKey)) continue;
      const total = this.scene.textures.get(key).frameTotal - 1;
      const frames = Array.from({ length: def.frameCount }, (_, i) => i).filter((f) => f < total);
      if (frames.length === 0) continue;
      this.scene.anims.create({
        key: animKey,
        frames: frames.map((frame) => ({ key, frame })),
        frameRate: def.frameRate,
        repeat: 0,
      });
    }
  }

  /**
   * Play a VFX at a screen position. `depth` orders it against the cast.
   * The sprite removes itself when the animation completes.
   */
  play(id: string, screenX: number, screenY: number, depth = 5000, scaleMul = 1): void {
    const def: VfxDef | undefined = VFX[id];
    const key = `vfx_${id}`;
    if (!def || !this.scene.textures.exists(key)) return;
    const animKey = `${key}_play`;
    if (!this.scene.anims.exists(animKey)) return;

    const sprite = this.scene.add.sprite(screenX, screenY, key, 0);
    sprite.setDepth(depth);
    sprite.setScale(def.scale * scaleMul);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    sprite.once('animationcomplete', () => sprite.destroy());
    sprite.play(animKey);
  }
}
