import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config/GameConfig';
import { loadProgress } from '../data/CampaignProgress';
import { STAGES } from '../data/StageManifest';
import { itemKey } from '../systems/AssetLoader';

/**
 * Campaign epilogue after Casa Rosada Final (Biblia §5 tono satírico; toda la
 * historia es ficción — ningún personaje refiere a personas reales). Scrolls
 * the outro, shows campaign totals, then returns to the title.
 */
export class EndingScene extends Phaser.Scene {
  private leaving = false;

  constructor() {
    super({ key: SCENE_KEYS.ENDING });
  }

  create(): void {
    this.leaving = false;
    this.cameras.main.setBackgroundColor('#050508');
    this.cameras.main.fadeIn(700, 0, 0, 0);
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 80, 'LA ROSCA CAYÓ', {
        fontFamily: 'monospace', fontSize: '44px', color: '#e8c046',
        stroke: '#000000', strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#e8c046', 18, false, true);

    const story = [
      'El pendrive federal llegó a todos los canales a la vez.',
      'Nadie pudo taparlo, ni comprarlo, ni "perderlo" en un cajón.',
      '',
      'La ciudad no se arregló de un día para el otro.',
      'Pero esa noche, por primera vez en años,',
      'los trapitos de la Rosca no cobraron peaje en ninguna esquina.',
      '',
      'Mostasa volvió a su barrio, colgó la campera,',
      'y se preparó el mate más merecido de su vida.',
      '',
      'La bronca, bien usada, también construye.',
    ].join('\n');

    this.add
      .text(cx, 330, story, {
        fontFamily: 'monospace', fontSize: '15px', color: '#cccccc',
        align: 'center', lineSpacing: 8,
      })
      .setOrigin(0.5);

    // Campaign totals from persisted progress.
    const p = loadProgress();
    const totalScore = Object.values(p.bestScore).reduce((a, b) => a + b, 0);
    const clearedCount = STAGES.filter((s) => p.cleared.includes(s.id)).length;
    this.add
      .text(cx, 500, `ZONAS LIBERADAS  ${clearedCount}/${STAGES.length}      PUNTAJE TOTAL  ${totalScore}`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#44ff88',
      })
      .setOrigin(0.5);

    if (this.textures.exists(itemKey('pendrive_federal'))) {
      this.add.image(cx, 155, itemKey('pendrive_federal')).setScale(0.26).setOrigin(0.5);
    }

    this.add
      .text(cx, 560, 'MOSTASA VOLVERÁ', {
        fontFamily: 'monospace', fontSize: '12px', color: '#cc4444', letterSpacing: 4,
      })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, GAME_HEIGHT - 40, 'ENTER para volver al título', {
        fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa',
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    const goTitle = (): void => {
      if (this.leaving) return;
      this.leaving = true;
      this.cameras.main.fadeOut(600, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE_KEYS.TITLE));
    };
    this.input.keyboard?.once('keydown-ENTER', goTitle);
    this.input.keyboard?.once('keydown-SPACE', goTitle);
  }
}
