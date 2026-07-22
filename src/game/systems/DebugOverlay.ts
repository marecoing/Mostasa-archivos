import Phaser from 'phaser';
import { worldToScreen, DEPTH_SCALE } from '../core/Physics25D';
import { buildPlayerPushbox } from '../core/Pushbox';
import type { AttackDef } from '../data/AttackData';
import type { CameraSystem } from './CameraSystem';
import type { PlayerStateId } from '../player/PlayerStateMachine';
import { FLOOR_OFFSET_PX, HUD_DEPTH } from '../data/VisualMetrics';

export class DebugOverlay {
  private graphics: Phaser.GameObjects.Graphics;
  private stateText: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(HUD_DEPTH + 400);
    this.stateText = scene.add
      .text(4, 4, '', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#ffff00',
        backgroundColor: '#000000bb',
        padding: { x: 4, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(HUD_DEPTH + 401)
      .setVisible(false);
    this.graphics.setVisible(false);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.graphics.setVisible(this.visible);
    this.stateText.setVisible(this.visible);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  render(
    playerX: number,
    playerY: number,
    playerZ: number,
    facing: 1 | -1,
    camera: CameraSystem,
    activeAttack: AttackDef | null,
    playerState: PlayerStateId,
    playerFrame: number,
  ): void {
    if (!this.visible) return;

    this.graphics.clear();
    const camX = camera.worldX;

    const pb = buildPlayerPushbox(playerX, playerY);
    const cameraY = -FLOOR_OFFSET_PX;
    const groundScreen = worldToScreen(playerX, playerY, 0, camX, cameraY);
    const bodyScreen = worldToScreen(playerX, playerY, playerZ, camX, cameraY);

    // Pushbox (green) — footprint at ground level
    this.graphics.lineStyle(1, 0x00ff44, 0.85);
    this.graphics.strokeRect(
      groundScreen.screenX - pb.halfW,
      groundScreen.screenY - pb.halfD * DEPTH_SCALE,
      pb.halfW * 2,
      pb.halfD * DEPTH_SCALE * 2,
    );

    // Hurtbox (blue) — approximate body volume
    this.graphics.lineStyle(1, 0x4488ff, 0.7);
    this.graphics.strokeRect(bodyScreen.screenX - 20, bodyScreen.screenY - 72, 40, 72);

    // Hitbox (red) — only during active frames
    if (activeAttack) {
      const hbWorldX = playerX + activeAttack.hitboxOffsetX * facing;
      const hbWorldY = playerY + activeAttack.hitboxOffsetY;
      const hbScreen = worldToScreen(hbWorldX, hbWorldY, playerZ, camX, cameraY);
      this.graphics.lineStyle(2, 0xff2244, 0.95);
      this.graphics.strokeRect(
        hbScreen.screenX - activeAttack.hitboxHalfW,
        hbScreen.screenY - activeAttack.hitboxHalfD * DEPTH_SCALE,
        activeAttack.hitboxHalfW * 2,
        activeAttack.hitboxHalfD * DEPTH_SCALE * 2,
      );
    }

    this.stateText.setText(`STATE: ${playerState}  F:${playerFrame}`);
  }

  destroy(): void {
    this.graphics.destroy();
    this.stateText.destroy();
  }
}
