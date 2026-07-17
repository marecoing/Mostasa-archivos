import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config/GameConfig';
import { introForStage } from '../data/StoryManifest';
import type { StoryLine } from '../data/StoryManifest';
import { stageById } from '../data/StageManifest';

const CHARS_PER_SECOND = 55;

/**
 * Text cutscene before a stage (Biblia §5). Typewriter reveal; ENTER
 * completes the line or advances, ESC skips the whole scene. Always ends by
 * starting GameScene with the same stageId.
 */
export class CutsceneScene extends Phaser.Scene {
  private stageId = '01-once';
  private lines: StoryLine[] = [];
  private lineIndex = 0;
  private revealed = 0;
  private leaving = false;

  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.CUTSCENE });
  }

  init(data: { stageId?: string }): void {
    if (data?.stageId) this.stageId = data.stageId;
  }

  create(): void {
    this.lines = introForStage(this.stageId)?.lines ?? [];
    this.lineIndex = 0;
    this.revealed = 0;
    this.leaving = false;

    // Nothing scripted for this stage — go straight to gameplay.
    if (this.lines.length === 0) {
      this.scene.start(SCENE_KEYS.GAME, { stageId: this.stageId });
      return;
    }

    this.cameras.main.setBackgroundColor('#060609');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    const cx = GAME_WIDTH / 2;

    const stage = stageById(this.stageId);
    this.add
      .text(cx, 70, stage ? `NIVEL ${stage.index} — ${stage.displayName.toUpperCase()}` : '', {
        fontFamily: 'monospace', fontSize: '15px', color: '#cc4444', letterSpacing: 3,
      })
      .setOrigin(0.5);

    // Dialogue box.
    this.add
      .rectangle(cx, GAME_HEIGHT / 2 + 40, GAME_WIDTH - 280, 220, 0x10101c, 0.95)
      .setStrokeStyle(2, 0x333355);
    this.speakerText = this.add
      .text(180, GAME_HEIGHT / 2 - 40, '', {
        fontFamily: 'monospace', fontSize: '14px', color: '#e8c046', fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);
    this.bodyText = this.add
      .text(180, GAME_HEIGHT / 2 - 8, '', {
        fontFamily: 'monospace', fontSize: '16px', color: '#dddddd',
        lineSpacing: 8, wordWrap: { width: GAME_WIDTH - 360 },
      })
      .setOrigin(0, 0);

    this.promptText = this.add
      .text(cx, GAME_HEIGHT - 60, 'ENTER CONTINUAR      ESC SALTEAR', {
        fontFamily: 'monospace', fontSize: '11px', color: '#666666',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: this.promptText, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

    this.showLine(0);

    this.input.keyboard?.on('keydown-ENTER', () => this.advance());
    this.input.keyboard?.on('keydown-SPACE', () => this.advance());
    this.input.keyboard?.on('keydown-ESC', () => this.startStage());
  }

  private showLine(i: number): void {
    this.lineIndex = i;
    this.revealed = 0;
    const line = this.lines[i];
    if (!line) return;
    this.speakerText.setText(line.speaker);
    this.bodyText.setText('');
  }

  private currentLine(): StoryLine | undefined {
    return this.lines[this.lineIndex];
  }

  private advance(): void {
    const line = this.currentLine();
    if (!line) return;
    if (this.revealed < line.text.length) {
      // First press: finish the typewriter instantly.
      this.revealed = line.text.length;
      this.bodyText.setText(line.text);
      return;
    }
    if (this.lineIndex + 1 < this.lines.length) {
      this.showLine(this.lineIndex + 1);
    } else {
      this.startStage();
    }
  }

  private startStage(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.GAME, { stageId: this.stageId });
    });
  }

  update(_time: number, delta: number): void {
    const line = this.currentLine();
    if (!line || this.leaving) return;
    if (this.revealed < line.text.length) {
      this.revealed = Math.min(line.text.length, this.revealed + (delta / 1000) * CHARS_PER_SECOND);
      this.bodyText.setText(line.text.slice(0, Math.floor(this.revealed)));
    }
  }
}
