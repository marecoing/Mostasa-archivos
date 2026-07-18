import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config/GameConfig';
import { loadProgress } from '../data/CampaignProgress';
import { computeStats } from '../data/CampaignStats';
import { STAGES } from '../data/StageManifest';
import { RANK_COLORS } from '../data/RankSystem';
import { ACHIEVEMENTS } from '../data/AchievementManifest';

/**
 * La Libreta de Mostasa — campaign records screen (Biblia §32). Read-only
 * summary of persisted progress: clears, ranks, best score/combo, guita.
 */
export class StatsScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super({ key: SCENE_KEYS.STATS });
  }

  create(): void {
    this.leaving = false;
    const p = loadProgress();
    const st = computeStats(p);
    this.cameras.main.setBackgroundColor('#08070d');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 52, 'LA LIBRETA DE MOSTASA', {
        fontFamily: 'monospace', fontSize: '28px', color: '#e8c046',
        stroke: '#000000', strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#e8c046', 12, false, true);

    // Summary block.
    const topRank = st.topRank ?? '—';
    const summary = [
      `ZONAS DESPEJADAS   ${st.stagesCleared} / ${st.stagesTotal}`,
      `RANGOS S / ROSCA   ${st.sRankCount}`,
      `MEJOR RANGO        ${topRank}`,
      `COMBO RÉCORD       ${st.bestCombo} HITS`,
      `PUNTAJE TOTAL      ${st.totalBestScore}`,
      `GUITA              $ ${st.wallet}`,
    ];
    this.add
      .text(cx, 150, summary.join('\n'), {
        fontFamily: 'monospace', fontSize: '16px', color: '#cccccc',
        align: 'left', lineSpacing: 10,
      })
      .setOrigin(0.5, 0);

    if (st.campaignComplete) {
      this.add
        .text(cx, 300, '★ CAMPAÑA COMPLETADA — LA ROSCA CAYÓ ★', {
          fontFamily: 'monospace', fontSize: '13px', color: '#44ff88',
        })
        .setOrigin(0.5);
    }

    // Per-stage rank strip.
    this.add
      .text(cx, 340, 'RANGOS POR ZONA', { fontFamily: 'monospace', fontSize: '12px', color: '#888888' })
      .setOrigin(0.5);

    const cols = 5;
    const cellW = 210;
    const gridW = cols * cellW;
    const startX = (GAME_WIDTH - gridW) / 2 + cellW / 2;
    STAGES.forEach((stage, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const y = 380 + row * 70;
      const rank = p.bestRank[stage.id];
      const cleared = p.cleared.includes(stage.id);
      this.add
        .text(x, y, `${String(stage.index).padStart(2, '0')} ${stage.displayName}`, {
          fontFamily: 'monospace', fontSize: '10px',
          color: cleared ? '#bbbbbb' : '#555555', align: 'center',
          wordWrap: { width: cellW - 20 },
        })
        .setOrigin(0.5, 0);
      this.add
        .text(x, y + 26, rank ?? '—', {
          fontFamily: 'monospace', fontSize: '20px',
          color: rank ? RANK_COLORS[rank] : '#444444', fontStyle: 'bold',
        })
        .setOrigin(0.5, 0);
    });

    // Achievements strip (Logros de la Rosca).
    this.add
      .text(cx, 520, 'LOGROS DE LA ROSCA', { fontFamily: 'monospace', fontSize: '12px', color: '#888888' })
      .setOrigin(0.5);
    const achCols = 2;
    ACHIEVEMENTS.forEach((a, i) => {
      const col = i % achCols;
      const row = Math.floor(i / achCols);
      const x = col === 0 ? 250 : 690;
      const y = 548 + row * 26;
      const done = p.achievements.includes(a.id);
      this.add
        .text(x, y, `${done ? '✓' : '○'} ${a.name}`, {
          fontFamily: 'monospace', fontSize: '12px',
          color: done ? '#44ff88' : '#666666',
        })
        .setOrigin(0, 0.5);
      this.add
        .text(x + 300, y, done ? 'HECHO' : `$${a.reward}`, {
          fontFamily: 'monospace', fontSize: '11px',
          color: done ? '#44ff88' : '#8a7a3a',
        })
        .setOrigin(0, 0.5);
    });

    const prompt = this.add
      .text(cx, GAME_HEIGHT - 22, 'ESC / ENTER para volver', {
        fontFamily: 'monospace', fontSize: '12px', color: '#888888',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 });

    const back = (): void => this.goBack();
    this.input.keyboard?.once('keydown-ESC', back);
    this.input.keyboard?.once('keydown-ENTER', back);
    this.input.keyboard?.once('keydown-SPACE', back);
  }

  private goBack(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE_KEYS.TITLE));
  }
}
