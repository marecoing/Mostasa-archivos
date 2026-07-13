import Phaser from 'phaser';
import { SCENE_KEYS } from '../config/GameConfig';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  preload(): void {
    this.load.setBaseURL('/');
  }

  create(): void {
    this.scene.start(SCENE_KEYS.PRELOAD);
  }
}
