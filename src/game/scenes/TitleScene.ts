import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config/GameConfig';

const TITLE_COLOR = '#e8c046';
const SUBTITLE_COLOR = '#cc4444';
const TEXT_COLOR = '#cccccc';
const DIM_COLOR = '#888888';

export class TitleScene extends Phaser.Scene {
  private enterKey!: Phaser.Input.Keyboard.Key;
  private blinkText!: Phaser.GameObjects.Text;
  private blinkTimer = 0;
  private blinkVisible = true;
  private scanlines!: Phaser.GameObjects.Graphics;
  private starting = false;

  constructor() {
    super({ key: SCENE_KEYS.TITLE });
  }

  create(): void {
    this.starting = false;
    this.cameras.main.setBackgroundColor('#000000');
    this.createBackground();
    this.createTitleText();
    this.createMenuUI();
    this.createScanlines();
    this.setupInput();
    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  private createBackground(): void {
    const g = this.add.graphics();
    for (let y = 0; y < GAME_HEIGHT; y += 2) {
      const ratio = y / GAME_HEIGHT;
      const r = Math.floor(0x0a + 0x06 * ratio);
      const b = Math.floor(0x1a + 0x0e * ratio);
      const color = (r << 16) | b;
      g.fillStyle(color, 1);
      g.fillRect(0, y, GAME_WIDTH, 2);
    }

    const starGfx = this.add.graphics();
    starGfx.fillStyle(0xffffff, 0.6);
    for (let i = 0; i < 80; i++) {
      const sx = Phaser.Math.Between(0, GAME_WIDTH);
      const sy = Phaser.Math.Between(0, GAME_HEIGHT * 0.6);
      const size = Math.random() < 0.2 ? 2 : 1;
      starGfx.fillRect(sx, sy, size, size);
    }

    const glowGfx = this.add.graphics();
    glowGfx.fillStyle(0xe8c046, 0.03);
    glowGfx.fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT * 0.35, 700, 300);
    glowGfx.fillStyle(0xcc4444, 0.02);
    glowGfx.fillEllipse(GAME_WIDTH / 2, GAME_HEIGHT * 0.6, 900, 200);
  }

  private createTitleText(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 90, "MOSTASA'S", {
        fontFamily: 'monospace',
        fontSize: '72px',
        color: TITLE_COLOR,
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5)
      .setShadow(4, 4, '#c47a00', 16, false, true);

    this.add
      .text(cx, 168, 'RAGE', {
        fontFamily: 'monospace',
        fontSize: '96px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 10,
        align: 'center',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(6, 6, '#cc4444', 20, false, true);

    this.add
      .text(cx, 248, 'CIUDAD DE LA FURIA', {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: SUBTITLE_COLOR,
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center',
        letterSpacing: 6,
      })
      .setOrigin(0.5);

    const divGfx = this.add.graphics();
    divGfx.lineStyle(2, 0xe8c046, 0.5);
    divGfx.lineBetween(cx - 300, 278, cx + 300, 278);
  }

  private createMenuUI(): void {
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 340, 'Buenos Aires, 2026.', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: DIM_COLOR,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        364,
        'La Rosca controla todo. Mostasa perdió sus ahorros.\nUn pendrive lo cambió todo.',
        {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: TEXT_COLOR,
          align: 'center',
          lineSpacing: 4,
        },
      )
      .setOrigin(0.5);

    const versionText = '[ CAMPAÑA — 10 ZONAS JUGABLES ]';
    this.add
      .text(cx, 430, versionText, {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#555555',
        align: 'center',
      })
      .setOrigin(0.5);

    this.blinkText = this.add
      .text(cx, 490, '— ENTER PARA EMPEZAR —', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: TITLE_COLOR,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 516, 'TAB — LA LIBRETA (RÉCORDS)', {
        fontFamily: 'monospace', fontSize: '11px', color: '#777777', align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 540, 'TECLADO: WASD / FLECHAS = MOVER   J = GOLPE   K = FUERTE   L = ESPECIAL   O = ESQUIVAR', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#444444',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT - 20, 'v0.1.0 — Build experimental', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#333333',
        align: 'center',
      })
      .setOrigin(0.5);
  }

  private createScanlines(): void {
    this.scanlines = this.add.graphics();
    this.scanlines.fillStyle(0x000000, 0.04);
    for (let y = 0; y < GAME_HEIGHT; y += 4) {
      this.scanlines.fillRect(0, y, GAME_WIDTH, 2);
    }
    this.scanlines.setDepth(100);
  }

  private setupInput(): void {
    if (this.input.keyboard) {
      this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
      this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.input.keyboard.once('keydown-TAB', () => this.openStats());
    }
  }

  private openStats(): void {
    if (this.starting) return;
    this.starting = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE_KEYS.STATS));
  }

  update(time: number, delta: number): void {
    this.blinkTimer += delta;
    if (this.blinkTimer >= 550) {
      this.blinkTimer = 0;
      this.blinkVisible = !this.blinkVisible;
      this.blinkText.setVisible(this.blinkVisible);
    }

    // Latch: isDown holds for several frames, and stacking one fade-out
    // callback per frame would restart the next scene repeatedly.
    if (this.enterKey?.isDown && !this.starting) {
      this.starting = true;
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENE_KEYS.STAGE_SELECT);
      });
    }
  }
}
