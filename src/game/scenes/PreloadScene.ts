import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config/GameConfig';
import { loadCharacterSheets } from '../systems/CharacterAnimator';
import { loadStageAssets } from '../systems/AssetLoader';
import { castForStage } from '../data/WaveManifest';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;
  private assetText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.PRELOAD });
  }

  preload(): void {
    this.createLoadingUI();
    this.registerLoadEvents();
    this.loadPlaceholderAssets();
  }

  private createLoadingUI(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const barWidth = 500;
    const barHeight = 16;

    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.9);
    this.progressBox.fillRect(cx - barWidth / 2 - 4, cy - barHeight / 2 - 4, barWidth + 8, barHeight + 8);
    this.progressBox.lineStyle(2, 0xe8c046, 1);
    this.progressBox.strokeRect(cx - barWidth / 2 - 4, cy - barHeight / 2 - 4, barWidth + 8, barHeight + 8);

    this.progressBar = this.add.graphics();

    const titleStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#e8c046',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
    };

    this.add
      .text(cx, cy - 80, "MOSTASA'S RAGE", titleStyle)
      .setOrigin(0.5)
      .setShadow(0, 0, '#e8c046', 12, false, true);

    this.add
      .text(cx, cy - 48, 'CIUDAD DE LA FURIA', {
        ...titleStyle,
        fontSize: '16px',
        color: '#cc4444',
      })
      .setOrigin(0.5);

    this.loadingText = this.add
      .text(cx, cy + 30, 'Cargando...', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    this.percentText = this.add
      .text(cx, cy + 50, '0%', {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#666666',
      })
      .setOrigin(0.5);

    this.assetText = this.add
      .text(cx, cy + 70, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#444444',
      })
      .setOrigin(0.5);
  }

  private registerLoadEvents(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const barWidth = 500;
    const barHeight = 16;

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xe8c046, 1);
      this.progressBar.fillRect(cx - barWidth / 2, cy - barHeight / 2, barWidth * value, barHeight);
      this.percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('fileprogress', (file: Phaser.Loader.File) => {
      this.assetText.setText(`[${file.key}]`);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();
      this.percentText.destroy();
      this.assetText.destroy();
      this.scene.start(SCENE_KEYS.TITLE);
    });
  }

  private loadPlaceholderAssets(): void {
    this.createPlaceholderTextures();
    // Only the cast Escenario 1 needs before play; the mini-boss and boss
    // sheets stream in once the stage is running (§ presupuesto de assets).
    loadCharacterSheets(this, castForStage('01-once').upfront);
    loadStageAssets(this, '01-once');
  }

  private createPlaceholderTextures(): void {
    const g = this.make.graphics({ x: 0, y: 0 });

    g.fillStyle(0x4a7c59);
    g.fillRect(0, 0, 64, 96);
    g.lineStyle(2, 0x2d5a3d);
    g.strokeRect(0, 0, 64, 96);
    g.fillStyle(0xf4c89a);
    g.fillCircle(32, 20, 14);
    g.generateTexture('player_placeholder', 64, 96);

    g.clear();
    g.fillStyle(0xcc4444);
    g.fillRect(0, 0, 48, 72);
    g.lineStyle(2, 0x882222);
    g.strokeRect(0, 0, 48, 72);
    g.fillStyle(0xf0c88a);
    g.fillCircle(24, 16, 11);
    g.generateTexture('enemy_placeholder', 48, 72);

    g.clear();
    g.fillStyle(0x1a1a2e);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.generateTexture('bg_placeholder', GAME_WIDTH, GAME_HEIGHT);

    g.destroy();
  }
}
