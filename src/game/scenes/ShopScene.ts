import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config/GameConfig';
import { loadProgress, saveProgress } from '../data/CampaignProgress';
import type { CampaignProgress } from '../data/CampaignProgress';
import { SHOP_ITEMS, nextCost, canBuy, buyUpgrade, upgradeLevel } from '../data/ShopManifest';

/**
 * El Kiosco de Doña Bronca (Biblia §16): spend run earnings ("guita") on
 * permanent upgrades. Strictly in-game currency — no real-money paths (§35).
 */
export class ShopScene extends Phaser.Scene {
  private progress: CampaignProgress = loadProgress();
  private selected = 0;
  private walletText!: Phaser.GameObjects.Text;
  private rowTexts: Phaser.GameObjects.Text[] = [];
  private descText!: Phaser.GameObjects.Text;
  private feedbackText!: Phaser.GameObjects.Text;
  private leaving = false;

  constructor() {
    super({ key: SCENE_KEYS.SHOP });
  }

  create(): void {
    this.progress = loadProgress();
    this.selected = 0;
    this.rowTexts = [];
    this.leaving = false;

    this.cameras.main.setBackgroundColor('#0b0810');
    this.cameras.main.fadeIn(400, 0, 0, 0);
    const cx = GAME_WIDTH / 2;

    this.add
      .text(cx, 60, 'EL KIOSCO DE DOÑA BRONCA', {
        fontFamily: 'monospace', fontSize: '28px', color: '#e8c046',
        stroke: '#000000', strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#e8c046', 12, false, true);

    this.add
      .text(cx, 96, '"Todo lo que la Rosca te sacó, acá se recupera."', {
        fontFamily: 'monospace', fontSize: '12px', color: '#888888', fontStyle: 'italic',
      })
      .setOrigin(0.5);

    this.walletText = this.add
      .text(cx, 140, '', { fontFamily: 'monospace', fontSize: '16px', color: '#44ff88' })
      .setOrigin(0.5);

    this.add
      .rectangle(cx, 330, 640, 300, 0x141020, 0.95)
      .setStrokeStyle(2, 0x443355);

    SHOP_ITEMS.forEach((_, i) => {
      const t = this.add
        .text(cx, 230 + i * 56, '', { fontFamily: 'monospace', fontSize: '15px', color: '#cccccc' })
        .setOrigin(0.5);
      this.rowTexts.push(t);
    });

    this.descText = this.add
      .text(cx, 520, '', { fontFamily: 'monospace', fontSize: '13px', color: '#aaaaaa' })
      .setOrigin(0.5);

    this.feedbackText = this.add
      .text(cx, 560, '', { fontFamily: 'monospace', fontSize: '13px', color: '#44ff88' })
      .setOrigin(0.5);

    this.add
      .text(cx, GAME_HEIGHT - 28, '↑↓ ELEGIR    ENTER COMPRAR    ESC VOLVER', {
        fontFamily: 'monospace', fontSize: '11px', color: '#555555',
      })
      .setOrigin(0.5);

    const kb = this.input.keyboard;
    kb?.on('keydown-UP', () => this.move(-1));
    kb?.on('keydown-DOWN', () => this.move(1));
    kb?.on('keydown-ENTER', () => this.buy());
    kb?.on('keydown-SPACE', () => this.buy());
    kb?.on('keydown-ESC', () => this.goBack());

    this.refresh();
  }

  private move(delta: number): void {
    const n = SHOP_ITEMS.length;
    this.selected = (this.selected + delta + n) % n;
    this.feedbackText.setText('');
    this.refresh();
  }

  private buy(): void {
    const item = SHOP_ITEMS[this.selected];
    if (!item) return;
    const next = buyUpgrade(this.progress, item.id);
    if (!next) {
      const maxed = nextCost(this.progress, item.id) === null;
      this.feedbackText
        .setText(maxed ? 'YA ESTÁ AL MÁXIMO' : 'NO TE ALCANZA LA GUITA — VOLVÉ A PELEAR')
        .setColor('#cc6644');
      return;
    }
    this.progress = next;
    saveProgress(next);
    this.feedbackText.setText(`¡COMPRADO! ${item.displayName.toUpperCase()}`).setColor('#44ff88');
    this.refresh();
  }

  private refresh(): void {
    this.walletText.setText(`GUITA  $ ${this.progress.wallet}`);
    SHOP_ITEMS.forEach((item, i) => {
      const t = this.rowTexts[i];
      if (!t) return;
      const level = upgradeLevel(this.progress, item.id);
      const cost = nextCost(this.progress, item.id);
      const pips = '●'.repeat(level) + '○'.repeat(item.maxLevel - level);
      const price = cost === null ? 'MAX' : `$ ${cost}`;
      const label = `${item.displayName.padEnd(18)} ${pips}  ${price.padStart(7)}`;
      const affordable = canBuy(this.progress, item.id);
      t.setText(i === this.selected ? `▶ ${label}` : `  ${label}`);
      t.setColor(i === this.selected ? '#ffffff' : cost === null ? '#e8c046' : affordable ? '#bbbbbb' : '#666666');
    });
    const item = SHOP_ITEMS[this.selected];
    if (item) this.descText.setText(item.description);
  }

  private goBack(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE_KEYS.STAGE_SELECT));
  }
}
