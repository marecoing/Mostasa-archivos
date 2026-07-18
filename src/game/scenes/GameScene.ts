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
import type { InputSnapshot } from '../systems/input/InputActions';
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
import { ComboSystem } from '../systems/ComboSystem';
import { bossBarView, bossBarColor } from '../systems/BossBar';
import { impactScale, crossedComboBand, usesHeavyShake } from '../systems/ComboFeedback';
import { damageStyle } from '../systems/DamageNumbers';
import { progressFraction, zoneMarkers, zoneMarkerColor } from '../systems/StageProgress';
import { showGuidance } from '../systems/GuidanceArrow';
import { zoneClearReward, ZONE_PERFECT_BONUS } from '../systems/ZoneBonus';
import {
  eliteEveryN, isEliteSpawn,
  ELITE_HP_MULT, ELITE_DAMAGE_MULT, ELITE_SCALE, ELITE_KILL_BONUS,
} from '../systems/EliteSystem';
import { enemyTint } from '../systems/EnemyPalette';
import { encountersForStage } from '../data/WaveManifest';
import { layoutForStage } from '../data/StageLayout';
import { AudioSystem } from '../systems/audio/AudioSystem';
import { variantForStage } from '../systems/audio/SoundBank';
import { loadAudioSettings, saveAudioSettings } from '../data/AudioSettings';
import { loadProgress, recordPerfectZone } from '../data/CampaignProgress';
import { effectsFor } from '../data/ShopManifest';
import { loadDifficulty } from '../data/DifficultyManifest';
import { loadStagePanels, stagePanelKey } from '../systems/StageBackground';

// Beat'em up screen presence: fighters should stand ~30% of the frame height
// (Streets-of-Rage range), not the miniature ~18% the art shipped at. The
// sheets include internal padding, so scales run higher than they look.
const PLAYER_SPRITE_SCALE = 1.45;
const SPRITE_ORIGIN_Y = 0.95;
const ENEMY_SCREEN_HEIGHT_K = 3.05;
// Character rim-light: a warm additive halo that separates sprites from the
// photoreal backdrops so they never read as "invisible".
const CHARACTER_RIM_TINT = 0xffd9a0;
const CHARACTER_RIM_ALPHA = 0.6;
const CHARACTER_RIM_SCALE = 1.08;
// The character sheets are rendered darker than the photoreal backdrops; an
// additive self-overlay lifts their exposure so they read as lit subjects.
const CHARACTER_LIFT_ALPHA = 0.26;
// Breakable art ships as 362×181 frames rendered 1:1 (a crate ~2× the hero).
// Calibrate so a destructible reads roughly waist-height beside Mostasa.
const BREAKABLE_RENDER_SCALE = 0.5;
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
/** Damage the radial special deals per enemy (matches EnemyEntity). */
const SPECIAL_DAMAGE = 30;
/** Base score per landed hit, before the combo multiplier (§12). */
const HIT_BASE_SCORE = 10;

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
  private playerOutline!: Phaser.GameObjects.Sprite;
  private playerLift!: Phaser.GameObjects.Sprite;
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
  private enemyLabels: Phaser.GameObjects.Text[] = [];
  private enemyOutlines: Phaser.GameObjects.Sprite[] = [];
  private enemyLifts: Phaser.GameObjects.Sprite[] = [];

  private grabbedEnemyIndex = -1;
  private hitstopFrames = 0;
  private broncaMeter = 0;
  private broncaBar!: Phaser.GameObjects.Graphics;
  private combo = new ComboSystem();
  private comboText!: Phaser.GameObjects.Text;
  private comboLabelText!: Phaser.GameObjects.Text;

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
  private playerMaxHp = 100;
  private score = 0;
  /** Kiosco upgrade: multiplies all player attack damage (§16). */
  private damageMultiplier = 1;
  /** Difficulty scalers (§11), resolved in applyUpgrades(). */
  private diffEnemyHp = 1;
  private diffEnemyDamage = 1;
  private diffScore = 1;
  /** elite-promotion cadence (0 = none) and running spawn counter (§10). */
  private eliteCadence = 0;
  private eliteSpawnOrdinal = 0;

  private waveSystem!: WaveSystem;
  private waveGateMinX = 0;
  private objectiveText?: Phaser.GameObjects.Text;
  private bossBarBg?: Phaser.GameObjects.Graphics;
  private bossBarFill?: Phaser.GameObjects.Graphics;
  private bossBarLabel?: Phaser.GameObjects.Text;
  private progressGfx?: Phaser.GameObjects.Graphics;
  private guidanceText?: Phaser.GameObjects.Text;
  private stageStartMs = 0;
  private bossPhase2Done = false;
  private stageEnded = false;
  private aguanteBar!: Phaser.GameObjects.Graphics;
  private hudInfoText!: Phaser.GameObjects.Text;
  private playerIFrames = 0;
  private playerLives = 3;
  private runStartLives = 3;
  private startingBronca = 0;
  /** whether the player was hit during the current combat zone (§12) */
  private tookDamageThisZone = false;
  /** consecutive perfect (no-damage) zone clears this run */
  private perfectStreak = 0;

  private paused = false;
  private pauseContainer?: Phaser.GameObjects.Container;
  private pauseRowTexts: Phaser.GameObjects.Text[] = [];
  private pauseIndex = 0;

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
    this.applyUpgrades();
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
    this.createPauseMenu();
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

  /**
   * Apply Kiosco upgrades (Biblia §16). Runs first in create() so it also
   * resets run state cleanly when the scene instance is reused (restart).
   */
  private applyUpgrades(): void {
    const diff = loadDifficulty();
    this.diffEnemyHp = diff.enemyHp;
    this.diffEnemyDamage = diff.enemyDamage;
    this.diffScore = diff.score;
    this.eliteCadence = eliteEveryN(diff.id);
    this.eliteSpawnOrdinal = 0;
    const fx = effectsFor(loadProgress());
    this.playerMaxHp = 100 + fx.maxHpBonus;
    this.playerHp = this.playerMaxHp;
    this.playerLives = 3 + fx.extraLives;
    this.runStartLives = this.playerLives;
    this.damageMultiplier = fx.damageMultiplier;
    this.startingBronca = fx.startingBronca;
    this.broncaMeter = fx.startingBronca;
    this.score = 0;
    this.playerIFrames = 0;
    this.stageEnded = false;
    this.bossPhase2Done = false;
    this.tookDamageThisZone = false;
    this.perfectStreak = 0;
    this.combo.reset(true); // fresh run: clear the chain and the peak
  }

  private setupSystems(): void {
    this.input2d = new InputManager(this);
    this.camera = new CameraSystem(createDefaultCameraConfig(STAGE_LANE.maxX, GAME_WIDTH, GAME_HEIGHT));
    this.fsm = new PlayerStateMachine();
    this.debugOverlay = new DebugOverlay(this);
    this.vfx = new VfxSystem(this);
    this.audio = new AudioSystem(loadAudioSettings());
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
      const sprite = this.add
        .sprite(0, 0, breakableKey(item.id), 0)
        .setOrigin(0.5, 0.92)
        .setScale(BREAKABLE_RENDER_SCALE);
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

    this.createBossBar();
  }

  // Boss-bar geometry. Kept as literals (not static fields reading GAME_WIDTH)
  // to avoid a circular-import TDZ when this class is evaluated.
  private readonly bossBarW = 620;
  private readonly bossBarY = 58;
  private get bossBarX(): number {
    return (GAME_WIDTH - this.bossBarW) / 2;
  }

  private createBossBar(): void {
    this.bossBarLabel = this.add
      .text(GAME_WIDTH / 2, this.bossBarY - 14, '', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffdddd',
        stroke: '#000000', strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(322)
      .setVisible(false);
    this.bossBarBg = this.add.graphics().setScrollFactor(0).setDepth(321).setVisible(false);
    this.bossBarBg.fillStyle(0x120a0a, 0.9);
    this.bossBarBg.fillRect(this.bossBarX - 2, this.bossBarY - 2, this.bossBarW + 4, 16);
    this.bossBarBg.lineStyle(1, 0xcc4422, 0.8);
    this.bossBarBg.strokeRect(this.bossBarX - 2, this.bossBarY - 2, this.bossBarW + 4, 16);
    this.bossBarFill = this.add.graphics().setScrollFactor(0).setDepth(322).setVisible(false);
    this.progressGfx = this.add.graphics().setScrollFactor(0).setDepth(315);

    this.guidanceText = this.add
      .text(GAME_WIDTH - 78, GAME_HEIGHT / 2, '→\nSEGUÍ', {
        fontFamily: 'monospace', fontSize: '28px', color: '#e8c046',
        stroke: '#000000', strokeThickness: 4, align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(318)
      .setVisible(false);
    this.tweens.add({
      targets: this.guidanceText, x: GAME_WIDTH - 62,
      duration: 620, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  /** Show/hide the "advance" arrow based on the clear-path guidance rule. */
  private updateGuidance(): void {
    if (!this.guidanceText) return;
    const alive = this.enemies.reduce((n, e) => n + (e && !e.dead ? 1 : 0), 0);
    const show = showGuidance({
      phase: this.waveSystem?.currentPhase ?? 'traveling',
      aliveEnemies: alive,
      playerX: this.playerPos.x,
      laneMaxX: STAGE_LANE.maxX,
      stageEnded: this.stageEnded,
      paused: this.paused,
    });
    this.guidanceText.setVisible(show);
  }

  // Stage-progress mini-map geometry.
  private readonly progressMargin = 120;
  private get progressW(): number {
    return GAME_WIDTH - this.progressMargin * 2;
  }
  private readonly progressBarY = GAME_HEIGHT - 20;

  /** Redraw the bottom progress bar: track, zone markers and player dot. */
  private updateProgressBar(): void {
    const g = this.progressGfx;
    if (!g) return;
    g.clear();
    const x0 = this.progressMargin;
    const w = this.progressW;
    const y = this.progressBarY;

    // Track.
    g.fillStyle(0x000000, 0.5);
    g.fillRect(x0 - 4, y - 5, w + 8, 12);
    g.fillStyle(0x554433, 0.9);
    g.fillRect(x0, y, w, 2);

    // Zone markers.
    const markers = zoneMarkers(
      encountersForStage(this.stageId).zones,
      STAGE_LANE.maxX,
      this.waveSystem?.currentZoneIndex ?? 0,
    );
    for (const m of markers) {
      g.fillStyle(zoneMarkerColor(m.kind, m.cleared), 1);
      const mx = Math.round(x0 + m.fraction * w);
      const isBig = m.kind === 'boss' || m.kind === 'mini_boss';
      g.fillRect(mx - 1, y - (isBig ? 6 : 4), 3, isBig ? 14 : 10);
    }

    // Player dot.
    const pf = progressFraction(this.playerPos.x, STAGE_LANE.maxX);
    const px = Math.round(x0 + pf * w);
    g.fillStyle(0xe8c046, 1);
    g.fillCircle(px, y + 1, 4);
    g.lineStyle(1, 0x000000, 0.8);
    g.strokeCircle(px, y + 1, 4);
  }

  /** Update the dedicated boss health bar from the active zone + boss enemy. */
  private updateBossBar(zoneKind: string | undefined): void {
    const bossType = zoneKind === 'boss' ? 'boss' : zoneKind === 'mini_boss' ? 'miniboss' : null;
    const boss = bossType ? this.enemies.find((e) => e && !e.dead && e.type === bossType) : undefined;
    const enc = encountersForStage(this.stageId);
    const view = bossBarView({
      zoneKind,
      fighting: this.waveSystem.currentPhase === 'fighting',
      bossHp: boss ? boss.hp : null,
      bossMaxHp: boss ? boss.maxHp : null,
      bossEnraged: boss ? boss.enraged : false,
      miniBossLabel: enc.miniBossLabel,
      bossLabel: enc.bossLabel,
    });
    this.bossBarLabel?.setVisible(view.visible);
    this.bossBarBg?.setVisible(view.visible);
    this.bossBarFill?.setVisible(view.visible);
    if (!view.visible || !this.bossBarFill) return;
    this.bossBarLabel?.setText(view.label);
    this.bossBarFill.clear();
    this.bossBarFill.fillStyle(bossBarColor(view.fraction, view.enraged), 1);
    const w = Math.round(this.bossBarW * view.fraction);
    if (w > 0) this.bossBarFill.fillRect(this.bossBarX, this.bossBarY, w, 12);
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
      this.tookDamageThisZone = false; // fresh chance at a perfect clear
    }
    if (actions.unlockCamera) {
      this.camera.unlock();
    }
    if (actions.zoneCleared) {
      const reward = zoneClearReward(this.tookDamageThisZone, this.perfectStreak);
      this.perfectStreak = reward.streak;
      this.addScore(reward.score);
      this.audio.play('zone_clear');
      if (reward.perfect) {
        recordPerfectZone(); // lifetime counter (feeds the "Intocable" achievement)
        const bonus = Math.round(ZONE_PERFECT_BONUS * reward.multiplier * this.diffScore);
        const streakTag = reward.streak >= 2 ? ` x${reward.streak}` : '';
        this.flashBanner(`¡ZONA PERFECTA${streakTag}!  +$${bonus}`, '#44ff88');
      }
    }

    // Movement gate: confine the player to the active arena while fighting.
    const zone = this.waveSystem.activeZone;
    this.waveGateMinX = zone ? zone.lockMinX : STAGE_LANE.minX;

    this.updateBossPhase(zone?.kind === 'boss');

    if (actions.stageCleared && !this.stageEnded) {
      this.finishStage();
      return;
    }

    // Dedicated boss bar owns the label for boss/mini-boss zones.
    this.updateBossBar(zone?.kind);

    // Objective banner (for regular wave zones; boss zones use the boss bar).
    if (this.objectiveText) {
      const isBossZone = zone?.kind === 'boss' || zone?.kind === 'mini_boss';
      if (this.waveSystem.currentPhase === 'fighting' && !isBossZone) {
        this.objectiveText.setText(`¡LIMPIÁ LA ZONA!  ENEMIGOS: ${alive}`).setVisible(true);
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
      this.flashBanner('¡EL JEFE SE ENFURECE!');
      this.spawnEnemy(boss.pos.x + 140, 470, 'grunt', 'enemy_006');
      this.spawnEnemy(boss.pos.x - 140, 540, 'grunt', 'enemy_007');
    }
  }

  /** Brief centred banner that fades out (e.g. boss phase change). */
  private flashBanner(text: string, color = '#ff5533'): void {
    const t = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, text, {
        fontFamily: 'monospace', fontSize: '22px', color,
        stroke: '#000000', strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(330);
    this.tweens.add({ targets: t, alpha: 0, scale: 1.3, duration: 1400, onComplete: () => t.destroy() });
  }

  private finishStage(): void {
    this.stageEnded = true;
    this.addScore(500); // pendrive federal
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
        noDeaths: this.playerLives === this.runStartLives,
        timeSeconds,
        maxCombo: this.combo.maxCombo,
        ...(this.stageId === '01-once' ? { rewardItemId: 'pendrive_federal' } : {}),
      });
    });
  }

  private spawnEnemy(x: number, y: number, type: string, spriteKey = 'enemy_001'): void {
    const stats = ENEMY_TYPES[type];
    if (!stats) return;
    const enemy = new EnemyEntity(x, y, stats, spriteKey);
    // Scale toughness/aggression to the selected difficulty (§11).
    if (this.diffEnemyHp !== 1) {
      enemy.maxHp = Math.round(enemy.maxHp * this.diffEnemyHp);
      enemy.hp = enemy.maxHp;
    }
    if (this.diffEnemyDamage !== 1) {
      enemy.attackDamage = Math.round(enemy.attackDamage * this.diffEnemyDamage);
    }
    // Elite promotion — regular enemies only (bosses are already special, §10).
    if (type !== 'boss' && type !== 'miniboss') {
      this.eliteSpawnOrdinal += 1;
      if (isEliteSpawn(this.eliteSpawnOrdinal, this.eliteCadence)) {
        enemy.makeElite(ELITE_HP_MULT, ELITE_DAMAGE_MULT);
      }
    }
    const shadow = this.add.graphics().setDepth(0);
    const outline = this.createOutlineSprite(spriteKey);
    const sprite = this.add.sprite(0, 0, spriteKey);
    sprite.setOrigin(0.5, SPRITE_ORIGIN_Y);
    playState(sprite, spriteKey, 'idle');
    const lift = this.createLiftSprite(spriteKey);
    const hud = this.add.graphics().setDepth(1);
    const label = this.add
      .text(0, 0, 'ELITE', {
        fontFamily: 'monospace',
        fontSize: '10px',
        color: '#ff5555',
        fontStyle: 'bold',
        stroke: '#2a0000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setVisible(false);
    this.enemies.push(enemy);
    this.enemyShadows.push(shadow);
    this.enemySprites.push(sprite);
    this.enemyGraphics.push(hud);
    this.enemyLabels.push(label);
    this.enemyOutlines.push(outline);
    this.enemyLifts.push(lift);
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

  /**
   * A rim-light silhouette drawn just behind a character so its shape pops off
   * the busy photoreal backgrounds. Same texture/frame as the character, tinted
   * a warm light and drawn additively at a slightly larger scale, so only the
   * halo around the edges shows once the opaque character is layered on top.
   */
  private createOutlineSprite(textureKey: string): Phaser.GameObjects.Sprite {
    const o = this.add.sprite(0, 0, textureKey);
    o.setOrigin(0.5, SPRITE_ORIGIN_Y);
    o.setTint(CHARACTER_RIM_TINT);
    o.setBlendMode(Phaser.BlendModes.ADD);
    o.setAlpha(CHARACTER_RIM_ALPHA);
    return o;
  }

  /**
   * An additive self-overlay drawn on top of a character to lift its exposure:
   * the sheets render darker than the photoreal stages, and this brings the
   * fighters up to "lit subject" levels without touching the source art.
   */
  private createLiftSprite(textureKey: string): Phaser.GameObjects.Sprite {
    const l = this.add.sprite(0, 0, textureKey);
    l.setOrigin(0.5, SPRITE_ORIGIN_Y);
    l.setBlendMode(Phaser.BlendModes.ADD);
    l.setAlpha(CHARACTER_LIFT_ALPHA);
    return l;
  }

  /** Sync the exposure-lift overlay to its character sprite exactly. */
  private syncLift(
    lift: Phaser.GameObjects.Sprite,
    sprite: Phaser.GameObjects.Sprite,
    screenX: number,
    screenY: number,
    depth: number,
  ): void {
    lift.setFrame(sprite.frame.name);
    lift.setPosition(screenX, screenY);
    lift.setFlipX(sprite.flipX);
    lift.setScale(sprite.scaleX, sprite.scaleY);
    lift.setDepth(depth + 0.5);
    lift.setVisible(sprite.visible);
    lift.setAlpha(sprite.visible ? CHARACTER_LIFT_ALPHA * sprite.alpha : 0);
  }

  /** Sync an outline sprite to its character's current frame/pose/depth. */
  private syncOutline(
    outline: Phaser.GameObjects.Sprite,
    sprite: Phaser.GameObjects.Sprite,
    screenX: number,
    screenY: number,
    depth: number,
  ): void {
    outline.setFrame(sprite.frame.name);
    outline.setPosition(screenX, screenY);
    outline.setFlipX(sprite.flipX);
    outline.setScale(sprite.scaleX * CHARACTER_RIM_SCALE, sprite.scaleY * CHARACTER_RIM_SCALE);
    outline.setDepth(depth - 0.5);
    outline.setVisible(sprite.visible);
  }

  private createPlayerSprite(): void {
    this.playerShadow = this.add.graphics();
    this.playerOutline = this.createOutlineSprite('mostasa');
    this.playerSprite = this.add.sprite(0, 0, 'mostasa');
    this.playerSprite.setOrigin(0.5, SPRITE_ORIGIN_Y);
    this.playerSprite.setScale(PLAYER_SPRITE_SCALE);
    this.playerLift = this.createLiftSprite('mostasa');
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
    // Layered contact shadow: a soft outer pool plus a tight dark core grounds
    // the character firmly on the floor.
    const shadowAlpha = Math.max(0.12, 0.62 - this.playerPos.z * 0.0012);
    this.playerShadow.fillStyle(0x000000, shadowAlpha * 0.5);
    this.playerShadow.fillEllipse(shadowX, shadowY + 4, 84, 26);
    this.playerShadow.fillStyle(0x000000, shadowAlpha);
    this.playerShadow.fillEllipse(shadowX, shadowY + 4, 56, 16);
    this.playerShadow.setDepth(this.playerPos.y - 1);

    // Drive the animation from the FSM state
    playState(this.playerSprite, 'mostasa', this.fsm.currentState);

    this.playerSprite.setPosition(screenX, screenY);
    this.playerSprite.setFlipX(this.playerFacing === -1);
    this.playerSprite.setDepth(this.playerPos.y);
    this.syncOutline(this.playerOutline, this.playerSprite, screenX, screenY, this.playerPos.y);
    this.syncLift(this.playerLift, this.playerSprite, screenX, screenY, this.playerPos.y);

    // Damage flash tint
    if (this.fsm.currentState === PLAYER_STATE.HURT) {
      this.playerSprite.setTint(0xff8888);
    } else if (this.fsm.currentState === PLAYER_STATE.SPECIAL) {
      this.playerSprite.setTint(0xffdd88);
    } else if (this.fsm.isDodging()) {
      this.playerSprite.setTint(0x99ccff); // cool tint sells the evasive roll
    } else {
      this.playerSprite.clearTint();
    }

    // Blink during invulnerability frames; the dodge's i-frames get a lighter
    // ghosting so the roll reads as briefly intangible.
    const blink = this.playerIFrames > 0 && Math.floor(this.playerIFrames / 4) % 2 === 0;
    if (this.fsm.isInvulnerable()) this.playerSprite.setAlpha(0.55);
    else this.playerSprite.setAlpha(blink ? 0.4 : 1);

    this.updateHeldWeaponSprite(screenX, screenY);
  }

  private updateEnemySprites(): void {
    const camX = this.camera?.worldX ?? 0;

    for (let i = 0; i < this.enemies.length; i++) {
      const enemy = this.enemies[i];
      const hud = this.enemyGraphics[i];
      const shadow = this.enemyShadows[i];
      const sprite = this.enemySprites[i];
      const label = this.enemyLabels[i];
      const outline = this.enemyOutlines[i];
      const lift = this.enemyLifts[i];
      if (!enemy || !hud || !shadow || !sprite || !label || !outline || !lift) continue;

      if (enemy.dead) {
        // One-time elite kill bonus (§10).
        if (enemy.elite && !enemy.deathRewarded) {
          enemy.deathRewarded = true;
          this.addScore(ELITE_KILL_BONUS);
        }
        hud.setVisible(false);
        shadow.setVisible(false);
        sprite.setVisible(false);
        label.setVisible(false);
        outline.setVisible(false);
        lift.setVisible(false);
        continue;
      }

      const { screenX, screenY } = worldToScreen(enemy.pos.x, enemy.pos.y, enemy.pos.z, camX, -FLOOR_OFFSET);
      const { screenX: sx, screenY: sy } = worldToScreen(enemy.pos.x, enemy.pos.y, GROUND_Z, camX, -FLOOR_OFFSET);

      shadow.clear();
      // Layered contact shadow grounds the enemy on the floor.
      shadow.fillStyle(0x000000, 0.22);
      shadow.fillEllipse(sx, sy + 4, enemy.halfW * 2 + 26, 20);
      shadow.fillStyle(0x000000, 0.42);
      shadow.fillEllipse(sx, sy + 4, enemy.halfW * 2 + 8, 12);
      // Elites get a red aura ring at the feet.
      if (enemy.elite) {
        shadow.fillStyle(0xff2222, 0.18);
        shadow.fillEllipse(sx, sy + 4, enemy.halfW * 2 + 30, 22);
        shadow.lineStyle(2, 0xff3333, 0.7);
        shadow.strokeEllipse(sx, sy + 4, enemy.halfW * 2 + 26, 18);
      }
      shadow.setDepth(enemy.pos.y - 1);

      // Character sprite driven by enemy FSM state
      const grid = gridFor(enemy.spriteKey);
      const scale = ((enemy.height * ENEMY_SCREEN_HEIGHT_K) / grid.frameHeight) * (enemy.elite ? ELITE_SCALE : 1);
      sprite.setScale(scale);
      sprite.setPosition(screenX, screenY);
      sprite.setFlipX(enemy.facing === -1);
      sprite.setDepth(enemy.pos.y);
      playState(sprite, enemy.spriteKey, enemy.fsm.currentState);
      this.syncOutline(outline, sprite, screenX, screenY, enemy.pos.y);
      this.syncLift(lift, sprite, screenX, screenY, enemy.pos.y);

      const state = enemy.fsm.currentState;
      // Hurt flash wins; otherwise the sprite carries its stage palette tint so
      // each escenario's cast reads with its own colour identity (§10).
      if (state === 'hurt') sprite.setTint(0xff8888);
      else sprite.setTint(enemyTint(this.stageId, enemy.spriteKey, enemy.type));

      // HP bar above the character (relative to the rendered sprite height so
      // it tracks the fighter's head at any scale)
      const h = sprite.displayHeight * 0.82;
      const hpRatio = enemy.hp / enemy.maxHp;
      hud.clear();
      hud.fillStyle(0x000000, 0.6);
      hud.fillRect(screenX - 22, screenY - h - 12, 44, 6);
      hud.fillStyle(0x222222, 1);
      hud.fillRect(screenX - 20, screenY - h - 11, 40, 4);
      hud.fillStyle(hpRatio > 0.5 ? 0x22cc44 : hpRatio > 0.25 ? 0xccaa22 : 0xcc2222, 1);
      hud.fillRect(screenX - 20, screenY - h - 11, Math.round(40 * hpRatio), 4);
      hud.setDepth(enemy.pos.y + 1);

      // Elite tag floats just above the HP bar, gently bobbing for visibility.
      if (enemy.elite) {
        const bob = Math.sin(this.time.now * 0.007 + i) * 2;
        label.setPosition(screenX, screenY - h - 14 + bob);
        label.setDepth(enemy.pos.y + 2);
        label.setVisible(true);
      } else if (label.visible) {
        label.setVisible(false);
      }
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

    // Combo counter (top-right), hidden until a chain starts.
    this.comboText = this.add
      .text(GAME_WIDTH - 30, 96, '', {
        fontFamily: 'monospace', fontSize: '34px', color: '#ffdd44',
        stroke: '#000000', strokeThickness: 5, align: 'right',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(320)
      .setVisible(false);
    this.comboLabelText = this.add
      .text(GAME_WIDTH - 30, 124, '', {
        fontFamily: 'monospace', fontSize: '13px', color: '#ff8844', align: 'right',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(320)
      .setVisible(false);
  }

  private updateComboHud(): void {
    const active = this.combo.count >= 2;
    this.comboText.setVisible(active);
    this.comboLabelText.setVisible(active && this.combo.label !== '');
    if (!active) return;
    const mult = this.combo.multiplier;
    this.comboText.setText(`${this.combo.count} HITS  x${mult}`);
    // Brighter as the multiplier climbs.
    this.comboText.setColor(mult >= 3 ? '#ff5555' : mult >= 2 ? '#ff9933' : '#ffdd44');
    this.comboLabelText.setText(this.combo.label);
    // A quick pop on each hit.
    this.comboText.setScale(1.18);
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 120, ease: 'Quad.easeOut' });
  }

  /** Screen flash + a bigger combo pop when the chain enters a new band. */
  private comboBandFlash(): void {
    this.cameras.main.flash(180, 255, 210, 90, false);
    this.audio.play('zone_clear');
    this.comboText.setScale(1.5);
    this.tweens.add({ targets: this.comboText, scale: 1, duration: 220, ease: 'Back.easeOut' });
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

  /** Add score scaled by the difficulty multiplier (§11). */
  private addScore(base: number): void {
    this.score += Math.round(base * this.diffScore);
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

    // Age the combo chain; refresh the HUD the frame it drops.
    if (this.combo.tick()) this.updateComboHud();

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
      } else if (ev === 'dodge') {
        this.startDodgeRoll(snap);
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
      // A held weapon adds its damage; the Kiosco upgrade scales the whole
      // swing. Build a modified attack for this frame.
      const baseDamage = this.equippedWeapon
        ? effectiveHitDamage(this.activeAttack.damage, this.equippedWeapon)
        : this.activeAttack.damage;
      const atk =
        this.damageMultiplier !== 1 || this.equippedWeapon
          ? { ...this.activeAttack, damage: Math.round(baseDamage * this.damageMultiplier) }
          : this.activeAttack;

      let maxHitstop = 0;
      let connected = false;
      const heavy = atk.damage >= 18 || this.equippedWeapon !== null;
      for (const idx of hits) {
        const enemy = this.enemies[idx];
        if (!enemy) continue;
        const dealt = enemy.fsm.isVulnerable() ? atk.damage : 0;
        enemy.applyHit(atk, this.playerFacing);
        if (dealt > 0) this.spawnDamageNumber(dealt, enemy.pos.x, enemy.pos.y, enemy.pos.z + enemy.height);
        connected = true;
        this.broncaMeter = Math.min(BRONCA_MAX, this.broncaMeter + BRONCA_PER_HIT);
        this.updateBroncaBar();
        // Chain of bronca: each landed hit builds the combo and pays score
        // scaled by its multiplier (feeds the Kiosco economy, §12/§16).
        this.combo.addHit();
        this.addScore(this.combo.scoreFor(HIT_BASE_SCORE));
        this.updateComboHud();
        maxHitstop = Math.max(maxHitstop, atk.hitstopFrames);
        // Feedback scales with the combo: bigger sparks, stronger shake, and
        // a screen flash when the chain enters a higher multiplier band (§12).
        const mult = this.combo.multiplier;
        this.camera.triggerShake(usesHeavyShake(mult) ? SHAKE_MEDIUM : SHAKE_LIGHT);
        this.playVfxAtWorld(
          heavy ? 'impacto_pesado' : 'impacto_puno',
          enemy.pos.x, enemy.pos.y, enemy.pos.z + 40, impactScale(mult),
        );
        if (crossedComboBand(this.combo.count)) this.comboBandFlash();
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
    } else if (this.fsm.isDodging()) {
      // The roll glides on its launch momentum, then settles into recovery.
      this.playerVel.x = applyFriction(this.playerVel, FRICTION * 0.55, dt).x;
      this.playerVel.y = applyFriction(this.playerVel, FRICTION * 0.55, dt).y;
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
    // A well-timed dodge roll phases through the hit (§ combate: i-frames).
    if (this.fsm.isInvulnerable()) {
      this.audio.play('dodge');
      return;
    }

    this.playerHp = Math.max(0, this.playerHp - dmg);
    this.updateAguanteBar();
    this.playerIFrames = 48;
    this.tookDamageThisZone = true; // forfeits the perfect-zone bonus
    this.combo.reset(); // getting hit breaks the chain
    this.updateComboHud();
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

  /**
   * Launch the dodge roll: a burst in the facing direction (plus an optional
   * depth component from vertical input). The FSM owns the invulnerability
   * window; here we just kick the momentum and sell it with FX.
   */
  private startDodgeRoll(snap: InputSnapshot): void {
    const DODGE_SPEED = 640;
    this.playerVel.x = this.playerFacing * DODGE_SPEED;
    if (snap[INPUT_ACTIONS.MOVE_UP].held) this.playerVel.y = -DODGE_SPEED * 0.6;
    else if (snap[INPUT_ACTIONS.MOVE_DOWN].held) this.playerVel.y = DODGE_SPEED * 0.6;
    else this.playerVel.y = 0;
    this.camera.triggerShake(SHAKE_LIGHT);
    this.audio.play('dodge');
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
      const enemy = this.enemies[idx];
      if (!enemy || enemy.dead) continue;
      enemy.applySpecialHit();
      this.spawnDamageNumber(SPECIAL_DAMAGE, enemy.pos.x, enemy.pos.y, enemy.pos.z + enemy.height);
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

  /** Floating damage number rising off a struck enemy (Biblia §12). */
  private spawnDamageNumber(damage: number, worldX: number, worldY: number, worldZ: number): void {
    const camX = this.camera?.worldX ?? 0;
    const { screenX, screenY } = worldToScreen(worldX, worldY, worldZ, camX, -FLOOR_OFFSET);
    const style = damageStyle(damage);
    const jitter = Math.round((Math.random() - 0.5) * 24);
    const t = this.add
      .text(screenX + jitter, screenY - 10, String(damage), {
        fontFamily: 'monospace', fontSize: `${style.size}px`, color: style.color,
        stroke: '#000000', strokeThickness: 4, fontStyle: 'bold',
      })
      .setOrigin(0.5, 1)
      .setDepth(worldY + 400);
    this.tweens.add({
      targets: t,
      y: t.y - 46,
      alpha: 0,
      duration: 620,
      ease: 'Quad.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private onBreakableDestroyed(b: BreakableEntity): void {
    this.playVfxAtWorld(b.def.destroyVfx, b.x, b.y, 70, 1.2);
    this.camera.triggerShake(SHAKE_MEDIUM);
    this.addScore(50);
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
        this.addScore(def.amount);
        break;
      case 'collectible':
      case 'key_item':
        this.addScore(500);
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

  // ── Pause menu (Biblia §22 volúmenes separados; §24 pausa) ──────────────

  private static readonly PAUSE_ROWS = [
    'REANUDAR',
    'VOLUMEN GENERAL',
    'VOLUMEN GOLPES',
    'VOLUMEN MÚSICA',
    'REINICIAR ZONA',
    'SALIR AL MENÚ',
  ] as const;

  private createPauseMenu(): void {
    this.paused = false;
    this.pauseIndex = 0;
    this.pauseRowTexts = [];

    const dim = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.72);
    const panel = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 420, 380, 0x10101c, 0.96)
      .setStrokeStyle(2, 0xe8c046);
    const title = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 150, 'PAUSA', {
        fontFamily: 'monospace', fontSize: '26px', color: '#e8c046',
        stroke: '#000000', strokeThickness: 4,
      })
      .setOrigin(0.5);

    const rows: Phaser.GameObjects.GameObject[] = [];
    GameScene.PAUSE_ROWS.forEach((_, i) => {
      const t = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 92 + i * 46, '', {
          fontFamily: 'monospace', fontSize: '16px', color: '#cccccc',
        })
        .setOrigin(0.5);
      this.pauseRowTexts.push(t);
      rows.push(t);
    });

    const hint = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 168, '↑↓ ELEGIR    ←→ AJUSTAR    ENTER OK    ESC VOLVER', {
        fontFamily: 'monospace', fontSize: '10px', color: '#666666',
      })
      .setOrigin(0.5);

    this.pauseContainer = this.add
      .container(0, 0, [dim, panel, title, ...rows, hint])
      .setDepth(1000)
      .setScrollFactor(0)
      .setVisible(false);

    const kb = this.input.keyboard;
    if (kb) {
      kb.on('keydown-UP', () => this.pauseNav(-1));
      kb.on('keydown-DOWN', () => this.pauseNav(1));
      kb.on('keydown-LEFT', () => this.pauseAdjust(-0.1));
      kb.on('keydown-RIGHT', () => this.pauseAdjust(0.1));
      kb.on('keydown-ENTER', () => this.pauseConfirm());
    }
  }

  private togglePause(): void {
    if (this.stageEnded) return;
    this.paused = !this.paused;
    this.pauseIndex = 0;
    this.pauseContainer?.setVisible(this.paused);
    if (this.paused) this.refreshPauseMenu();
  }

  private volumeChannelForRow(row: number): 'master' | 'sfx' | 'music' | null {
    return row === 1 ? 'master' : row === 2 ? 'sfx' : row === 3 ? 'music' : null;
  }

  private refreshPauseMenu(): void {
    const mix = this.audio.getMix();
    this.pauseRowTexts.forEach((t, i) => {
      const selected = i === this.pauseIndex;
      const ch = this.volumeChannelForRow(i);
      let label: string = GameScene.PAUSE_ROWS[i] ?? '';
      if (ch) {
        const pct = Math.round(mix[ch] * 100);
        const ticks = Math.round(mix[ch] * 10);
        label = `${label}  ${'▮'.repeat(ticks)}${'▯'.repeat(10 - ticks)} ${String(pct).padStart(3)}%`;
      }
      t.setText(selected ? `▶ ${label}` : label);
      t.setColor(selected ? '#ffffff' : '#999999');
    });
  }

  private pauseNav(delta: number): void {
    if (!this.paused) return;
    const n = GameScene.PAUSE_ROWS.length;
    this.pauseIndex = (this.pauseIndex + delta + n) % n;
    this.refreshPauseMenu();
  }

  private pauseAdjust(delta: number): void {
    if (!this.paused) return;
    const ch = this.volumeChannelForRow(this.pauseIndex);
    if (!ch) return;
    const mix = this.audio.getMix();
    this.audio.setVolume(ch, Math.round((mix[ch] + delta) * 10) / 10);
    saveAudioSettings(this.audio.getMix());
    this.audio.play('ui_confirm');
    this.refreshPauseMenu();
  }

  private pauseConfirm(): void {
    if (!this.paused) return;
    switch (this.pauseIndex) {
      case 0:
        this.togglePause();
        break;
      case 4:
        this.paused = false;
        this.scene.restart({ stageId: this.stageId });
        break;
      case 5:
        this.paused = false;
        this.audio.stopMusic();
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(SCENE_KEYS.STAGE_SELECT);
        });
        break;
      default:
        break; // volume rows use ←/→
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
      this.togglePause();
    }

    if (this.paused) return; // frozen: the pause menu is event-driven

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
    this.updateProgressBar();
    this.updateGuidance();
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
