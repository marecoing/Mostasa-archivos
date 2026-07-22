import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { TitleScene } from '../scenes/TitleScene';
import { StageSelectScene } from '../scenes/StageSelectScene';
import { GameScene } from '../scenes/GameScene';
import { ResultsScene } from '../scenes/ResultsScene';
import { CutsceneScene } from '../scenes/CutsceneScene';
import { EndingScene } from '../scenes/EndingScene';
import { ShopScene } from '../scenes/ShopScene';
import { StatsScene } from '../scenes/StatsScene';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  TITLE: 'TitleScene',
  STAGE_SELECT: 'StageSelectScene',
  CUTSCENE: 'CutsceneScene',
  GAME: 'GameScene',
  RESULTS: 'ResultsScene',
  ENDING: 'EndingScene',
  SHOP: 'ShopScene',
  STATS: 'StatsScene',
} as const;

export type SceneKey = (typeof SCENE_KEYS)[keyof typeof SCENE_KEYS];

export function createGameConfig(parent: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.WEBGL,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#000000',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    render: {
      // The game uses continuously scaled, photorealistic raster art rather
      // than pixel-art tiles. Linear filtering avoids jagged fractional-scale
      // silhouettes and shimmering while the camera moves.
      antialias: true,
      pixelArt: false,
      roundPixels: true,
    },
    fps: {
      target: 60,
      forceSetTimeOut: false,
    },
    input: {
      keyboard: true,
      gamepad: true,
    },
    audio: {
      disableWebAudio: false,
    },
    title: "Mostasa's Rage: Ciudad de la Furia",
    version: '0.1.0',
    scene: [
      BootScene,
      PreloadScene,
      TitleScene,
      StageSelectScene,
      CutsceneScene,
      GameScene,
      ResultsScene,
      EndingScene,
      ShopScene,
      StatsScene,
    ],
  };
}
