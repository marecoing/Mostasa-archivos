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
  checkPlayerHitsBreakables,
} from '../systems/CombatSystem';
import { registerAllCharacterAnims, playState } from '../systems/CharacterAnimator';
import { gridFor } from '../data/AnimationData';
import { StageBackground } from '../systems/StageBackground';
import { PropSystem } from '../systems/PropSystem';
import { VfxSystem } from '../systems/VfxSystem';
import { breakableKey, itemKey } from '../systems/AssetLoader';
import { stageById } from '../data/StageManifest';
import { BREAKABLES } from '../data/BreakableManifest';
import { rollDrop } from '../data/BreakableManifest';
import { DROPPABLES, WEAPONS } from '../data/ItemManifest';
import { BreakableEntity } from '../entities/BreakableEntity';
import { PickupEntity } from '../entities/PickupEntity';
import { WeaponEntity, effectiveHitDamage } from '../entities/WeaponEntity';
import type { EquippedWeapon } from '../entities/WeaponEntity';
import { WaveSystem } from '../systems/WaveSystem';
import { encountersForStage } from '../data/WaveManifest';
import { layoutForStage } from '../data/StageLayout';
import { AudioSystem } from '../systems/audio/AudioSystem';
import { variantForStage } from '../systems/audio/SoundBank';
import { loadStagePanels, stagePanelKey } from '../systems/StageBackground';

const PLAYER_SPRITE_SCALE = 0.9;
const SPRITE_ORIGIN_Y = 0.95;
const ENEMY_SCREEN_HEIGHT_K = 1.9;
/**
 * Vertical render offset (screen px) that drops the 2.5D character lane down
 * onto the painted floor of the stage backdrop. Applied via worldToScreen's
 * cameraY on render calls only — physics/logic are unaffected.
 */
const FLOOR_OFFSET = 168;

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

  private stageBg?: StageBackground;
  private props?: PropSystem;
  private vfx!: VfxSystem;
  private audio!: AudioSystem;
  private stageId = '01-once';
  private breakables: BreakableEntity[] = [];
  private breakableSprites: Phaser.GameObjects.Sprite[] = [];
  private pickups: PickupEntity[] = [];
  private pickupSprites: Phaser.GameObjects.Sprite[] = [];
  private weapons: WeaponEntity[] = [];
  private weaponSprites: Phaser.GameObjects.Sprite[] = [];
  private equippedWeapon: EquippedWeapon | null = null;
  private heldWeaponSprite?: Phaser.GameObjects.Image;
  private weaponDepletedThisSwing = false;
  private weaponHudText?: Phaser.GameObjects.Text;
  private playerHp = 100;
  private readonly playerMaxHp = 100;
  private score = 0;

  private waveSystem!: WaveSystem;
  private waveGateMinX = 0;
  private objectiveText?: Phaser.GameObjects.Text;
  private stageStartMs = 0;
  private bossPhase2Done = false;
  private stageEnded = false;
  private aguanteBar!: Phaser.GameObjects.Graphics;
  private hudInfoText!: Phaser.GameObjects.Text;
  private playerIFrames = 0;
  private playerLives = 3;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  init(data: { stageId?: string }): void {
    if (data?.stageId) this.stageId = data.stageId;
  }

  /** Lazy-load this stage's panels if PreloadScene didn't stage them (§32). */
  preload(): void {
    if (!this.textures.exists(stagePanelKey(this.stageId, 1))) {
      loadStagePanels(this, this.stageId);
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0a0a18');
    registerAllCharacterAnims(this);
    this.createStageBackground();
    this.setupSystems();
    this.createGround();
    this.createPlayerSprite();
    this.createHUD();
    this.createDebugUI();
    this.spawnBreakables();
    this.spawnWeapons();
    this.createHeldWeaponSprite();
    this.createWaveSystem();
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const stageDef = stageById(this.stageId);
    const noticeLabel = stageDef
      ? `[ NIVEL ${stageDef.index} — ${stageDef.displayName.toUpperCase()} ]`
      : '[ NIVEL 1 — ONCE: LA NOCHE DE LOS TRAPITOS ]';
    const noticeText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.15, noticeLabel, {
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
    this.vfx = new VfxSystem(this);
    this.audio = new AudioSystem();
    this.setupAudioUnlock();
  }

  /**
   * Autoplay policy (Biblia §22): only start the AudioContext after a real
   * user gesture. We latch onto the first key/pointer input, unlock, and start
   * the stage music. Also tear the context down on scene shutdown.
   */
  private setupAudioUnlock(): void {
    const start = (): void => {
      this.audio.unlock();
      if (!this.stageEnded) this.audio.startMusic(variantForStage(this.stageId));
    };
    this.input.keyboard?.once('keydown', start);
    this.input.once('pointerdown', start);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.audio.destroy());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.audio.destroy());
  }

  private createStageBackground(): void {
    const stage = stageById(this.stageId);
    if (!stage) return;
    const bg = new StageBackground(this, stage);
    if (bg.isReady) {
      this.stageBg = bg;
      // Extend the walkable lane to span the full painted background.
      STAGE_LANE.maxX = Math.max(STAGE_LANE.maxX, Math.round(bg.worldWidth - 200));
    }
    const props = new PropSystem(this, this.stageId);
    if (props.isReady) this.props = props;
  }

  private spawnBreakables(): void {
    // Destructibles laid along the street, per stage (Biblia §13/§14).
    for (const item of layoutForStage(this.stageId).breakables) {
      const def = BREAKABLES[item.id];
      if (!def || !this.textures.exists(breakableKey(item.id))) continue;
      const ent = new BreakableEntity(def, item.x, item.y);
      const sprite = this.add.sprite(0, 0, breakableKey(item.id), 0).setOrigin(0.5, 0.92);
      this.breakables.push(ent);
      this.breakableSprites.push(sprite);
    }
  }

  private spawnWeapons(): void {
    // Grabbable weapons laid along the street, per stage.
    for (const item of layoutForStage(this.stageId).weapons) {
      const def = WEAPONS[item.id];
      if (!def || !this.textures.exists(itemKey(item.id))) continue;
      const ent = new WeaponEntity(def, item.x, item.y);
      const sprite = this.add.sprite(0, 0, itemKey(item.id)).setOrigin(0.5, 0.9).setScale(0.3);
      this.weapons.push(ent);
      this.weaponSprites.push(sprite);
    }
  }

  private createHeldWeaponSprite(): void {
    this.heldWeaponSprite = this.add.image(0, 0, itemKey('tubo_metalico')).setVisible(false);
    this.weaponHudText = this.add
      .text(228, 84, '', { fontFamily: 'monospace', fontSize: '9px', color: '#e8c046' })
      .setScrollFactor(0)
      .setDepth(301);
    this.updateWeaponHud();
  }

  private equipWeapon(def: import('../data/ItemManifest').WeaponDef): void {
    this.equippedWeapon = { def, durabilityLeft: def.durability };
    this.audio.play('weapon_pickup');
    if (this.heldWeaponSprite) {
      this.heldWeaponSprite.setTexture(itemKey(def.id)).setVisible(true).setScale(0.32);
    }
    this.updateWeaponHud();
  }

  private breakWeapon(): void {
    this.playVfxAtWorld('polvo_caida', this.playerPos.x, this.playerPos.y, 70);
    this.audio.play('weapon_break');
    this.equippedWeapon = null;
    this.heldWeaponSprite?.setVisible(false);
    this.updateWeaponHud();
  }

  private updateWeaponHud(): void {
    if (!this.weaponHudText) return;
    if (this.equippedWeapon) {
      const w = this.equippedWeapon;
      this.weaponHudText.setText(`⚔ ${w.def.displayName}  ${w.durabilityLeft}/${w.def.durability}`);
    } else {
      this.weaponHudText.setText('⚔ Puños');
    }
  }

  private updateWeapons(dt: number): void {
    const camX = this.camera?.worldX ?? 0;
    for (let i = 0; i < this.weapons.length; i++) {
      const w = this.weapons[i];
      const sprite = this.weaponSprites[i];
      if (!w || !sprite) continue;
      if (w.taken) { sprite.setVisible(false); continue; }

      w.tick(GRAVITY, dt, GROUND_Z);

      // Walk over an unheld weapon to pick it up (swaps the current one).
      if (w.isInRange(this.playerPos.x, this.playerPos.y, 48, 60)) {
        w.taken = true;
        sprite.setVisible(false);
        this.equipWeapon(w.def);
        continue;
      }

      const { screenX, screenY } = worldToScreen(w.x, w.y, w.z, camX, -FLOOR_OFFSET);
      sprite.setPosition(screenX, screenY);
      sprite.setDepth(w.y + 5);
    }
  }

  private updateHeldWeaponSprite(screenX: number, screenY: number): void {
    if (!this.heldWeaponSprite || !this.equippedWeapon) return;
    const swinging = this.fsm.isAttacking();
    const handX = screenX + this.playerFacing * (swinging ? 34 : 20);
    const handY = screenY - 62;
    this.heldWeaponSprite
      .setPosition(handX, handY)
      .setFlipX(this.playerFacing === -1)
      .setAngle(swinging ? this.playerFacing * -35 : 0)
      .setDepth(this.playerPos.y + 1);
  }

  private createWaveSystem(): void {
    this.waveSystem = new WaveSystem(encountersForStage(this.stageId), STAGE_LANE.maxX);
    this.stageStartMs = this.time.now;
    this.objectiveText = this.add
      .text(GAME_WIDTH / 2, 40, '', {
        fontFamily: 'monospace', fontSize: '13px', color: '#ff6644',
        stroke: '#000000', strokeThickness: 3, align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(320)
      .setVisible(false);
  }

  /** Advance the encounter state and apply its actions. */
  private updateWaves(): void {
    const alive = this.enemies.reduce((n, e) => n + (e && !e.dead ? 1 : 0), 0);
    const actions = this.waveSystem.update(this.playerPos.x, alive);

    for (const s of actions.spawns) {
      this.spawnEnemy(s.x, s.y, s.type, s.spriteKey);
    }

    if (actions.lockCamera) {
      const center = (actions.lockCamera.minX + actions.lockCamera.maxX) / 2;
      const camPos = Math.max(0, Math.min(STAGE_LANE.maxX - GAME_WIDTH, center - GAME_WIDTH / 2));
      this.camera.lock(camPos, camPos);
    }
    if (actions.unlockCamera) {
      this.camera.unlock();
    }
    if (actions.zoneCleared) {
      this.score += 200;
      this.audio.play('zone_clear');
    }

    // Movement gate: confine the player to the active arena while fighting.
    const zone = this.waveSystem.activeZone;
    this.waveGateMinX = zone ? zone.lockMinX : STAGE_LANE.minX;

    this.updateBossPhase(zone?.kind === 'boss');

    if (actions.stageCleared && !this.stageEnded) {
      this.finishStage();
      return;
    }

    // Objective banner.
    if (this.objectiveText) {
      if (this.waveSystem.currentPhase === 'fighting') {
        const enc = encountersForStage(this.stageId);
        const label = zone?.kind === 'boss' ? enc.bossLabel : zone?.kind === 'mini_boss' ? enc.miniBossLabel : '¡LIMPIÁ LA ZONA!';
        this.objectiveText.setText(`${label}  ENEMIGOS: ${alive}`).setVisible(true);
      } else {
        this.objectiveText.setVisible(false);
      }
    }
  }

  /** El Capataz: al 50% de HP entra en Fase 2 y convoca dos refuerzos. */
  private updateBossPhase(inBossZone: boolean): void {
    if (!inBossZone || this.bossPhase2Done) return;
    const boss = this.enemies.find((e) => e && !e.dead && e.type === 'boss');
    if (!boss) return;
    if (boss.hp <= boss.maxHp * 0.5) {
      this.bossPhase2Done = true;
      boss.enrage();
      this.camera.triggerShake(SHAKE_MEDIUM);
      this.playVfxAtWorld('bronca_especial', boss.pos.x, boss.pos.y, 80, 1.4);
      this.audio.play('special');
      this.objectiveText?.setText('¡EL JEFE SE ENFURECE!').setVisible(true);
      this.spawnEnemy(boss.pos.x + 140, 470, 'grunt', 'enemy_006');
      this.spawnEnemy(boss.pos.x - 140, 540, 'grunt', 'enemy_007');
    }
  }

  private finishStage(): void {
    this.stageEnded = true;
    this.score += 500; // pendrive federal
    this.audio.play('zone_clear');
    this.audio.stopMusic();
    this.objectiveText?.setVisible(false);
    const hpFraction = Math.max(0, this.playerHp / this.playerMaxHp);
    const timeSeconds = (this.time.now - this.stageStartMs) / 1000;
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_KEYS.RESULTS, {
        stageId: this.stageId,
        score: this.score,
        hpFraction,
        noDeaths: this.playerLives === 3,
        timeSeconds,
        ...(this.stageId === '01-once' ? { rewardItemId: 'pendrive_federal' } : {}),
      });
    });
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
    // The painted stage backdrop replaces the procedural grid when present.
    if (this.stageBg) {
      this.groundGraphics.setVisible(false);
    }
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
      -FLOOR_OFFSET,
    );

    const { screenX: shadowX, screenY: shadowY } = worldToScreen(
      this.playerPos.x,
      this.playerPos.y,
      GROUND_Z,
      camX,
      -FLOOR_OFFSET,
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

    // Blink during invulnerability frames.
    const blink = this.playerIFrames > 0 && Math.floor(this.playerIFrames / 4) % 2 === 0;
    this.playerSprite.setAlpha(blink ? 0.4 : 1);

    this.updateHeldWeaponSprite(screenX, screenY);
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

      const { screenX, screenY } = worldToScreen(enemy.pos.x, enemy.pos.y, enemy.pos.z, camX, -FLOOR_OFFSET);
      const { screenX: sx, screenY: sy } = worldToScreen(enemy.pos.x, enemy.pos.y, GROUND_Z, camX, -FLOOR_OFFSET);

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
    hpBg.lineStyle(1, 0x44ff66, 0.5);
    hpBg.strokeRect(18, 42, 200, 10);
    hpBg.setScrollFactor(0).setDepth(301);

    this.aguanteBar = this.add.graphics().setScrollFactor(0).setDepth(302);
    this.updateAguanteBar();

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

    this.hudInfoText = this.add
      .text(18, 84, '', { fontFamily: 'monospace', fontSize: '9px', color: '#aaaaaa' })
      .setScrollFactor(0)
      .setDepth(301);
    this.updateHudInfo();
  }

  private updateAguanteBar(): void {
    const ratio = Math.max(0, this.playerHp / this.playerMaxHp);
    const w = Math.round(200 * ratio);
    this.aguanteBar.clear();
    const col = ratio > 0.5 ? 0x22cc44 : ratio > 0.25 ? 0xccaa22 : 0xcc2222;
    this.aguanteBar.fillStyle(col, 1);
    if (w > 0) this.aguanteBar.fillRect(18, 42, w, 10);
  }

  private updateHudInfo(): void {
    const hearts = '♥'.repeat(Math.max(0, this.playerLives));
    this.hudInfoText.setText(`★ ${String(this.score).padStart(6, '0')}   ${hearts}`);
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

    if (this.playerIFrames > 0) this.playerIFrames--;

    // Encounter progression (spawns, camera lock, movement gate).
    this.updateWaves();

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
        if (ev === 'jump') this.audio.play('jump');
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
      // A held weapon adds its damage; use a modified attack for this swing.
      const atk = this.equippedWeapon
        ? { ...this.activeAttack, damage: effectiveHitDamage(this.activeAttack.damage, this.equippedWeapon) }
        : this.activeAttack;

      let maxHitstop = 0;
      let connected = false;
      const heavy = atk.damage >= 18 || this.equippedWeapon !== null;
      for (const idx of hits) {
        const enemy = this.enemies[idx];
        if (!enemy) continue;
        enemy.applyHit(atk, this.playerFacing);
        connected = true;
        this.broncaMeter = Math.min(BRONCA_MAX, this.broncaMeter + BRONCA_PER_HIT);
        this.updateBroncaBar();
        maxHitstop = Math.max(maxHitstop, atk.hitstopFrames);
        this.camera.triggerShake(SHAKE_LIGHT);
        this.playVfxAtWorld(heavy ? 'impacto_pesado' : 'impacto_puno', enemy.pos.x, enemy.pos.y, enemy.pos.z + 40);
        this.audio.play(heavy ? 'heavy_hit' : 'punch');
        this.audio.play('enemy_hurt');
      }
      if (maxHitstop > 0) {
        this.hitstopFrames = maxHitstop;
      }

      // Hitbox vs breakables
      const bHits = checkPlayerHitsBreakables(
        this.playerPos.x, this.playerPos.y, this.playerFacing, atk, this.breakables,
      );
      for (const idx of bHits) {
        const b = this.breakables[idx];
        if (!b) continue;
        b.hitThisSwing = true;
        connected = true;
        const broke = b.applyHit(atk.damage);
        this.playVfxAtWorld('chispas_metal', b.x, b.y, 60);
        this.camera.triggerShake(SHAKE_LIGHT);
        this.audio.play(broke ? 'breakable' : 'punch');
        if (broke) this.onBreakableDestroyed(b);
      }

      // Deplete the weapon once per connecting swing.
      if (connected && this.equippedWeapon && !this.weaponDepletedThisSwing) {
        this.weaponDepletedThisSwing = true;
        this.equippedWeapon.durabilityLeft -= 1;
        if (this.equippedWeapon.durabilityLeft <= 0) this.breakWeapon();
        this.updateWeaponHud();
      }
    } else {
      // Clear per-swing guards when there's no active attack (between swings)
      for (const enemy of this.enemies) {
        if (enemy && !enemy.dead) enemy.hitThisSwing = false;
      }
      for (const b of this.breakables) if (!b.destroyed) b.hitThisSwing = false;
      this.weaponDepletedThisSwing = false;
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
    } else if (
      this.fsm.currentState === PLAYER_STATE.HURT ||
      this.fsm.currentState === PLAYER_STATE.DOWN
    ) {
      // Keep knockback momentum while stunned; let it decay.
      this.playerVel.x = applyFriction(this.playerVel, FRICTION * 0.5, dt).x;
      this.playerVel.y = applyFriction(this.playerVel, FRICTION * 0.5, dt).y;
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

    // Encounter movement gate: can't leave an active arena until it clears.
    this.playerPos.x = Math.max(this.waveGateMinX, Math.min(this.playerPos.x, this.waveSystem.gateX));

    // Tick enemy physics + attacks (attack-token limited, Biblia §10).
    const MAX_ATTACKERS = 2;
    let attackingNow = this.enemies.reduce(
      (n, e) => n + (e && !e.dead && e.fsm.isAttacking() ? 1 : 0), 0);
    for (const enemy of this.enemies) {
      if (!enemy || enemy.dead) continue;
      const wasAttacking = enemy.fsm.isAttacking();
      const allow = attackingNow < MAX_ATTACKERS;
      enemy.tickPhysics(this.playerPos.x, this.playerPos.y, STAGE_LANE, allow);
      if (!wasAttacking && enemy.fsm.isAttacking()) attackingNow++;

      // Telegraph a freshly-committed boss attack with a distinct tell.
      if (enemy.attackJustStarted) {
        const isCharge = enemy.attackJustStarted === 'charge';
        this.playVfxAtWorld(isCharge ? 'bronca_especial' : 'polvo_caida', enemy.pos.x, enemy.pos.y, 70, isCharge ? 1.2 : 1);
        this.audio.play(isCharge ? 'heavy_hit' : 'ui_confirm');
        enemy.attackJustStarted = null;
      }

      const dmg = enemy.consumeAttackHit(this.playerPos.x, this.playerPos.y, this.playerPos.z);
      if (dmg > 0) {
        this.damagePlayer(dmg, enemy.facing);
        if (enemy.bossAttack === 'charge') this.camera.triggerShake(SHAKE_MEDIUM);
      }
    }
  }

  private damagePlayer(dmg: number, fromFacing: 1 | -1): void {
    if (this.stageEnded || this.playerIFrames > 0) return;
    if (this.fsm.currentState === PLAYER_STATE.DOWN) return;

    this.playerHp = Math.max(0, this.playerHp - dmg);
    this.updateAguanteBar();
    this.playerIFrames = 48;
    this.camera.triggerShake(SHAKE_MEDIUM);
    this.playVfxAtWorld('impacto_puno', this.playerPos.x, this.playerPos.y, this.playerPos.z + 40);
    this.audio.play('player_hurt');

    if (this.playerHp <= 0) {
      this.onPlayerDown();
    } else {
      this.fsm.forceHurt();
      this.playerVel.x = fromFacing * 260;
      this.playerVel.z = 130;
    }
  }

  private onPlayerDown(): void {
    this.fsm.forceDown();
    this.playerLives -= 1;
    this.updateHudInfo();
    if (this.playerLives <= 0) {
      this.gameOver();
    } else {
      // Respawn with a fresh bar and a long grace period.
      this.playerHp = this.playerMaxHp;
      this.updateAguanteBar();
      this.playerIFrames = 150;
    }
  }

  private gameOver(): void {
    if (this.stageEnded) return;
    this.stageEnded = true;
    this.audio.stopMusic();
    this.objectiveText?.setText('GAME OVER').setVisible(true);
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(SCENE_KEYS.TITLE));
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
    this.playVfxAtWorld('bronca_especial', this.playerPos.x, this.playerPos.y, 70);
    this.camera.triggerShake(SHAKE_MEDIUM);
    this.audio.play('special');
  }

  /** Play a VFX at a world position (projected to screen). */
  private playVfxAtWorld(id: string, worldX: number, worldY: number, worldZ: number, scaleMul = 1): void {
    const camX = this.camera?.worldX ?? 0;
    const { screenX, screenY } = worldToScreen(worldX, worldY, worldZ, camX, -FLOOR_OFFSET);
    this.vfx.play(id, screenX, screenY, worldY + 200, scaleMul);
  }

  private onBreakableDestroyed(b: BreakableEntity): void {
    this.playVfxAtWorld(b.def.destroyVfx, b.x, b.y, 70, 1.2);
    this.camera.triggerShake(SHAKE_MEDIUM);
    this.score += 50;
    const dropId = rollDrop(b.def, Math.random());
    if (dropId) this.spawnPickup(dropId, b.x, b.y);
  }

  private spawnPickup(itemId: string, x: number, y: number): void {
    const def = DROPPABLES[itemId];
    if (!def || !this.textures.exists(itemKey(itemId))) return;
    const ent = new PickupEntity(def, x, y);
    const sprite = this.add.sprite(0, 0, itemKey(itemId)).setOrigin(0.5, 0.9).setScale(0.28);
    this.pickups.push(ent);
    this.pickupSprites.push(sprite);
  }

  private applyPickup(def: import('../data/ItemManifest').PickupDef): void {
    this.audio.play('pickup');
    switch (def.effect) {
      case 'health':
        this.playerHp = Math.min(this.playerMaxHp, this.playerHp + def.amount);
        break;
      case 'rage':
        this.broncaMeter = Math.min(BRONCA_MAX, this.broncaMeter + def.amount);
        this.updateBroncaBar();
        break;
      case 'energy':
        this.broncaMeter = Math.min(BRONCA_MAX, this.broncaMeter + Math.round(def.amount * 0.5));
        this.updateBroncaBar();
        break;
      case 'money':
        this.score += def.amount;
        break;
      case 'collectible':
      case 'key_item':
        this.score += 500;
        break;
    }
  }

  private updateBreakableSprites(): void {
    const camX = this.camera?.worldX ?? 0;
    for (let i = 0; i < this.breakables.length; i++) {
      const b = this.breakables[i];
      const sprite = this.breakableSprites[i];
      if (!b || !sprite) continue;
      if (b.destroyed) { sprite.setVisible(false); continue; }
      const { screenX, screenY } = worldToScreen(b.x, b.y, 0, camX, -FLOOR_OFFSET);
      sprite.setFrame(b.damageFrame());
      sprite.setPosition(screenX, screenY);
      sprite.setDepth(b.y);
    }
  }

  private updatePickups(dt: number): void {
    const camX = this.camera?.worldX ?? 0;
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      const sprite = this.pickupSprites[i];
      if (!p || !sprite) continue;
      if (p.collected) { sprite.setVisible(false); continue; }

      p.tick(GRAVITY, dt, GROUND_Z);

      if (p.isInRange(this.playerPos.x, this.playerPos.y, 46, 60)) {
        p.collected = true;
        sprite.setVisible(false);
        this.applyPickup(p.def);
        continue;
      }

      const { screenX, screenY } = worldToScreen(p.x, p.y, p.z, camX, -FLOOR_OFFSET);
      sprite.setPosition(screenX, screenY);
      sprite.setDepth(p.y + 5);
    }
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

    this.stageBg?.update(this.camera.worldX);
    this.props?.update(this.camera.worldX);
    this.updatePlayerSpritePosition();
    this.updateEnemySprites();
    this.updateBreakableSprites();
    this.updatePickups(FIXED_TIMESTEP);
    this.updateWeapons(FIXED_TIMESTEP);
    this.updateHudInfo();
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
