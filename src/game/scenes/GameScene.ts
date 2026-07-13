import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config/GameConfig';
import {
  Vec3,
  Bounds2D,
  GRAVITY,
  GROUND_Z,
  FIXED_TIMESTEP,
  MAX_DELTA,
  worldToScreen,
  applyFriction,
  clampToBounds,
  isOnGround,
} from '../core/Physics25D';

const WALK_SPEED_X = 280;
const WALK_SPEED_Y = 210;
const RUN_SPEED_X = 390;
const JUMP_VELOCITY_Z = 720;
const FRICTION = 1600;

const STAGE_BOUNDS: Bounds2D = {
  minX: 80,
  maxX: 2400,
  minY: 380,
  maxY: 590,
};

const SAFE_ZONE_X_LEFT = 200;

interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  run: boolean;
  lightAttack: boolean;
  heavyAttack: boolean;
}

export class GameScene extends Phaser.Scene {
  private playerPos: Vec3 = { x: 400, y: 480, z: 0 };
  private playerVel: Vec3 = { x: 0, y: 0, z: 0 };
  private playerFacing: 1 | -1 = 1;
  private playerSprite!: Phaser.GameObjects.Graphics;
  private playerShadow!: Phaser.GameObjects.Graphics;
  private groundGraphics!: Phaser.GameObjects.Graphics;
  private debugText!: Phaser.GameObjects.Text;
  private cameraX = 0;
  private accumulator = 0;
  private isDebugVisible = false;
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    wKey: Phaser.Input.Keyboard.Key;
    aKey: Phaser.Input.Keyboard.Key;
    sKey: Phaser.Input.Keyboard.Key;
    dKey: Phaser.Input.Keyboard.Key;
    jump: Phaser.Input.Keyboard.Key;
    run: Phaser.Input.Keyboard.Key;
    lightAttack: Phaser.Input.Keyboard.Key;
    heavyAttack: Phaser.Input.Keyboard.Key;
    special: Phaser.Input.Keyboard.Key;
    f1: Phaser.Input.Keyboard.Key;
    escape: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a18');
    this.createGround();
    this.createPlayerSprite();
    this.createHUD();
    this.createDebugUI();
    this.setupKeys();
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const noticeText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.15, '[ NIVEL 1 — ONCE: LA NOCHE DE LOS TRAPITOS ]', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e8c046',
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: noticeText,
        alpha: 0,
        duration: 800,
        onComplete: () => noticeText.destroy(),
      });
    });
  }

  private createGround(): void {
    this.groundGraphics = this.add.graphics();
    this.drawGround();
  }

  private drawGround(): void {
    const g = this.groundGraphics;
    g.clear();

    const stageWidth = 2800;
    const laneMinY = STAGE_BOUNDS.minY;
    const laneMaxY = STAGE_BOUNDS.maxY;

    g.fillStyle(0x111122, 1);
    g.fillRect(0, 0, stageWidth, laneMinY);

    g.fillStyle(0x1a1a2e, 1);
    g.fillRect(0, laneMinY, stageWidth, laneMaxY - laneMinY);

    for (let wx = 0; wx < stageWidth; wx += 80) {
      const alpha = 0.08 + 0.04 * Math.sin(wx * 0.01);
      g.lineStyle(1, 0x4444aa, alpha);
      g.lineBetween(wx, laneMinY, wx, laneMaxY);
    }

    for (let wy = laneMinY; wy <= laneMaxY; wy += 30) {
      const perspectiveRatio = (wy - laneMinY) / (laneMaxY - laneMinY);
      const alpha = 0.06 + 0.06 * perspectiveRatio;
      g.lineStyle(1, 0x4444aa, alpha);
      g.lineBetween(0, wy, stageWidth, wy);
    }

    g.lineStyle(2, 0x2a2a4a, 0.5);
    g.lineBetween(0, laneMinY, stageWidth, laneMinY);

    g.fillStyle(0x080810, 1);
    g.fillRect(0, laneMaxY, stageWidth, GAME_HEIGHT - laneMaxY);

    this.drawStreetDetails(g, stageWidth, laneMinY, laneMaxY);
  }

  private drawStreetDetails(
    g: Phaser.GameObjects.Graphics,
    stageWidth: number,
    laneMinY: number,
    laneMaxY: number,
  ): void {
    g.lineStyle(1, 0x333366, 0.4);
    for (let wx = 120; wx < stageWidth; wx += 200) {
      const py1 = laneMinY + 10;
      const py2 = laneMaxY - 10;
      g.lineBetween(wx - 10, py1, wx + 10, py2);
    }

    g.fillStyle(0x0d0d20, 1);
    g.fillRect(0, 0, stageWidth, laneMinY - 20);

    for (let wx = 60; wx < stageWidth; wx += 180) {
      g.fillStyle(0xffd080, 0.15);
      g.fillCircle(wx, laneMinY - 40, 30);
      g.fillStyle(0x888866, 0.6);
      g.fillRect(wx - 2, laneMinY - 80, 4, 40);
    }
  }

  private createPlayerSprite(): void {
    this.playerShadow = this.add.graphics();
    this.playerSprite = this.add.graphics();
    this.updatePlayerSpritePosition();
  }

  private updatePlayerSpritePosition(): void {
    const { screenX, screenY } = worldToScreen(
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z,
      this.cameraX,
      0,
    );

    const { screenX: shadowX, screenY: shadowY } = worldToScreen(
      this.playerPos.x,
      this.playerPos.y,
      GROUND_Z,
      this.cameraX,
      0,
    );

    this.playerShadow.clear();
    const shadowAlpha = Math.max(0.1, 0.5 - this.playerPos.z * 0.001);
    this.playerShadow.fillStyle(0x000000, shadowAlpha);
    this.playerShadow.fillEllipse(shadowX, shadowY + 4, 44, 14);

    const depth = this.playerPos.y;
    this.playerShadow.setDepth(depth - 1);

    const facing = this.playerFacing;
    const w = 40;
    const h = 72;
    const bx = screenX - w / 2 * facing;

    this.playerSprite.clear();

    this.playerSprite.fillStyle(0x1a3d2b, 1);
    this.playerSprite.fillRect(screenX - w / 2, screenY - h, w, h);

    this.playerSprite.fillStyle(0xf4c89a, 1);
    this.playerSprite.fillCircle(screenX, screenY - h + 14, 13);

    this.playerSprite.fillStyle(0x0d2218, 1);
    this.playerSprite.fillRect(screenX - 11, screenY - h + 2, 22, 8);

    this.playerSprite.fillStyle(0xc8a060, 1);
    this.playerSprite.fillRect(screenX - w / 2 - 8, screenY - h + 22, 8, 28);
    this.playerSprite.fillRect(screenX + w / 2, screenY - h + 22, 8, 28);

    this.playerSprite.lineStyle(2, 0x2d7a50, 0.6);
    this.playerSprite.strokeRect(screenX - w / 2, screenY - h, w, h);

    this.playerSprite.setDepth(depth);

    void bx;
    void facing;
  }

  private createHUD(): void {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.7);
    g.fillRect(8, 8, 300, 90);
    g.lineStyle(1, 0xe8c046, 0.4);
    g.strokeRect(8, 8, 300, 90);
    g.setScrollFactor(0).setDepth(300);

    this.add
      .text(18, 14, 'MOSTASA', {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#e8c046',
      })
      .setScrollFactor(0)
      .setDepth(301);

    this.add
      .text(18, 30, 'AGUANTE', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#888888',
      })
      .setScrollFactor(0)
      .setDepth(301);

    const hpBg = this.add.graphics();
    hpBg.fillStyle(0x222222, 1);
    hpBg.fillRect(18, 42, 200, 10);
    hpBg.fillStyle(0x22cc44, 1);
    hpBg.fillRect(18, 42, 200, 10);
    hpBg.lineStyle(1, 0x44ff66, 0.5);
    hpBg.strokeRect(18, 42, 200, 10);
    hpBg.setScrollFactor(0).setDepth(301);

    this.add
      .text(18, 58, 'BRONCA', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#888888',
      })
      .setScrollFactor(0)
      .setDepth(301);

    const broncaBg = this.add.graphics();
    broncaBg.fillStyle(0x222222, 1);
    broncaBg.fillRect(18, 70, 200, 8);
    broncaBg.fillStyle(0xcc4422, 1);
    broncaBg.fillRect(18, 70, 0, 8);
    broncaBg.lineStyle(1, 0xff6644, 0.5);
    broncaBg.strokeRect(18, 70, 200, 8);
    broncaBg.setScrollFactor(0).setDepth(301);

    this.add
      .text(18, 84, '♦ 0  ★ 000000  ♥ 3', {
        fontFamily: 'monospace',
        fontSize: '9px',
        color: '#aaaaaa',
      })
      .setScrollFactor(0)
      .setDepth(301);
  }

  private createDebugUI(): void {
    this.debugText = this.add
      .text(8, GAME_HEIGHT - 140, '', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#00ff88',
        backgroundColor: '#000000cc',
        padding: { x: 6, y: 4 },
        lineSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(500)
      .setVisible(false);
  }

  private setupKeys(): void {
    if (!this.input.keyboard) return;

    const kb = this.input.keyboard;
    const KC = Phaser.Input.Keyboard.KeyCodes;

    this.keys = {
      left: kb.addKey(KC.LEFT),
      right: kb.addKey(KC.RIGHT),
      up: kb.addKey(KC.UP),
      down: kb.addKey(KC.DOWN),
      wKey: kb.addKey(KC.W),
      aKey: kb.addKey(KC.A),
      sKey: kb.addKey(KC.S),
      dKey: kb.addKey(KC.D),
      jump: kb.addKey(KC.SPACE),
      run: kb.addKey(KC.SHIFT),
      lightAttack: kb.addKey(KC.J),
      heavyAttack: kb.addKey(KC.K),
      special: kb.addKey(KC.L),
      f1: kb.addKey(KC.F1),
      escape: kb.addKey(KC.ESC),
    };

    this.keys.f1.on('down', () => {
      this.isDebugVisible = !this.isDebugVisible;
      this.debugText.setVisible(this.isDebugVisible);
    });

    this.keys.escape.on('down', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENE_KEYS.TITLE);
      });
    });
  }

  private gatherInput(): InputState {
    if (!this.keys) {
      return {
        left: false,
        right: false,
        up: false,
        down: false,
        jump: false,
        run: false,
        lightAttack: false,
        heavyAttack: false,
      };
    }
    const { left, right, up, down, wKey, aKey, sKey, dKey, jump, run, lightAttack, heavyAttack } =
      this.keys;

    return {
      left: left.isDown || aKey.isDown,
      right: right.isDown || dKey.isDown,
      up: up.isDown || wKey.isDown,
      down: down.isDown || sKey.isDown,
      jump: jump.isDown,
      run: run.isDown,
      lightAttack: Phaser.Input.Keyboard.JustDown(lightAttack),
      heavyAttack: Phaser.Input.Keyboard.JustDown(heavyAttack),
    };
  }

  private fixedUpdate(input: InputState): void {
    const dt = FIXED_TIMESTEP;
    const speedX = input.run ? RUN_SPEED_X : WALK_SPEED_X;
    const speedY = input.run ? 285 : WALK_SPEED_Y;

    if (input.left) {
      this.playerVel.x = -speedX;
      this.playerFacing = -1;
    } else if (input.right) {
      this.playerVel.x = speedX;
      this.playerFacing = 1;
    } else {
      this.playerVel.x = applyFriction(this.playerVel, FRICTION, dt).x;
    }

    if (input.up) {
      this.playerVel.y = -speedY;
    } else if (input.down) {
      this.playerVel.y = speedY;
    } else {
      this.playerVel.y = applyFriction(this.playerVel, FRICTION, dt).y;
    }

    if (input.jump && isOnGround(this.playerPos)) {
      this.playerVel.z = JUMP_VELOCITY_Z;
    }

    if (!isOnGround(this.playerPos) || this.playerVel.z > 0) {
      this.playerVel.z += GRAVITY * dt;
    }

    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.y += this.playerVel.y * dt;
    this.playerPos.z += this.playerVel.z * dt;

    if (this.playerPos.z <= GROUND_Z) {
      this.playerPos.z = GROUND_Z;
      if (this.playerVel.z < 0) this.playerVel.z = 0;
    }

    this.playerPos = clampToBounds(this.playerPos, STAGE_BOUNDS);
  }

  private updateCamera(): void {
    const targetX = this.playerPos.x - SAFE_ZONE_X_LEFT;
    const maxCameraX = STAGE_BOUNDS.maxX - GAME_WIDTH + 120;
    const clampedTarget = Math.max(0, Math.min(maxCameraX, targetX));
    this.cameraX += (clampedTarget - this.cameraX) * 0.08;
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta / 1000, MAX_DELTA);
    this.accumulator += dt;

    const input = this.gatherInput();

    while (this.accumulator >= FIXED_TIMESTEP) {
      this.fixedUpdate(input);
      this.accumulator -= FIXED_TIMESTEP;
    }

    this.updateCamera();
    this.updatePlayerSpritePosition();
    this.groundGraphics.setX(-this.cameraX);

    if (this.isDebugVisible) {
      this.updateDebugText();
    }
  }

  private updateDebugText(): void {
    this.debugText.setText(
      [
        `FPS: ${Math.round(this.game.loop.actualFps)}`,
        `POS  X:${Math.round(this.playerPos.x)} Y:${Math.round(this.playerPos.y)} Z:${Math.round(this.playerPos.z)}`,
        `VEL  X:${Math.round(this.playerVel.x)} Y:${Math.round(this.playerVel.y)} Z:${Math.round(this.playerVel.z)}`,
        `CAM  X:${Math.round(this.cameraX)}`,
        `FACE: ${this.playerFacing > 0 ? 'RIGHT' : 'LEFT'}`,
        `GROUND: ${isOnGround(this.playerPos) ? 'YES' : 'NO'}`,
        `F1=DEBUG  F2=HITBOX  ESC=TITLE`,
      ].join('\n'),
    );
  }

}
