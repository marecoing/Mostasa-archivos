# MOSTASA'S RAGE — PRODUCTION STATE

## Versión actual: 0.1.0
## Última actualización: 2026-07-16
## Rama: claude/mostasas-rage-game-build-ausmwi

---

## HITOS COMPLETADOS

### HITO 001 — Documentación base ✅
- Archivos de biblias creados en `docs/`
- `PRODUCTION_STATE.md` inicializado
- `production/BACKLOG.md` creado
- `production/ASSET_MANIFEST.json` creado

### HITO 002 — Proyecto TypeScript + Vite + Phaser 4 ✅
- `package.json` con Phaser 4.2.1, TypeScript 5.5, Vite 5.4, Vitest 2
- `tsconfig.json` con strict mode activado
- `vite.config.ts` configurado
- `index.html` con contenedor y loading screen
- `npm install` ejecutado exitosamente

### HITO 003 — Configuración de calidad ✅
- `eslint.config.js` con @typescript-eslint (flat config)
- `.prettierrc` configurado
- `vitest.config.ts` con ambiente jsdom
- Tests unitarios en `tests/unit/`

### HITO 004 — BootScene, PreloadScene, TitleScene ✅
- `BootScene`: inicializa y redirige a PreloadScene
- `PreloadScene`: barra de progreso, crea texturas placeholder, redirige a TitleScene
- `TitleScene`: título retro moderno, texto parpadeante, Enter para iniciar

### HITO 005 — GameScene con grid 2.5D y jugador placeholder ✅
- Grid de profundidad con perspectiva y luces urbanas
- Sistema de coordenadas X/Y/Z (2.5D)
- Mostasa como placeholder animado con sombra dinámica
- Movimiento WASD/flechas funcional
- Salto con gravedad Z
- Cámara con seguimiento suave
- HUD básico (Aguante, Bronca, Score)
- Debug overlay F1
- Escape vuelve al título

### HITO 006 — Sistema de input abstracto (teclado) ✅
- `InputActions.ts`: enum unificado de acciones de input
- `InputBindings.ts`: bindings por defecto teclado + gamepad (Xbox-like)
- `InputManager.ts`: snapshot por frame, `justPressed`/`justReleased`, remapeo, localStorage
- `GameScene.ts` actualizado para usar `InputManager` (reemplaza `this.keys` inline)

### HITO 007 — Soporte gamepad + remapeo ✅
- `InputManager` soporta gamepad vía `Phaser.Input.Gamepad.GamepadPlugin`
- Bindings gamepad: stick analógico + botones con nombres A/B/X/Y/L1/L2/R1/R2
- Remapeo de teclado persiste en `localStorage` (`mostasa_keybindings_v1`)
- Detección automática de conexión/desconexión de gamepad

### HITO 008 — Física Z determinista con tests ✅
- 24 tests unitarios en `tests/unit/Physics25D.test.ts`
- Fixed timestep 60 Hz con acumulador garantiza determinismo
- Gravedad (-1800 px/s²), fricción, salto, colisión con suelo

### HITO 009 — Límites y pushboxes ✅
- `Pushbox.ts`: `pushboxOverlap`, `resolvePushboxes`, `clampEntityToLane`
- `buildPlayerPushbox` / `buildEnemyPushbox` con dimensiones estándar
- 17 tests unitarios en `tests/unit/Pushbox.test.ts`
- `GameScene.ts` usa `clampEntityToLane` y `buildPlayerPushbox` (reemplaza `clampToBounds`)

### HITO 010 — Cámara avanzada (follow, combat locks, shake) ✅
- `CameraSystem.ts`: seguimiento suave con lerp, `lock`/`unlock`, `snapTo`
- Perfiles de shake: `SHAKE_LIGHT`, `SHAKE_MEDIUM`, `SHAKE_HEAVY`, `SHAKE_BOSS`
- `updateConfig(lane)` para actualizar bounds al cambiar de zona
- 18 tests unitarios en `tests/unit/CameraSystem.test.ts`
- `GameScene.ts` usa `CameraSystem` (reemplaza `this.cameraX` inline)

---

### HITO 011 — Máquina de estados del jugador ✅
- `PlayerStateMachine.ts`: FSM con 13 estados (IDLE, WALK, RUN, JUMP, LAND, LIGHT_1/2/3, HEAVY, AIR_ATTACK, HURT, DOWN, GET_UP)
- `tick(input, ctx)` → FSMResult (velZSet, newFacing, events[], activeAttack)
- `canMove()`, `locksMovement()`, `isAttacking()`, `isAirborne()` para query de estado
- `forceHurt()` / `forceDown()` para daño externo
- `GameScene.ts` usa FSM para manejar toda la lógica de estado del jugador

### HITO 012 — Debug overlay con F1/F2 ✅
- `DebugOverlay.ts`: pushbox (verde), hurtbox (azul), hitbox activo (rojo)
- F1 = overlay de texto (FPS, estado FSM, pos/vel/cam)
- F2 = overlay de volúmenes de colisión (nuevo)
- Renderizado en screen space con proyección worldToScreen

### HITO 013 — AttackDefinition data-driven ✅
- `AttackData.ts`: `AttackDef` con startup/active/recovery frames, daño, hitstun, hitstop, knockback, hitbox offset/halfW/halfD
- 5 ataques definidos: `light_1`, `light_2`, `light_3`, `heavy`, `air_attack`
- Helpers: `getTotalFrames`, `isActiveFrame`, `isStartupFrame`, `isRecoveryFrame`

### HITO 014 — Combo ligero de tres golpes ✅
- Sistema de buffer de input: J durante cualquier frame de LIGHT_1/2 → encadena al siguiente
- LIGHT_1 → LIGHT_2 → LIGHT_3 (no encadena más)
- Cada golpe tiene más daño y hitbox más grande
- 36 tests en `tests/unit/PlayerStateMachine.test.ts`

### HITO 015 — Golpe fuerte, carrera, ataque aéreo ✅
- HEAVY: 8 startup + 6 active + 20 recovery; mayor daño y knockback
- AIR_ATTACK: accesible desde JUMP; vuelve a JUMP si no aterriza
- RUN: estado diferenciado de WALK con velocidad mayor (390 vs 280)
- Estado visual: tinte del sprite cambia según estado (ataque, hurt)

### HITO 016 — Entidades enemigas con IA básica ✅
- `EnemyData.ts`: `EnemyStats` + 5 tipos (grunt/speedster/tank/zoner/miniboss)
- `EnemyStateMachine.ts`: IDLE/WALK/HURT/DOWN/GET_UP/GRABBED con hitstun countdown
- `EnemyEntity.ts`: física propia (gravedad, bounce, fricción), IA de persecución, hitThisSwing
- `GameScene.ts` spawnea ola inicial de 3 enemigos; debug keys para spawn adicional
- 35 tests en `tests/unit/EnemyStateMachine.test.ts`

### HITO 017 — Colisión jugador-enemigo y sistema de daño ✅
- `CombatSystem.ts`: `checkPlayerHitsEnemies`, `checkGrabRange`, `getRadialHits` (funciones puras)
- Hitbox detection: sameDepth(36), |dZ|<50, overlap de volúmenes
- `EnemyEntity.applyHit`: HP, knockback, hitstun/knockdown FSM transition
- Renderizado de enemigos con barra de HP dinámica
- 26 tests en `tests/unit/CombatSystem.test.ts`

### HITO 018 — Hitstop y feedback de golpe ✅
- Hitstop global: `hitstopFrames` en GameScene congela toda la simulación N frames
- `hitThisSwing` previene múltiples hits en el mismo frame de ataque
- `hitThisSwing` se resetea entre swings (cuando no hay activeAttack)
- Shake de cámara en cada hit confirmado

### HITO 019 — Garras y lanzamiento ✅
- FSM amplía: GRAB (20 frames pin) → THROW (15 frames) → IDLE
- `triggerGrab()` / `triggerSpecial()`: métodos externos que setean frame=1
- `grab_attempt` / `throw` / `special_radial` en FSMEvent
- `EnemyEntity.applyGrab()` / `applyThrow(velX, velZ, facing)`
- Enemigo se pega a jugador durante GRAB; lanzado con THROW_VEL_X=500, Z=220
- 17 tests adicionales en `tests/unit/PlayerStateMachine.test.ts`

### HITO 020 — Medidor de Bronca y ataque especial radial ✅
- Bronca meter (0-100): +18 por hit confirmado; HUD bar dinámica animada
- `triggerSpecial()` requiere bronca≥100, consume meter a 0
- `getRadialHits` impacta todos los enemigos en radio 200px, sameDepth(50)
- `EnemyEntity.applySpecialHit()`: 30 daño, knockback radial, knockdown FSM
- `isGrabbing()` y `isAttacking()` incluyen estados nuevos; sprite tinted por estado
- Debug: F (fill bronca), kill enemies, spawn todos los tipos

### HITO 021 — Integración de sprite sheets reales del Escenario 1 ✅
- 11 hojas de movimiento subidas por el usuario (Mostasa + enemigos 01-10),
  fondo magenta `#FF00FF`, frames 140×140, 8 columnas (biblia §6, §18)
- `scripts/process-sprites.mjs`: decodificador PNG propio (solo zlib) + key-out
  de magenta con despill de bordes → `public/assets/characters/*.png` (RGBA)
- Raw preservado en `assets/raw/characters/` (biblia §28); `npm run sprites:process`
- `AnimationData.ts`: mapeo data-driven estado FSM → fila/frames de la hoja
  (Mostasa usa las 12 filas canónicas; enemigos comparten filas 0-9)
- `CharacterAnimator.ts`: carga de hojas, registro de animaciones Phaser,
  `playState()` para dirigir clips desde el estado; clamp de frames fuera de rango
- `GameScene.ts`: jugador y enemigos ahora son `Phaser.Sprite` animados con
  flip por facing, depth-sort por Y, sombras, barras de HP y tint de daño
- `PreloadScene.ts` carga las 11 hojas como spritesheets 140×140
- Verificado end-to-end en navegador (Chromium headless): sprites renderizan,
  animan, combate conecta (Bronca sube con hits), sin errores de runtime
- 10 tests en `tests/unit/AnimationData.test.ts` (integridad de filas/columnas)

### HITO 022 — Corrección del grid de frames y filas de animación ✅
- **Hallazgo clave**: las hojas subidas NO son un grid uniforme 140×140.
  Dimensiones reales de frame medidas (ancho siempre 140 = 1120/8 columnas):
  - Mostasa (1120×1680): **8 filas × 210px**
  - Comunes 001-008 (1120×1400): **8 filas × 175px**
  - Miniboss 009 (1120×1540): **10 filas × 154px**
  - Boss 010 (1120×1680): **8 filas × 210px**
- El código cargaba las hojas a 140×140 → cada frame no-idle se renderizaba
  partido (pies arriba, cabeza abajo) porque el personaje (~175-210px) cruzaba
  los límites de celda. Verificado end-to-end en navegador.
- `AnimationData.ts`: `CHARACTER_GRIDS` con la geometría por-hoja + `gridFor()`;
  mapeos de fila reescritos al layout real (común 8 filas:
  idle/walk/run/puñetazo/patada/arma/knockdown/tirado; miniboss 10 filas)
- `CharacterAnimator.ts`: carga cada hoja con su `frameWidth/frameHeight`;
  registro de animaciones respeta las columnas del grid
- `GameScene.ts`: origen del sprite 0.95 (pies al fondo del frame alto) y
  escala por-personaje derivada de `frameHeight` y la altura del arquetipo
- 24 tests en `AnimationData.test.ts` (incluye validación de que cada grid
  tesela su hoja exactamente)

### HITO 023 — Integración de assets: escenarios, rompibles, VFX, ítems ✅
- **Auditoría** de 223 PNGs nuevos + 2 manifests: 0 corruptos, 0 duplicados,
  0 mismatches de dimensión vs `asset-manifest.json`. Detectadas y corregidas
  60 referencias rotas en `scenario-manifest.json` (apuntaban a
  `strips_5120x1024/` y `panels_1024x1024/` inexistentes; archivos en la raíz).
- Assets de runtime copiados (no destructivo) a `public/assets/{stages,vfx,
  weapons,pickups,destructibles,props,rewards,ui}` (~13MB); Escenario 1 (Once)
  a `public/assets/stages/once/`. Fuentes y escenarios 2-10 quedan en la raíz
  (lazy-load por escenario, biblia §32).
- Manifests de código (biblia §40): `StageManifest.ts` (10 escenarios),
  `ItemManifest.ts` (10 armas + 11 pickups + 5 rewards), `BreakableManifest.ts`
  (6 rompibles con durabilidad §13, drop tables, VFX), `VfxManifest.ts` (6 VFX).
- Sistemas nuevos: `StageBackground.ts` (fondo desplazable 1:1 con la cámara,
  5 paneles 1024², extiende la lane al ancho del escenario), `VfxSystem.ts`
  (anims one-shot ADD-blend), `AssetLoader.ts` (preload centralizado),
  entidades `BreakableEntity` y `PickupEntity` (lógica pura testeable).
- `GameScene.ts`: renderiza el fondo real de Once (reemplaza la grilla), spawnea
  6 rompibles, colisión ataque→rompible (`checkPlayerHitsBreakables`), destrucción
  con VFX + drop (rollDrop) + score, pickups con física de spawn y colección por
  proximidad (health/rage/energy/money). VFX de impacto en cada golpe a enemigo,
  chispas al pegar rompibles, `bronca_especial` en el especial. Offset de piso
  (`FLOOR_OFFSET`) alinea la lane 2.5D con el piso pintado.
- Fix: TDZ por import circular (campo estático usaba `GAME_HEIGHT`) → movido al
  constructor. Verificado end-to-end en navegador: fondo, rompibles, combate,
  VFX y Bronca funcionando sin errores de runtime.
- 16 tests nuevos en `AssetSystems.test.ts` (drops, rompibles, pickups,
  colisión, integridad de los 4 manifests).

### HITO 024 — Armas equipables ✅
- `ItemManifest`: armas con `durability` (biblia §13: liviana 5 / media 8 /
  pesada 3-5; botella 3, llave/silla/cajón 5, resto 8)
- `WeaponEntity.ts`: arma en el mundo (física de spawn + rango de recogida) +
  `EquippedWeapon` + `effectiveHitDamage(base, weapon)` (el arma suma su daño)
- `GameScene.ts`: spawnea 3 armas en la calle (tubo, llave inglesa, cadena);
  auto-equip al caminar sobre ellas; ataques con arma usan daño modificado
  contra enemigos y rompibles; durabilidad se gasta 1 por swing conectado;
  al agotarse el arma se rompe (VFX polvo + desequipa); sprite del arma
  renderizado en la mano (angulado durante el golpe); HUD "⚔ nombre dur/max"
- Verificado en navegador: recoger tubo → HUD "Tubo Metálico 7/8", arma en
  mano durante ataque, sin errores de runtime
- 4 tests nuevos en `AssetSystems.test.ts` (effectiveHitDamage, rango,
  física, bandas de durabilidad §13)

## HITOS PENDIENTES

- HITO 025 — Sistema de oleadas (WaveSystem) y zonas de combate del Escenario 1
- HITO 026 — Colocación de props decorativos por panel + mini-boss/boss
- HITO 024 — Audio (SFX: golpes, salto, hurt; música: loop del escenario)
- ... (hitos 025-060)

---

## ESTADO DEL BUILD

| Check       | Estado  |
|-------------|---------|
| typecheck   | ✅ OK   |
| lint        | ✅ OK   |
| test        | ✅ OK   |
| build       | ✅ OK   |

---

## ASSETS

- Todos los assets son placeholders generados por código (Graphics API de Phaser)
- No se han generado imágenes con Nano Banana (se activa en Hito 047)
- No se han generado audios (se activa en Hito 042)

---

## DECISIONES TÉCNICAS

Ver `docs/adr/` para Architecture Decision Records.

| ADR | Decisión |
|-----|----------|
| 001 | Usar Phaser 4.2.1 (versión estable más reciente de Phaser 4) |
| 002 | Física 2.5D propia (X/Y/Z) desacoplada de Arcade Physics de Phaser |
| 003 | Fixed timestep 60Hz con acumulador para física determinista |
| 004 | Texturas placeholder generadas por Graphics API sin assets externos |

---

## ESTADO DEL TEST SUITE

| Archivo                         | Tests  | Estado |
|---------------------------------|--------|--------|
| Physics25D.test.ts              | 24     | ✅ OK  |
| CameraSystem.test.ts            | 18     | ✅ OK  |
| Pushbox.test.ts                 | 17     | ✅ OK  |
| AttackData.test.ts              | 14     | ✅ OK  |
| PlayerStateMachine.test.ts      | 53     | ✅ OK  |
| EnemyStateMachine.test.ts       | 35     | ✅ OK  |
| CombatSystem.test.ts            | 26     | ✅ OK  |
| AnimationData.test.ts           | 24     | ✅ OK  |
| AssetSystems.test.ts            | 20     | ✅ OK  |
| **Total**                       | **231**| ✅ OK  |

---

## LIMITACIONES DE LA BUILD ACTUAL

1. Sin sprites finales (placeholders rectangulares)
2. Sin audio (SFX ni música)
3. Sin combate funcional (solo movimiento)
4. Sin enemigos
5. Sin máquina de estados del jugador
6. Sin waves ni sistema de combate
