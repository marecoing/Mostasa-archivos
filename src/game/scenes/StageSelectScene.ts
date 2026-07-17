import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config/GameConfig';
import { STAGES } from '../data/StageManifest';
import type { StageDef } from '../data/StageManifest';
import { loadProgress, isStageUnlocked, isStagePlayable } from '../data/CampaignProgress';
import type { CampaignProgress } from '../data/CampaignProgress';
import { RANK_COLORS } from '../data/RankSystem';

const COLS = 5;
const CARD_W = 210;
const CARD_H = 150;
const GAP_X = 24;
const GAP_Y = 28;

interface Card {
  stage: StageDef;
  box: Phaser.GameObjects.Rectangle;
  title: Phaser.GameObjects.Text;
  status: Phaser.GameObjects.Text;
}

/**
 * Campaign stage select (Biblia §32). Shows the 10 modular scenarios with
 * their unlock state; only runtime-ready + unlocked stages can be launched.
 * Progress comes from CampaignProgress (localStorage-backed).
 */
export class StageSelectScene extends Phaser.Scene {
  private progress: CampaignProgress = { cleared: [], bestScore: {}, bestRank: {} };
  private cards: Card[] = [];
  private selected = 0;
  private hintText!: Phaser.GameObjects.Text;
  private nudgeTween?: Phaser.Tweens.Tween;

  constructor() {
    super({ key: SCENE_KEYS.STAGE_SELECT });
  }

  create(): void {
    this.progress = loadProgress();
    this.cameras.main.setBackgroundColor('#08080f');
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.add
      .text(GAME_WIDTH / 2, 46, 'ELEGÍ TU ZONA', {
        fontFamily: 'monospace', fontSize: '30px', color: '#e8c046',
        stroke: '#000000', strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#e8c046', 12, false, true);

    this.add
      .text(GAME_WIDTH / 2, 82, 'CIUDAD DE LA FURIA — CAMPAÑA', {
        fontFamily: 'monospace', fontSize: '12px', color: '#cc4444',
      })
      .setOrigin(0.5);

    this.buildCards();

    this.hintText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 42, '', {
        fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa', align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 18, 'FLECHAS = MOVER    ENTER = JUGAR    ESC = VOLVER', {
        fontFamily: 'monospace', fontSize: '10px', color: '#555555',
      })
      .setOrigin(0.5);

    // Start on the first playable stage if possible.
    const firstPlayable = this.cards.findIndex((c) => isStagePlayable(c.stage, this.progress.cleared));
    this.selected = firstPlayable >= 0 ? firstPlayable : 0;
    this.refreshSelection();

    this.setupInput();
  }

  private buildCards(): void {
    const gridW = COLS * CARD_W + (COLS - 1) * GAP_X;
    const startX = (GAME_WIDTH - gridW) / 2 + CARD_W / 2;
    const startY = 170;

    STAGES.forEach((stage, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CARD_W + GAP_X);
      const y = startY + row * (CARD_H + GAP_Y);

      const unlocked = isStageUnlocked(stage, this.progress.cleared);
      const playable = isStagePlayable(stage, this.progress.cleared);
      const cleared = this.progress.cleared.includes(stage.id);

      const box = this.add
        .rectangle(x, y, CARD_W, CARD_H, playable ? 0x1a1a2a : 0x121218, 1)
        .setStrokeStyle(2, playable ? 0x445 : 0x222);

      this.add
        .text(x - CARD_W / 2 + 12, y - CARD_H / 2 + 10, String(stage.index).padStart(2, '0'), {
          fontFamily: 'monospace', fontSize: '26px',
          color: playable ? '#e8c046' : '#3a3a44', fontStyle: 'bold',
        })
        .setOrigin(0, 0);

      const title = this.add
        .text(x, y - 4, stage.displayName.toUpperCase(), {
          fontFamily: 'monospace', fontSize: '13px',
          color: unlocked ? '#dddddd' : '#555555', align: 'center',
          wordWrap: { width: CARD_W - 24 },
        })
        .setOrigin(0.5);

      const status = this.add
        .text(x, y + CARD_H / 2 - 20, this.statusLabel(stage, unlocked, playable, cleared), {
          fontFamily: 'monospace', fontSize: '11px',
          color: this.statusColor(stage, unlocked, playable, cleared), align: 'center',
        })
        .setOrigin(0.5);

      this.cards.push({ stage, box, title, status });
    });
  }

  private statusLabel(stage: StageDef, unlocked: boolean, playable: boolean, cleared: boolean): string {
    if (!unlocked) return '🔒 BLOQUEADO';
    if (!stage.runtimeReady) return 'PRÓXIMAMENTE';
    if (cleared) {
      const rank = this.progress.bestRank[stage.id];
      return rank ? `✓ DESPEJADO  ${rank}` : '✓ DESPEJADO';
    }
    return playable ? '▶ DISPONIBLE' : 'PRÓXIMAMENTE';
  }

  private statusColor(stage: StageDef, unlocked: boolean, playable: boolean, cleared: boolean): string {
    if (!unlocked) return '#555555';
    if (!stage.runtimeReady) return '#7a6a3a';
    if (cleared) {
      const rank = this.progress.bestRank[stage.id];
      return rank ? RANK_COLORS[rank] : '#44ff88';
    }
    return playable ? '#44ff88' : '#7a6a3a';
  }

  private refreshSelection(): void {
    this.cards.forEach((card, i) => {
      const on = i === this.selected;
      const playable = isStagePlayable(card.stage, this.progress.cleared);
      card.box.setStrokeStyle(on ? 3 : 2, on ? 0xe8c046 : playable ? 0x445566 : 0x222222);
      card.box.setFillStyle(on ? (playable ? 0x2a2a3d : 0x20202a) : (playable ? 0x1a1a2a : 0x121218), 1);
      card.title.setColor(on && playable ? '#ffffff' : isStageUnlocked(card.stage, this.progress.cleared) ? '#dddddd' : '#555555');
    });

    const stage = this.cards[this.selected]?.stage;
    if (!stage) return;
    if (isStagePlayable(stage, this.progress.cleared)) {
      this.hintText.setText(`ENTER para entrar a ${stage.displayName.toUpperCase()}`).setColor('#aaffaa');
    } else if (!isStageUnlocked(stage, this.progress.cleared)) {
      this.hintText.setText('Despejá la zona anterior para desbloquear').setColor('#888888');
    } else {
      this.hintText.setText('Zona en construcción — próximamente jugable').setColor('#c8a84a');
    }
  }

  private setupInput(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-UP', () => this.move(-COLS));
    kb.on('keydown-DOWN', () => this.move(COLS));
    kb.on('keydown-ENTER', () => this.launch());
    kb.on('keydown-SPACE', () => this.launch());
    kb.on('keydown-ESC', () => this.goBack());
  }

  private move(delta: number): void {
    const n = this.cards.length;
    let next = this.selected + delta;
    if (next < 0 || next >= n) return; // stay within the grid edges
    // Guard row wrapping on horizontal moves.
    if (Math.abs(delta) === 1 && Math.floor(next / COLS) !== Math.floor(this.selected / COLS)) return;
    this.selected = next;
    this.refreshSelection();
  }

  private launch(): void {
    const stage = this.cards[this.selected]?.stage;
    if (!stage) return;
    if (!isStagePlayable(stage, this.progress.cleared)) {
      this.nudge();
      return;
    }
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () =>
      this.scene.start(SCENE_KEYS.GAME, { stageId: stage.id }),
    );
  }

  private nudge(): void {
    const card = this.cards[this.selected];
    if (!card || this.nudgeTween?.isPlaying()) return;
    this.nudgeTween = this.tweens.add({
      targets: card.box, x: card.box.x + 6, duration: 45, yoyo: true, repeat: 3,
    });
  }

  private goBack(): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE_KEYS.TITLE));
  }
}
