import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config/GameConfig';
import { stageById } from '../data/StageManifest';
import type { StageDef } from '../data/StageManifest';

/** Texture key for a stage panel. */
export function stagePanelKey(stageId: string, panelIndex: number): string {
  return `stage_${stageId}_p${panelIndex}`;
}

/** Load a runtime-ready stage's panels. Call in preload(). */
export function loadStagePanels(scene: Phaser.Scene, stageId: string): void {
  const stage = stageById(stageId);
  if (!stage || !stage.runtimeReady) return;
  stage.panelPaths.forEach((path, i) => {
    scene.load.image(stagePanelKey(stageId, i + 1), path);
  });
}

/**
 * Scrolling 2.5D backdrop built from a stage's 1024×1024 panels laid side
 * by side. Scrolls 1:1 with the camera (1 world unit = 1 screen pixel) and
 * sits behind every gameplay object. The painted floor is aligned to the
 * character lane via a vertical offset.
 */
export class StageBackground {
  private scene: Phaser.Scene;
  private panels: Phaser.GameObjects.Image[] = [];
  /** display width of a single scaled panel (also the world span it covers) */
  readonly panelDisplayWidth: number;
  /** total scrollable width of the backdrop in world units */
  readonly worldWidth: number;

  // The panels are squares whose painted floor sits in the lower third.
  // Scale them ~1.35x screen height and push them up so the floor line
  // falls around the character lane (screenY ~230-350). Computed in the
  // constructor (not a static field) to avoid a circular-import TDZ on
  // GAME_HEIGHT.
  private static readonly SCALE_MUL = 1.35;
  private static readonly Y_OFFSET = -196;

  constructor(scene: Phaser.Scene, stage: StageDef) {
    this.scene = scene;
    const scale = (GAME_HEIGHT / 1024) * StageBackground.SCALE_MUL;
    this.panelDisplayWidth = Math.round(stage.panelWidth * scale);

    for (let i = 0; i < stage.panelCount; i++) {
      const key = stagePanelKey(stage.id, i + 1);
      if (!scene.textures.exists(key)) continue;
      const img = scene.add
        .image(i * this.panelDisplayWidth, StageBackground.Y_OFFSET, key)
        .setOrigin(0, 0)
        .setScale(scale)
        .setScrollFactor(0)
        .setDepth(-1000);
      this.panels.push(img);
    }
    this.worldWidth = this.panelDisplayWidth * stage.panelCount;
  }

  /** Scroll the backdrop to match the camera's world X (parallax 1.0). */
  update(cameraWorldX: number): void {
    for (let i = 0; i < this.panels.length; i++) {
      this.panels[i]!.setX(i * this.panelDisplayWidth - cameraWorldX);
    }
  }

  /** True if the backdrop actually loaded any panels. */
  get isReady(): boolean {
    return this.panels.length > 0;
  }
}
