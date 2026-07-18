import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config/GameConfig';
import { computeRank, RANK_COLORS } from '../data/RankSystem';
import type { StageResult } from '../data/RankSystem';
import { itemKey } from '../systems/AssetLoader';
import { stageById } from '../data/StageManifest';
import { recordStageResult, isStageUnlocked, saveProgress } from '../data/CampaignProgress';
import { grantAchievements, ACHIEVEMENT_BY_ID } from '../data/AchievementManifest';

export interface ResultsData extends StageResult {
  /** reward item id awarded for clearing (e.g. pendrive_federal) */
  rewardItemId?: string;
}

export class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.RESULTS });
  }

  create(data: ResultsData): void {
    const cx = GAME_WIDTH / 2;
    this.cameras.main.setBackgroundColor('#0a0a12');
    this.cameras.main.fadeIn(500, 0, 0, 0);

    const stage = stageById(data.stageId);
    const rank = computeRank(data);

    // Persist campaign progress: mark this stage cleared and unlock the next.
    const recorded = recordStageResult(data.stageId, data.score, rank, data.maxCombo ?? 0);
    // Then evaluate & pay out any newly-unlocked achievements (§32/§16).
    const { progress, unlocked } = grantAchievements(recorded);
    if (unlocked.ids.length > 0) saveProgress(progress);
    const nextStage = stage?.nextStageId ? stageById(stage.nextStageId) : undefined;
    const nextUnlocked = nextStage ? isStageUnlocked(nextStage, progress.cleared) : false;
    const isRecordCombo = (data.maxCombo ?? 0) >= progress.bestCombo && (data.maxCombo ?? 0) > 0;

    this.add
      .text(cx, 90, 'ESCENARIO DESPEJADO', {
        fontFamily: 'monospace', fontSize: '30px', color: '#e8c046',
        stroke: '#000000', strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#e8c046', 14, false, true);

    this.add
      .text(cx, 130, stage ? stage.displayName.toUpperCase() : data.stageId, {
        fontFamily: 'monospace', fontSize: '15px', color: '#cc4444',
      })
      .setOrigin(0.5);

    // Pendrive reward.
    if (data.rewardItemId && this.textures.exists(itemKey(data.rewardItemId))) {
      this.add.image(cx, 250, itemKey(data.rewardItemId)).setScale(0.5).setOrigin(0.5);
      this.add
        .text(cx, 335, 'PENDRIVE FEDERAL RECUPERADO', {
          fontFamily: 'monospace', fontSize: '13px', color: '#44ff88',
        })
        .setOrigin(0.5);
    }

    // Stats.
    const stats = [
      `PUNTAJE   ${String(data.score).padStart(7, '0')}`,
      `AGUANTE   ${Math.round(data.hpFraction * 100)}%`,
      `TIEMPO    ${this.fmtTime(data.timeSeconds)}`,
      `COMBO MÁX ${data.maxCombo ?? 0} HITS${isRecordCombo ? '  ¡RÉCORD!' : ''}`,
      `SIN CAER  ${data.noDeaths ? 'SÍ' : 'NO'}`,
    ];
    this.add
      .text(cx, 410, stats.join('\n'), {
        fontFamily: 'monospace', fontSize: '15px', color: '#cccccc',
        align: 'center', lineSpacing: 8,
      })
      .setOrigin(0.5);

    // Rank.
    this.add
      .text(cx, 545, 'RANGO', { fontFamily: 'monospace', fontSize: '14px', color: '#888888' })
      .setOrigin(0.5);
    this.add
      .text(cx, 590, rank, {
        fontFamily: 'monospace', fontSize: '64px', color: RANK_COLORS[rank],
        stroke: '#000000', strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, RANK_COLORS[rank], 20, false, true);

    // Newly-unlocked achievements (top-right), if any.
    if (unlocked.ids.length > 0) {
      this.add
        .text(GAME_WIDTH - 40, 150, '¡LOGROS DESBLOQUEADOS!', {
          fontFamily: 'monospace', fontSize: '13px', color: '#ffdd44',
        })
        .setOrigin(1, 0);
      unlocked.ids.slice(0, 4).forEach((id, i) => {
        const a = ACHIEVEMENT_BY_ID[id];
        if (!a) return;
        this.add
          .text(GAME_WIDTH - 40, 178 + i * 26, `${a.name}  +$${a.reward}`, {
            fontFamily: 'monospace', fontSize: '12px', color: '#44ff88',
          })
          .setOrigin(1, 0);
      });
    }

    // Final stage: the campaign is over — route to the ending.
    const isFinal = stage !== undefined && stage.nextStageId === null;
    if (isFinal) {
      this.add
        .text(cx, GAME_HEIGHT - 72, '¡LA ROSCA CAYÓ! CAMPAÑA COMPLETADA', {
          fontFamily: 'monospace', fontSize: '13px', color: '#e8c046',
        })
        .setOrigin(0.5);
    }

    // Next-stage unlock banner.
    if (nextStage && nextUnlocked) {
      const msg = nextStage.runtimeReady
        ? `NUEVA ZONA: ${nextStage.displayName.toUpperCase()}`
        : `PRÓXIMA ZONA: ${nextStage.displayName.toUpperCase()} (PRÓXIMAMENTE)`;
      this.add
        .text(cx, GAME_HEIGHT - 72, msg, {
          fontFamily: 'monospace', fontSize: '12px', color: '#44ff88',
        })
        .setOrigin(0.5);
    }

    const prompt = this.add
      .text(cx, GAME_HEIGHT - 40, 'ENTER para continuar', {
        fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    const goNext = (): void => {
      const dest = isFinal ? SCENE_KEYS.ENDING : SCENE_KEYS.STAGE_SELECT;
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(dest));
    };
    this.input.keyboard?.once('keydown-ENTER', goNext);
    this.input.keyboard?.once('keydown-SPACE', goNext);
  }

  private fmtTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
