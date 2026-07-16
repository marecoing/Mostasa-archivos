import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENE_KEYS } from '../config/GameConfig';
import {
  Vec3,
  GRAVITY,
  GROUND_Z,
  FIXED_TIMESTEP,
  MAX_DELTA,
  worldToScreen,
  applyFriction,
  isOnGround,
} from '../core/Physics25D';
import { clampEntityToLane, buildPlayerPushbox } from '../core/Pushbox';
import type { StageLane } from '../core/Pushbox';
import { CameraSystem, createDefaultCameraConfig, SHAKE_LIGHT, SHAKE_MEDIUM } from '../systems/CameraSystem';
import { InputManager } from '../systems/input/InputManager';
import { INPUT_ACTIONS } from '../systems/input/InputActions';
import { PlayerStateMachine, PLAYER_STATE } from '../player/PlayerStateMachine';
import { DebugOverlay } from '../systems/DebugOverlay';
import type { AttackDef } from '../data/AttackData';
import { EnemyEntity } from '../entities/EnemyEntity';
import { ENEMY_TYPES } from '../data/EnemyData';
import {
  checkPlayerHitsEnemies,
  checkGrabRange,
  getRadialHits,
} from '../systems/CombatSystem';
import { registerAllCharacterAnims, playState } from '../systems/CharacterAnimator';
import { gridFor } from '../data/AnimationData';

const PLAYER_SPRITE_SCALE = 0.7;
const SPRITE_ORIGIN_Y = 0.95;
const ENEMY_SCREEN_HEIGHT_K = 1.5;

const WALK_SPEED_X = 280;
const WALK_SPEED_Y = 210;
const RUN_SPEED_X = 390;
const RUN_SPEED_Y = 285;
const FRICTION = 1600;

const THROW_VEL_X = 500;
const THROW_VEL_Z = 220;
const BRONCA_PER_HIT = 18;
const BRONCA_MAX = 100;
const SPECIAL_RADIUS = 200;

const STAGE_LANE: StageLane = {
  minX: 80,
  maxX: 2400,
  minY: 380,
  maxY: 590,
};

export class GameScene extends Phaser.Scene {
  private playerPos: Vec3 = { x: 400, y: 480, z: 0 };
  private playerVel: Vec3 = { x: 0, y: 0, z: 0 };
  private playerFacing: 1 | -1 = 1;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private playerShadow!: Phaser.GameObjects.Graphics;
  private groundGraphics!: Phaser.GameObjects.Graphics;
  private debugText!: Phaser.GameObjects.Text;
  private camera!: CameraSystem;
  private input2d!: InputManager;
  private fsm!: PlayerStateMachine;
  private debugOverlay!: DebugOverlay;
  private activeAttack: AttackDef | null = null;
  private accumulator = 0;
  private isDebugVisible = false;

  private enemies: EnemyEntity[] = [];
  private enemyGraphics: Phaser.GameObjects.Graphics[] = [];
  private enemyShadows: Phaser.GameObjects.Graphics[] = [];
  private enemySprites: Phaser.GameObjects.Sprite[] = [];

  private grabbedEnemyIndex = -1;
  private hitstopFrames = 0;
  private broncaMeter = 0;
  private broncaBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a18');
    registerAllCharacterAnims(this);
    this.setupSystems();
    this.createGround();
    this.createPlayerSprite();
    this.createHUD();
    this.createDebugUI();
    this.spawnInitialWave();
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const noticeText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.15, '[ NIVEL 1 — ONCE: LA NOCHE DE LOS TRAPITOS ]', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#e8c046',
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200);

    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: noticeText,
        alpha: 0,
        duration: 800,
        onComplete: () => noticeText.destroy(),
      });
    });
  }

  private setupSystems(): void {
    this.input2d = new InputManager(this);
    this.camera = new CameraSystem(createDefaultCameraConfig(STAGE_LANE.maxX, GAME_WIDTH, GAME_HEIGHT));
    this.fsm = new PlayerStateMachine();
    this.debugOverlay = new DebugOverlay(this);
  }

  private spawnInitialWave(): void {
    const spawnPoints = [
      { x: 600, y: 480, type: 'grunt',     sprite: 'enemy_001' },
      { x: 750, y: 460, type: 'grunt',     sprite: 'enemy_002' },
      { x: 900, y: 500, type: 'speedster', sprite: 'enemy_005' },
    ];
    for (const sp of spawnPoints) {
      this.spawnEnemy(sp.x, sp.y, sp.type, sp.sprite);
    }
  }

  private spawnEnemy(x: number, y: number, type: string, spriteKey = 'enemy_001'): void {
    const stats = ENEMY_TYPES[type];
    if (!stats) return;
    const enemy = new EnemyEntity(x, y, stats, spriteKey);
    const shadow = this.add.graphics().setDepth(0);
    const sprite = this.add.sprite(0, 0, spriteKey);
    sprite.setOrigin(0.5, SPRITE_ORIGIN_Y);
    playState(sprite, spriteKey, 'idle');
    const hud = this.add.graphics().setDepth(1);
    this.enemies.push(enemy);
    this.enemyShadows.push(shadow);
    this.enemySprites.push(sprite);
    this.enemyGraphics.push(hud);
  }

  private createGround(): void {
    this.groundGraphics = this.add.graphics();
    this.drawGround();
  }

  private drawGround(): void {
    const g = this.groundGraphics;
    g.clear();

    const stageWidth = 2800;
    const laneMinY = STAGE_LANE.minY;
    const laneMaxY = STAGE_LANE.maxY;

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
    this.playerSprite = this.add.sprite(0, 0, 'mostasa');
    this.playerSprite.setOrigin(0.5, SPRITE_ORIGIN_Y);
    this.playerSprite.setScale(PLAYER_SPRITE_SCALE);
    playState(this.playerSprite, 'mostasa', 'idle');
    this.updatePlayerSpritePosition();
  }

  private updatePlayerSpritePosition(): void {
    const camX = this.camera?.worldX ?? 0;
    const { screenX, screenY } = worldToScreen(
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z,
      camX,
      0,
    );

    const { screenX: shadowX, screenY: shadowY } = worldToScreen(
      this.playerPos.x,
      this.playerPos.y,
      GROUND_Z,
      camX,
      0,
    );

    this.playerShadow.clear();
    const shadowAlpha = Math.max(0.1, 0.5 - this.playerPos.z * 0.001);
    this.playerShadow.fillStyle(0x000000, shadowAlpha);
    this.playerShadow.fillEllipse(shadowX, shadowY + 4, 48, 15);
    this.playerShadow.setDepth(this.playerPos.y - 1);

    // Drive the animation from the FSM state
    playState(this.playerSprite, 'mostasa', this.fsm.currentState);

    this.playerSprite.setPosition(screenX, screenY);
    this.playerSprite.setFlipX(this.playerFacing === -1);
    this.playerSprite.setDepth(this.playerPos.y);

    // Damage flash tint
    if (this.fsm.currentState === PLAYER_STATE.HURT) {
      this.playerSprite.setTint(0xff8888);
    } else if (this.fsm.currentState === PLAYER_STATE.SPECIAL) {
      this.playerSprite.setTint(0xffdd88);
    } else {
      this.playerSprite.clearTint();
    }
  }

  private updateEnemySprites(): void {
    const camX = this.camera?.worldX ?? 0;

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const hud = this.enemyGraphics[i];
      const shadow = this.enemyShadows[i];
      const sprite = this.enemySprites[i];
      if (!enemy || !hud || !shadow || !sprite) continue;

      if (enemy.dead) {
        hud.setVisible(false);
        shadow.setVisible(false);
        sprite.setVisible(false);
        continue;
      }

      const { screenX, screenY } = worldToScreen(enemy.pos.x, enemy.pos.y, enemy.pos.z, camX, 0);
      const { screenX: sx, screenY: sy } = worldToScreen(enemy.pos.x, enemy.pos.y, GROUND_Z, camX, 0);

      shadow.clear();
      shadow.fillStyle(0x000000, 0.35);
      shadow.fillEllipse(sx, sy + 4, enemy.halfW * 2 + 12, 13);
      shadow.setDepth(enemy.pos.y - 1);

      // Character sprite driven by enemy FSM state
      const grid = gridFor(enemy.spriteKey);
      const scale = (enemy.height * ENEMY_SCREEN_HEIGHT_K) / grid.frameHeight;
      sprite.setScale(scale);
      sprite.setPosition(screenX, screenY);
      sprite.setFlipX(enemy.facing === -1);
      sprite.setDepth(enemy.pos.y);
      playState(sprite, enemy.spriteKey, enemy.fsm.currentState);

      const state = enemy.fsm.currentState;
      if (state === 'hurt') sprite.setTint(0xff8888);
      else sprite.clearTint();

      // HP bar above the character
      const h = enemy.height * 1.4;
      const hpRatio = enemy.hp / enemy.maxHp;
      hud.clear();
      hud.fillStyle(0x000000, 0.6);
      hud.fillRect(screenX - 22, screenY - h - 12, 44, 6);
      hud.fillStyle(0x222222, 1);
      hud.fillRect(screenX - 20, screenY - h - 11, 40, 4);
      hud.fillStyle(hpRatio > 0.5 ? 0x22cc44 : hpRatio > 0.25 ? 0xccaa22 : 0xcc2222, 1);
      hud.fillRect(screenX - 20, screenY - h - 11, Math.round(40 * hpRatio), 4);
      hud.setDepth(enemy.pos.y + 1);
    }
  }

  private createHUD(): void {
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.7);
    g.fillRect(8, 8, 300, 90);
    g.lineStyle(1, 0xe8c046, 0.4);
    g.strokeRect(8, 8, 300, 90);
    g.setScrollFactor(0).setDepth(300);

    this.add
      .text(18, 14, 'MOSTASA', { fontFamily: 'monospace', fontSize: '11px', color: '#e8c046' })
      .setScrollFactor(0)
      .setDepth(301);

    this.add
      .text(18, 30, 'AGUANTE', { fontFamily: 'monospace', fontSize: '9px', color: '#888888' })
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
      .text(18, 58, 'BRONCA', { fontFamily: 'monospace', fontSize: '9px', color: '#888888' })
      .setScrollFactor(0)
      .setDepth(301);

    const broncaBg = this.add.graphics();
    broncaBg.fillStyle(0x222222, 1);
    broncaBg.fillRect(18, 70, 200, 8);
    broncaBg.lineStyle(1, 0xff6644, 0.5);
    broncaBg.strokeRect(18, 70, 200, 8);
    broncaBg.setScrollFactor(0).setDepth(301);

    this.broncaBar = this.add.graphics();
    this.broncaBar.setScrollFactor(0).setDepth(302);
    this.updateBroncaBar();

    this.add
      .text(18, 84, '♦ 0  ★ 000000  ♥ 3', { fontFamily: 'monospace', fontSize: '9px', color: '#aaaaaa' })
      .setScrollFactor(0)
      .setDepth(301);
  }

  private updateBroncaBar(): void {
    const w = Math.round(200 * (this.broncaMeter / BRONCA_MAX));
    this.broncaBar.clear();
    const full = this.broncaMeter >= BRONCA_MAX;
    this.broncaBar.fillStyle(full ? 0xff8800 : 0xcc4422, 1);
    if (w > 0) this.broncaBar.fillRect(18, 70, w, 8);
  }

  private createDebugUI(): void {
    this.debugText = this.add
      .text(8, GAME_HEIGHT - 160, '', {
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

  private fixedUpdate(): void {
    // Hitstop: freeze all simulation
    if (this.hitstopFrames > 0) {
      this.hitstopFrames--;
      return;
    }

    const snap = this.input2d.getSnapshot();
    const dt = FIXED_TIMESTEP;

    // Grab input
    if (snap[INPUT_ACTIONS.GRAB].justPressed) {
      const idx = checkGrabRange(
        this.playerPos.x,
        this.playerPos.y,
        this.playerFacing,
        this.enemies,
      );
      if (idx !== -1 && this.fsm.triggerGrab()) {
        this.enemies[idx]?.applyGrab();
        this.grabbedEnemyIndex = idx;
      }
    }

    // Special input
    if (snap[INPUT_ACTIONS.SPECIAL].justPressed && this.broncaMeter >= BRONCA_MAX) {
      if (this.fsm.triggerSpecial()) {
        this.broncaMeter = 0;
        this.updateBroncaBar();
      }
    }

    // Debug spawning
    if (snap[INPUT_ACTIONS.DEBUG_SPAWN_GRUNT].justPressed) this.spawnEnemy(this.playerPos.x + 120, this.playerPos.y, 'grunt', 'enemy_001');
    if (snap[INPUT_ACTIONS.DEBUG_SPAWN_SPEEDSTER].justPressed) this.spawnEnemy(this.playerPos.x + 120, this.playerPos.y, 'speedster', 'enemy_005');
    if (snap[INPUT_ACTIONS.DEBUG_SPAWN_TANK].justPressed) this.spawnEnemy(this.playerPos.x + 120, this.playerPos.y, 'tank', 'enemy_004');
    if (snap[INPUT_ACTIONS.DEBUG_SPAWN_ZONER].justPressed) this.spawnEnemy(this.playerPos.x + 120, this.playerPos.y, 'zoner', 'enemy_003');
    if (snap[INPUT_ACTIONS.DEBUG_SPAWN_MINIBOSS].justPressed) this.spawnEnemy(this.playerPos.x + 120, this.playerPos.y, 'miniboss', 'enemy_009');
    if (snap[INPUT_ACTIONS.DEBUG_FILL_BRONCA].justPressed) {
      this.broncaMeter = BRONCA_MAX;
      this.updateBroncaBar();
    }

    const ctx = {
      isOnGround: isOnGround(this.playerPos),
      velZ: this.playerVel.z,
    };

    const fsmResult = this.fsm.tick(snap, ctx);
    this.activeAttack = fsmResult.activeAttack;

    if (fsmResult.velZSet !== null) {
      this.playerVel.z = fsmResult.velZSet;
    }
    if (fsmResult.newFacing !== null) {
      this.playerFacing = fsmResult.newFacing;
    }

    // FSM events
    for (const ev of fsmResult.events) {
      if (ev === 'jump' || ev === 'land') {
        this.camera.triggerShake(SHAKE_LIGHT);
      } else if (ev === 'throw') {
        this.handleThrow();
      } else if (ev === 'special_radial') {
        this.handleSpecialRadial();
      } else if (ev === 'grab_attempt') {
        // grab was already registered via input — keep grabbed enemy pinned to player
      }
    }

    // Pin grabbed enemy to player
    if (this.grabbedEnemyIndex !== -1 && this.fsm.isGrabbing()) {
      const ge = this.enemies[this.grabbedEnemyIndex];
      if (ge && !ge.dead) {
        ge.pos.x = this.playerPos.x + this.playerFacing * 36;
        ge.pos.y = this.playerPos.y;
        ge.pos.z = this.playerPos.z;
      }
    }

    // Hitbox vs enemies
    if (this.activeAttack) {
      const hits = checkPlayerHitsEnemies(
        this.playerPos.x,
        this.playerPos.y,
        this.playerPos.z,
        this.playerFacing,
        this.activeAttack,
        this.enemies,
      );
      let maxHitstop = 0;
      for (const idx of hits) {
        const enemy = this.enemies[idx];
        if (!enemy) continue;
        enemy.applyHit(this.activeAttack, this.playerFacing);
        this.broncaMeter = Math.min(BRONCA_MAX, this.broncaMeter + BRONCA_PER_HIT);
        this.updateBroncaBar();
        maxHitstop = Math.max(maxHitstop, this.activeAttack.hitstopFrames);
        this.camera.triggerShake(SHAKE_LIGHT);
      }
      if (maxHitstop > 0) {
        this.hitstopFrames = maxHitstop;
      }
    } else {
      // Clear hitThisSwing when there's no active attack (between swings)
      for (const enemy of this.enemies) {
        if (enemy && !enemy.dead) enemy.hitThisSwing = false;
      }
    }

    // Handle movement
    if (this.fsm.canMove()) {
      const isRunning = snap[INPUT_ACTIONS.RUN].held;
      const speedX = isRunning ? RUN_SPEED_X : WALK_SPEED_X;
      const speedY = isRunning ? RUN_SPEED_Y : WALK_SPEED_Y;

      if (snap[INPUT_ACTIONS.MOVE_LEFT].held) {
        this.playerVel.x = -speedX;
        this.playerFacing = -1;
      } else if (snap[INPUT_ACTIONS.MOVE_RIGHT].held) {
        this.playerVel.x = speedX;
        this.playerFacing = 1;
      } else {
        this.playerVel.x = applyFriction(this.playerVel, FRICTION, dt).x;
      }

      if (snap[INPUT_ACTIONS.MOVE_UP].held) {
        this.playerVel.y = -speedY;
      } else if (snap[INPUT_ACTIONS.MOVE_DOWN].held) {
        this.playerVel.y = speedY;
      } else {
        this.playerVel.y = applyFriction(this.playerVel, FRICTION, dt).y;
      }
    } else {
      this.playerVel.x = 0;
      this.playerVel.y = 0;
    }

    // Gravity
    if (!isOnGround(this.playerPos) || this.playerVel.z > 0) {
      this.playerVel.z += GRAVITY * dt;
    }

    // Integrate
    this.playerPos.x += this.playerVel.x * dt;
    this.playerPos.y += this.playerVel.y * dt;
    this.playerPos.z += this.playerVel.z * dt;

    // Ground clamp
    if (this.playerPos.z <= GROUND_Z) {
      this.playerPos.z = GROUND_Z;
      if (this.playerVel.z < 0) this.playerVel.z = 0;
    }

    // Lane clamp
    const pb = buildPlayerPushbox(this.playerPos.x, this.playerPos.y);
    const clamped = clampEntityToLane(this.playerPos.x, this.playerPos.y, pb.halfW, pb.halfD, STAGE_LANE);
    this.playerPos.x = clamped.x;
    this.playerPos.y = clamped.y;

    // Tick enemy physics
    for (const enemy of this.enemies) {
      if (enemy) {
        enemy.tickPhysics(this.playerPos.x, this.playerPos.y, STAGE_LANE);
      }
    }
  }

  private handleThrow(): void {
    const idx = this.grabbedEnemyIndex;
    this.grabbedEnemyIndex = -1;
    const enemy = this.enemies[idx];
    if (!enemy || enemy.dead) return;
    enemy.applyThrow(THROW_VEL_X, THROW_VEL_Z, this.playerFacing);
    this.camera.triggerShake(SHAKE_MEDIUM);
  }

  private handleSpecialRadial(): void {
    const hits = getRadialHits(this.playerPos.x, this.playerPos.y, this.enemies, SPECIAL_RADIUS);
    for (const idx of hits) {
      this.enemies[idx]?.applySpecialHit();
    }
    if (hits.length > 0) this.camera.triggerShake(SHAKE_MEDIUM);
  }

  update(_time: number, delta: number): void {
    const dtSec = Math.min(delta / 1000, MAX_DELTA);

    this.input2d.update();
    const snap = this.input2d.getSnapshot();

    if (snap[INPUT_ACTIONS.DEBUG_TOGGLE].justPressed) {
      this.isDebugVisible = !this.isDebugVisible;
      this.debugText.setVisible(this.isDebugVisible);
    }

    if (snap[INPUT_ACTIONS.DEBUG_HITBOX].justPressed) {
      this.debugOverlay.toggle();
    }

    if (snap[INPUT_ACTIONS.DEBUG_KILL_ENEMIES].justPressed) {
      for (const enemy of this.enemies) {
        if (enemy && !enemy.dead) {
          enemy.dead = true;
        }
      }
    }

    if (snap[INPUT_ACTIONS.PAUSE].justPressed) {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start(SCENE_KEYS.TITLE);
      });
    }

    this.accumulator += dtSec;
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.fixedUpdate();
      this.accumulator -= FIXED_TIMESTEP;
    }

    this.camera.follow(this.playerPos.x, this.playerPos.y);
    this.camera.update(delta);

    this.updatePlayerSpritePosition();
    this.updateEnemySprites();
    this.groundGraphics.setX(-this.camera.worldX);

    this.debugOverlay.render(
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z,
      this.playerFacing,
      this.camera,
      this.activeAttack,
      this.fsm.currentState,
      this.fsm.currentFrame,
    );

    if (this.isDebugVisible) {
      this.updateDebugText();
    }
  }

  private updateDebugText(): void {
    const aliveCount = this.enemies.filter(e => e && !e.dead).length;
    this.debugText.setText(
      [
        `FPS: ${Math.round(this.game.loop.actualFps)}`,
        `STATE: ${this.fsm.currentState}  F:${this.fsm.currentFrame}`,
        `POS  X:${Math.round(this.playerPos.x)} Y:${Math.round(this.playerPos.y)} Z:${Math.round(this.playerPos.z)}`,
        `VEL  X:${Math.round(this.playerVel.x)} Y:${Math.round(this.playerVel.y)} Z:${Math.round(this.playerVel.z)}`,
        `CAM  X:${Math.round(this.camera.worldX)} LOCKED:${this.camera.isLocked}`,
        `FACE: ${this.playerFacing > 0 ? 'RIGHT' : 'LEFT'}`,
        `BRONCA: ${Math.round(this.broncaMeter)}/${BRONCA_MAX}`,
        `ENEMIES: ${aliveCount}/${this.enemies.length}`,
        `GRABBED: ${this.grabbedEnemyIndex}`,
        `HITSTOP: ${this.hitstopFrames}`,
        `F1=DEBUG  F2=HITBOX  ESC=TITLE`,
      ].join('\n'),
    );
  }
}
