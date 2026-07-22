import { describe, expect, it, vi } from 'vitest';
import type Phaser from 'phaser';
import type { StageDef } from '../../src/game/data/StageManifest';

vi.mock('../../src/game/config/GameConfig', () => ({ GAME_HEIGHT: 720 }));

import {
  STAGE_PANEL_SEAM_OVERLAP_PX,
  StageBackground,
  stagePanelScreenX,
} from '../../src/game/systems/StageBackground';

interface ImageCall {
  x: number;
  y: number;
  key: string;
  displayWidth?: number;
  displayHeight?: number;
}

function sceneStub(): { scene: Phaser.Scene; images: ImageCall[] } {
  const images: ImageCall[] = [];
  const scene = {
    textures: { exists: () => true },
    add: {
      image: (x: number, y: number, key: string) => {
        const call: ImageCall = { x, y, key };
        images.push(call);
        const image = {
          setOrigin: () => image,
          setDisplaySize: (width: number, height: number) => {
            call.displayWidth = width;
            call.displayHeight = height;
            return image;
          },
          setScrollFactor: () => image,
          setDepth: () => image,
          setX: (nextX: number) => {
            call.x = nextX;
            return image;
          },
        };
        return image;
      },
    },
  };
  return { scene: scene as unknown as Phaser.Scene, images };
}

const STAGE: StageDef = {
  id: 'test-stage',
  index: 1,
  displayName: 'Test',
  panelCount: 5,
  panelWidth: 1024,
  panelHeight: 1024,
  panelPaths: ['1', '2', '3', '4', '5'],
  runtimeReady: true,
  miniBossId: null,
  bossId: 1,
  nextStageId: null,
};

describe('StageBackground panel seams', () => {
  it('snaps the camera once while preserving the exact canonical panel step', () => {
    const width = 972;
    const positions = Array.from({ length: 5 }, (_, index) =>
      stagePanelScreenX(index, width, 123.6),
    );

    expect(positions).toEqual([-124, 848, 1820, 2792, 3764]);
    expect(positions.every(Number.isInteger)).toBe(true);
    for (let index = 1; index < positions.length; index++) {
      expect(positions[index]! - positions[index - 1]!).toBe(width);
    }
  });

  it('adds two pixels of visual bleed without changing world width', () => {
    const { scene, images } = sceneStub();
    const background = new StageBackground(scene, STAGE);

    expect(background.panelDisplayWidth).toBe(972);
    expect(background.worldWidth).toBe(972 * STAGE.panelCount);
    expect(images).toHaveLength(STAGE.panelCount);
    for (const image of images) {
      expect(image.displayWidth).toBe(background.panelDisplayWidth + STAGE_PANEL_SEAM_OVERLAP_PX);
      expect(image.displayHeight).toBe(972);
    }
  });

  it('recomputes positions from canonical indices without accumulated error', () => {
    const { scene, images } = sceneStub();
    const background = new StageBackground(scene, STAGE);

    background.update(486.51);

    expect(images.map(({ x }) => x)).toEqual([-487, 485, 1457, 2429, 3401]);
    expect(images[4]!.x).toBe(images[0]!.x + 4 * background.panelDisplayWidth);
  });
});
