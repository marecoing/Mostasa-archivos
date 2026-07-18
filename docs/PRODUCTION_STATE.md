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

### HITO 025 — Sistema de oleadas y zonas de combate ✅
- `WaveManifest.ts`: encuentros del Escenario 1 (biblia §11) — 4 zonas de
  combate (3 oleadas + 1 mini-boss) con triggerX, bounds de lock y oleadas
  con spawns por arquetipo/sprite/lane (presupuesto de amenaza §11)
- `WaveSystem.ts`: máquina de estados pura (traveling → fighting → done);
  `update(playerX, aliveEnemies)` emite acciones (lock/unlock cámara, spawns,
  zoneCleared, stageCleared) y expone `gateX` (gate de movimiento)
- `GameScene.ts`: reemplaza la ola fija por progresión por zonas — al cruzar
  el trigger bloquea la cámara a la arena, spawnea la oleada, muestra banner
  "¡LIMPIÁ LA ZONA! ENEMIGOS: N"; el jugador queda confinado (gate min/max)
  hasta limpiar; siguiente oleada al matar todos; al despejar la zona
  desbloquea y deja avanzar; +200 score por zona. Termina en el mini-boss
  (enemy_009)
- Verificado en navegador: cruce de trigger → cámara bloqueada + 2 enemigos
  spawneados + banner de objetivo, sin errores de runtime
- 10 tests en `WaveSystem.test.ts` (transiciones de fase, gate, spawns,
  integridad del manifest de encuentros)

### HITO 026 — Boss del Escenario 1 con fases + cierre del nivel ✅
- `WaveManifest`: agregada la zona final del **boss** (Capataz Nocturno,
  enemy_010) después del mini-boss; `EnemyData` gana el tipo `boss` (650 HP)
- `GameScene.updateBossPhase()`: **Fase 2** al 50% de HP del boss → shake +
  VFX bronca_especial + convoca 2 refuerzos (biblia §14 Once)
- `finishStage()`: al despejar todas las zonas → +500 score (pendrive),
  calcula tiempo/HP y transiciona a la pantalla de resultados

### HITO 027 — Pantalla de resultados y sistema de rango ✅
- `RankSystem.ts`: `computeRank(StageResult)` → D/C/B/A/S/Rosca (biblia §4)
  por bandas de score + bumps por clear sin caer/saludable y por tiempo;
  "Rosca" reservado a clear impecable, rápido y de alto puntaje
- `ResultsScene.ts`: "ESCENARIO DESPEJADO", sprite del Pendrive Federal
  recuperado, stats (puntaje/aguante/tiempo/sin caer), rango grande coloreado,
  ENTER → título; registrada en `GameConfig` (`SCENE_KEYS.RESULTS`)
- Verificado en navegador: la escena renderiza el pendrive + rango "Rosca"
  para un clear impecable; sin errores de runtime
- 6 tests en `RankSystem.test.ts` (bandas, bumps, Rosca, rangos válidos)

### HITO 029 — Ataques enemigos, daño al jugador, vidas y game over ✅
- `EnemyStateMachine`: nuevo estado ATTACK telegrafiado (windup 14 / active 5 /
  recovery 18 frames, biblia §10); `startAttack()`, `isAttackActive()`;
  interrumpible con un golpe (vulnerable durante el ataque)
- `EnemyData`: cada tipo gana `attackDamage/attackRange/attackCooldown`; nuevo
  tipo `boss`
- `EnemyEntity`: IA decide atacar en rango (presiona hasta entrar), cooldown,
  `consumeAttackHit()` (daño una vez por swing, solo en frames activos, con
  jugador de frente/en rango/misma profundidad); animación de ataque (fila 3)
- `GameScene`: **sistema de tokens de ataque** (máx 2 atacantes simultáneos,
  §10); el jugador recibe daño → HURT + knockback + i-frames (48f) con
  parpadeo + shake + VFX; barra de AGUANTE dinámica; **3 vidas**; al morir se
  pierde vida y respawnea con gracia; sin vidas → **GAME OVER** → título;
  HUD dinámico (★ score + ♥ vidas)
- Verificado en navegador (dump de estado): HP 100→92→76 por ataques de grunts,
  i-frames y knockback funcionando; enemigos en estado 'attack' con telegrafía
- 10 tests en `EnemyAttack.test.ts` (windows de ataque, interrupción, daño
  una-vez/en-rango/de-frente, tokens)

### HITO 030 — Audio procedural (SFX + música del escenario) ✅
- No se enviaron archivos de audio (dirs `public/assets/audio/*` vacíos), así que
  todo se **sintetiza con WebAudio** (biblia §22); los assets se pueden reemplazar
  luego sin tocar el resto
- `systems/audio/SoundBank.ts`: banco puro y testeable — 12 SFX definidos por
  capas (`osciladores + ruido` con envolvente de ganancia), `midiToFreq()`,
  `beatDuration()`, y un loop musical `ONCE_MUSIC` (bajo + arpegio, 132 BPM,
  16 beats)
- `systems/audio/AudioSystem.ts`: wrapper WebAudio defensivo — crea/reanuda el
  `AudioContext` **solo tras el primer gesto del usuario** (política de autoplay,
  §22); buses de ganancia separados master/sfx/música (§22 "volúmenes
  separados"); renderiza capas como one-shots; loop de música re-agendado por
  compás; mute; degrada a no-op si no hay WebAudio (jsdom/tests no rompen)
- `GameScene`: dispara SFX en golpe conectado (punch/heavy_hit + enemy_hurt),
  rompible, pickup, arma equipada, arma rota, salto, especial, daño al jugador,
  zona limpia, fase 2 del boss y cierre de nivel; música arranca en el primer
  input y se detiene en game over / fin de nivel
- Verificado en Chromium headless: `AudioContext` activo tras el gesto,
  `playCount` incrementa al sonar un SFX, sin errores de runtime
- 9 tests en `SoundBank.test.ts` (integridad del banco, rangos de capas, loop) +
  4 en `AudioSystem.test.ts` (degradación segura sin WebAudio, mute, mezcla)

### HITO 031 — Ataques diferenciados del boss + pulido de fases ✅
- `entities/BossAI.ts`: lógica pura y testeable — `chooseBossAttack()` elige por
  distancia entre **'melee' (el caño)** a corta distancia y **'charge' (la
  embestida)** a media distancia; constantes de rango/velocidad/daño/frames del
  dash (rango de carga ≈ distancia que el dash alcanza, para que cierre y
  conecte en vez de quedarse corto)
- `EnemyEntity`: rama de IA específica del boss; al comprometer una carga bloquea
  el facing y hace un **dash hacia adelante** (620 u/s durante 16 frames) tras
  la telegrafía; `consumeAttackHit()` distingue la ventana/daño/alcance de la
  carga (32 de daño, más largo) del golpe normal; `enrage()` (fase 2) sube la
  velocidad ×1.35 y acorta cooldowns; `attackJustStarted` para que la escena
  dispare el tell
- `GameScene`: telegrafía distinta por tipo de ataque del boss (VFX + SFX:
  `heavy_hit`/bronca para la carga, `ui_confirm`/polvo para el caño); shake
  extra al conectar la carga; en fase 2 el boss se enfurece con banner
  "¡EL CAPATAZ SE ENFURECE!"
- Verificado en Chromium headless: el boss alterna caño/carga según distancia,
  el dash cierra la brecha (vx=-620, x 620→506) y **conecta** (HP del jugador
  100→46), `enrage()` sube la velocidad, sin errores de runtime
- 11 tests en `BossAI.test.ts` (decisión por distancia/profundidad/cooldown,
  commit de melee/charge, dash hacia adelante, daño de carga una-vez y ventana
  extendida, enrage idempotente)

### HITO 032 — Props decorativos + selección de escenario / campaña ✅
- **Props decorativos** (biblia §14): `data/PropManifest.ts` (puro, testeable) —
  13 props del Once en dos capas de parallax: `back` (persianas, carteles,
  rejas, cableado; depth -900, parallax 0.9-0.96) y `front` (faroles, bolsas
  de basura, bicicleta, banco; depth 700, parallax 1.08-1.1 → los peleadores
  pasan POR DETRÁS, vendiendo la profundidad 2.5D); `propScreenX()` puro
- `systems/PropSystem.ts`: coloca y scrollea los props con culling fuera de
  pantalla (calles largas baratas de dibujar); 100% cosmético, sin colisión
- `AssetLoader`: carga `assets/props/<id>.png` vía `allPropIds()` (18 PNGs ya
  subidos al repo, solo se cargan los usados)
- **Campaña** (biblia §32/§35): `data/CampaignProgress.ts` — progreso puro
  (`isStageUnlocked` secuencial, `isStagePlayable` = desbloqueado + arte
  runtime-ready, `withStageCleared` inmutable con mejor score/rango) +
  persistencia defensiva en localStorage (degrada a memoria en tests/SSR)
- `scenes/StageSelectScene.ts`: grilla 5×2 con los 10 escenarios, estados
  🔒 BLOQUEADO / PRÓXIMAMENTE / ▶ DISPONIBLE / ✓ DESPEJADO+rango, navegación
  por teclado, nudge al intentar entrar a uno bloqueado
- Flujo nuevo: Título → **Selección** → GameScene(`stageId` por init data) →
  Resultados (graba progreso, banner "NUEVA ZONA") → Selección
- `GameScene`: `stageId` dinámico (banner de nivel, fondo, recompensa);
  `noDeaths` real (vidas intactas)
- Verificado en Chromium headless (capturas + estado): grilla renderiza con
  estados correctos, el nivel bloqueado no se lanza (nudge), 13 props cargados
  con culling (8 visibles), capas back/front a profundidad correcta, sin
  errores de runtime
- 8 tests en `PropManifest.test.ts` + 8 en `CampaignProgress.test.ts`

### HITO 033 — Escenario 2 jugable: Estación Oxidada ✅
- **Paneles**: copiados (no destructivo) los 5 paneles 1024×1024 de
  `02-estacion-oxidada/` a `public/assets/stages/estacion/`; `StageManifest`
  marca el escenario `runtimeReady` con sus rutas
- **Lazy load** (biblia §32): `GameScene.preload()` carga los paneles del
  escenario elegido solo si PreloadScene no los tiene en caché — los
  escenarios nuevos no engordan la carga inicial
- `data/StageLayout.ts` (nuevo, puro): layouts de rompibles + armas por
  escenario; los del Once salieron del código hardcodeado de GameScene y la
  Estación suma 7 rompibles y 4 armas (cadena, tapa de tacho, tubo, maletín)
- `WaveManifest`: `ESTACION_ENCOUNTERS` — 5 zonas (2 oleadas + 1 emboscada +
  miniboss "El Guarda Fantasma" + boss "El Señalero del Óxido" con secuaz);
  más presión de speedsters/tanks que el Once; `encountersForStage()` +
  etiquetas de jefes por escenario (`miniBossLabel`/`bossLabel`); el elenco
  reutiliza las hojas del Escenario 1 hasta que exista el arte de los
  enemigos 11-20 (sin inventar assets)
- `PropManifest`: `ESTACION_PROPS` — 14 props de andén (molinetes, carteles
  ilegibles, cableado, faroles, bancos, valija abandonada, carrito de carga)
- `GameScene` quedó 100% genérico por escenario: banner, fondo, props,
  layouts, encuentros y etiquetas salen todos de datos por `stageId`
- Verificado en Chromium headless (capturas + estado): la Estación se lanza
  desde la selección (desbloqueada al despejar Once), fondo lazy-cargado,
  14 props, 7 rompibles, 4 armas, zona 1 activa con combate; molinete
  ajustado al pie de la pared; sin errores de runtime
- 8 tests en `StageData.test.ts` (integridad de encuentros de TODOS los
  escenarios registrados: orden de triggers, bounds, tipos válidos, boss
  final; layouts contra manifests; wiring del escenario 2) + 2 tests
  existentes actualizados al nuevo estado

### HITO 034 — Campaña completa: los 10 escenarios jugables ✅
- **Paneles**: los 8 escenarios restantes (3-10) copiados no destructivamente a
  `public/assets/stages/<nombre>/` (~52 MB, lazy-loaded §32); `StageManifest`
  con helper `panels()` y los 10 escenarios `runtimeReady`
- **Encuentros** (`WaveManifest`): 8 sets nuevos con curva de dificultad por
  mezcla de arquetipos — Conurbano (emboscadas + zoners), Palermo (SIN
  mini-boss, salta al jefe), Protesta (multitudes de 3-4), Catalinas (tanks),
  Country (speedsters), Galpón (mezcla pesada; el jefe pelea con un
  ex-mini-boss), Poder (doble mini-boss; jefe con 2 secuaces), Casa Rosada
  (gauntlet final: jefe + mini-boss + tank). Jefes 100% ficticios (El Puntero
  del Pasillo, El Influencer de Cartón, El Orador de Humo, La Gerencia del
  Humo, El Escribano del Country, El Capanga del Galpón, La Mano Derecha,
  El Jefe de la Rosca)
- **Layouts** (`StageLayout`): rompibles + armas para los 8 escenarios desde
  los pools existentes
- **Props** (`PropManifest`): sets temáticos por escenario con helpers
  compactos (`back`/`front`/`cables`); los props de oficina (carpetas, sellos,
  maletines) son primeros planos → solo funcionan como clutter de piso a
  escala chica; en la Casa Rosada el piso pintado está más abajo → props de
  fondo al pie de la pared (~455-465)
- **Bugfix** `TitleScene`: `enterKey.isDown` en `update()` encolaba un
  `scene.start` por frame mientras Enter estaba presionado (múltiples
  `once('camerafadeoutcomplete')`) → reinicios de la escena siguiente y
  carreras intermitentes; ahora hay latch `starting` (reset en `create()`)
- Verificado en Chromium headless (captura por escenario, página fresca por
  nivel): los 8 escenarios nuevos cargan con fondo + props + rompibles +
  armas, sin errores de runtime; ajustes visuales iterados (props flotantes
  corregidos en 6/9/10)
- Tests: `StageData.test.ts` ahora exige a los 10 escenarios paneles EN DISCO,
  encuentros, layout y props; verifica que todo prop id tenga su PNG y que
  Palermo sea el único sin mini-boss (34 tests en el archivo)

### HITO 035 — Final de campaña + música por escenario ✅
- `SoundBank`: `MUSIC_VARIANTS` — el loop base re-tonalizado y re-tempado por
  escenario (transpose en semitonos + BPM; la tensión sube hacia la Casa
  Rosada: Once 132 BPM/+0 → Rosada 150 BPM/+6); `variantForStage()` con
  fallback neutro
- `AudioSystem.startMusic(variant?)`: aplica transpose/BPM del escenario al
  agendar cada compás
- `scenes/EndingScene.ts` (nueva): epílogo satírico 100% ficticio ("LA ROSCA
  CAYÓ"), pendrive federal, totales de campaña desde el progreso persistido
  (zonas liberadas + puntaje total), "MOSTASA VOLVERÁ", ENTER → título (con
  latch anti doble-start)
- `ResultsScene`: detecta el último nivel (`nextStageId === null`) → banner
  "¡LA ROSCA CAYÓ! CAMPAÑA COMPLETADA" y ENTER rutea al Ending en vez de a
  la selección
- `TitleScene`: textos desactualizados ("VERTICAL SLICE — NIVEL 1") →
  "CAMPAÑA — 10 ZONAS JUGABLES"
- Verificado en Chromium headless: la variante musical de la Rosada llega al
  AudioSystem (transpose 6 / 150 BPM con contexto activo), Results del nivel
  10 → ENTER → Ending (captura revisada, layout iterado) → ENTER → Título;
  sin errores de runtime
- 3 tests nuevos en `SoundBank.test.ts` (variante por cada escenario de la
  campaña, frecuencias transpuestas dentro de rango audible y BPM sano,
  fallback neutro + rampa de tensión)

### HITO 036 — Menú de pausa + volúmenes persistentes ✅
- `data/AudioSettings.ts` (puro): `clamp01`, `sanitizeMix` (normaliza valores
  inválidos a defaults), load/save defensivo en localStorage (mismo patrón
  que CampaignProgress)
- `AudioSystem`: `getMix()` (copia) y `setVolume(canal, v)` — aplica en vivo
  al gain node correspondiente (respetando mute) y clampa 0..1; el
  constructor recibe la mezcla guardada
- `GameScene`: **menú de pausa** (ESC) — REANUDAR / VOLUMEN GENERAL / VOLUMEN
  GOLPES / VOLUMEN MÚSICA (barras ▮▮▮ con ←→ en pasos de 10%, guardado al
  instante + feedback ui_confirm) / REINICIAR ZONA (scene.restart con el
  mismo stageId) / SALIR AL MENÚ (a la selección); la simulación se congela
  (update retorna temprano; el menú es event-driven); ESC ya no expulsa al
  título sin confirmación
- **Bugfix crítico** `StageSelectScene`: `cards[]` persistía entre visitas
  (Phaser reusa instancias de escena) y `refreshSelection()` tocaba textos
  destruidos → crash `glTexture` al re-entrar a la selección (la causa raíz
  de los fallos de ciclado vistos en el Hito 034); ahora `create()` resetea
  `cards`/`selected`
- Verificado en Chromium headless: pausa congela (x 400→400 con D
  presionada), volumen música 0.6→0.4 aplicado y persistido en localStorage,
  resume mueve al jugador, REINICIAR/SALIR funcionan, y el ciclo
  juego→selección→juego×2 corre sin errores; captura del menú revisada
- 6 tests en `AudioSettings.test.ts` (clamp, sanitize, round-trip, corrupt
  storage, setVolume clampa sin WebAudio, getMix devuelve copia)

### HITO 037 — Cutscenes de texto entre niveles ✅
- `data/StoryManifest.ts` (puro): intro por escenario — 2-3 líneas con
  narrador o MOSTASA, tono satírico rioplatense, **todo ficticio** (biblia
  §5, restricciones legales §35: ninguna referencia a personas reales); el
  arco narra la ruta del pendrive federal desde el Once hasta la Rosca
- `scenes/CutsceneScene.ts` (nueva): caja de diálogo con **typewriter** (55
  chars/seg), etiqueta de hablante en dorado, ENTER completa la línea o
  avanza, ESC saltea todo; siempre termina lanzando GameScene con el mismo
  `stageId`; si un escenario no tiene guion pasa directo al juego
- Flujo: Selección → **Cutscene** → Nivel (la selección ahora lanza
  `CUTSCENE`, no `GAME` directo)
- Verificado en Chromium headless: typewriter revela el texto, ENTER lo
  completa y avanza de línea (capturas del narrador y de MOSTASA), ESC
  saltea y el juego arranca en el nivel correcto sin errores
- 3 tests en `StoryManifest.test.ts` (intro no vacía para los 10 escenarios,
  máx 3 filas visuales por línea, lookup con fallback)

### HITO 038 — Meta-juego: Kiosco de Doña Bronca (tienda de mejoras) ✅
- `CampaignProgress` extendido: `wallet` (guita) + `upgrades` (niveles por
  ítem), persistidos; `withStageCleared` **paga el score de cada corrida a la
  billetera** (los replays también suman); `loadProgress` sanea `wallet`
  (no negativo, finito). Moneda 100% in-game, sin dinero real (§35)
- `data/ShopManifest.ts` (puro): 4 mejoras — Mate Reforzado (+15 aguante máx,
  3 niv), Puños Curtidos (+10% daño, 3 niv), Corazón de Barrio (+1 vida,
  2 niv), Desayuno Amargo (50 bronca inicial, 1 niv); costo escalado
  `baseCost*(nivel+1)`; `nextCost`/`canBuy`/`buyUpgrade` (inmutable) +
  `effectsFor` que deriva los efectos de juego de los niveles comprados
- `scenes/ShopScene.ts` (nueva): "El Kiosco de Doña Bronca" — billetera,
  filas con pips de nivel (●○○) y precios, descripción, feedback de compra
  (comprado / no alcanza / al máximo), navegación por teclado
- `StageSelectScene`: muestra la guita, tecla **K abre el Kiosco**
- `GameScene.applyUpgrades()`: al crear/reiniciar aplica maxHp/vidas/
  multiplicador de daño/bronca inicial desde el progreso; el multiplicador
  escala el daño de todos los golpes del jugador (combinado con armas)
- Verificado en Chromium headless: comprar Mate Reforzado descontó 5000→4100,
  guardado en localStorage; al entrar a un nivel con 3 mejoras compradas el
  jugador tenía maxHp 115, 4 vidas y daño ×1.1; captura de la tienda revisada;
  sin errores de runtime
- 11 tests en `ShopManifest.test.ts` (integridad, costos escalados, canBuy,
  compra inmutable, efectos) + 1 test de billetera en `CampaignProgress.test.ts`

### HITO 039 — Cadena de bronca: combo + multiplicador de puntaje ✅
- `systems/ComboSystem.ts` (puro, testeable): cadena por golpes conectados con
  timer (84 frames ≈1.4s); `comboMultiplier` en bandas (5→x1.5, 10→x2, 20→x3,
  30→x4), `comboLabel` con elogios (¡DALE!/¡QUÉ MÁQUINA!/¡FURIA TOTAL!/
  ¡IMPARABLE!); `addHit`/`tick`/`reset`/`scoreFor`, `timeFraction` para un
  eventual countdown bar
- `GameScene`: cada golpe conectado a un enemigo suma al combo y **paga
  score = base(10) × multiplicador** (alimenta la guita del Kiosco, §12/§16);
  recibir daño rompe la cadena (`reset`); el timer avanza en `fixedUpdate`;
  HUD arriba a la derecha con "N HITS xM" + etiqueta, pop en cada golpe,
  color según el multiplicador; oculto bajo 2 hits
- Verificado en Chromium headless: golpeando una multitud el combo subió
  6→18, multiplicador 1.5→2, score 70→295; al expirar el timer o recibir
  daño cae a 0; captura del HUD "16 HITS x2 / ¡QUÉ MÁQUINA!" revisada; sin
  errores de runtime
- 8 tests en `ComboSystem.test.ts` (bandas monótonas, labels, timeout
  exacto una vez, refresh en ventana, reset, scoreFor)

### HITO 040 — Combo en resultados + rango + récord persistente ✅
- `ComboSystem`: rastrea el **pico del run** (`maxCombo`); `reset()` mantiene
  el pico al recibir daño, `reset(true)` lo limpia al empezar un run nuevo
- `RankSystem`: `StageResult.maxCombo` opcional; un combo ≥20 **suma un bump**
  de rango; **fix de balance**: los bumps ahora topan en S y "Rosca" queda
  reservado exclusivamente a la condición impecable (sin caer + ≥90% vida +
  ≤150s) — antes 3 bumps escalaban de A directo a Rosca por el clamp
- `CampaignProgress`: nuevo `bestCombo` (récord de campaña), saneado al
  cargar; `recordStageResult(stageId, score, rank, maxCombo)` lo actualiza
- `GameScene`: pasa `maxCombo` a resultados; **fix**: `noDeaths` ahora compara
  contra las vidas iniciales del run (`runStartLives`) en vez de `=== 3`
  (roto por la mejora de vidas extra del Kiosco)
- `ResultsScene`: fila "COMBO MÁX N HITS" con marca **¡RÉCORD!** cuando supera
  el mejor histórico
- Verificado en Chromium headless: combo de 24 en el run → resultados muestran
  "COMBO MÁX 24 HITS ¡RÉCORD!", bestCombo persistido 5→24, y el mismo clear a
  85% de vida da rango **S** (no Rosca) tras el fix; sin errores de runtime
- Tests: bump por combo grande + los bumps no alcanzan Rosca sin la condición
  impecable (`RankSystem`); pico del combo a través de resets (`ComboSystem`);
  bestCombo entre runs (`CampaignProgress`)

### HITO 041 — La Libreta de Mostasa (panel de récords) ✅
- `data/CampaignStats.ts` (puro): `computeStats(progress)` agrega el progreso
  persistido — zonas despejadas/total, campaña completa, puntaje total (suma
  de mejores), combo récord, guita, mejor rango, y conteo de rangos S/Rosca
- `scenes/StatsScene.ts` (nueva): "La Libreta de Mostasa" — bloque resumen +
  grilla de rangos por zona (coloreados por RANK_COLORS, — si no despejada) +
  banner de campaña completa; solo lectura, ESC/ENTER vuelve al título
- `TitleScene`: **TAB abre la Libreta** (con hint en pantalla), reusa el latch
  `starting` para evitar dobles transiciones
- Verificado en Chromium headless: con progreso variado (4/10 zonas, rangos
  S/Rosca/B/A) la Libreta mostró resumen correcto (2 S/Rosca, mejor rango
  Rosca, combo 31, puntaje total 9900, guita 3200) y la grilla coloreada;
  ESC vuelve al título; sin errores de runtime
- 4 tests en `CampaignStats.test.ts` (vacío, agregación de clears/scores/top
  rank/conteo S, Rosca cuenta como S-tier, campaña completa)

### HITO 042 — Logros de la Rosca (con recompensa de guita) ✅
- `CampaignProgress`: nuevo `achievements: string[]` (ids desbloqueados),
  saneado al cargar; propagado por `withStageCleared`
- `data/AchievementManifest.ts` (puro): 7 logros con condición sobre las
  estadísticas agregadas y recompensa en guita — Primera Sangre (1 zona,
  $200), Media Ciudad (5 zonas, $1000), Cadena de Bronca (combo 20, $500),
  Imparable (combo 30, $1000), Sin Una Marca (rango S/Rosca, $800),
  Millonario del Barrio (puntaje total 20k, $1500), La Rosca Cayó (campaña
  completa, $3000); `pendingAchievements` + `grantAchievements` (puro,
  idempotente — nunca paga dos veces). Recompensas 100% in-game (§35)
- `ResultsScene`: tras registrar el resultado evalúa y paga los logros nuevos
  (guardando), y muestra un panel "¡LOGROS DESBLOQUEADOS!" con nombre +
  recompensa
- `StatsScene` (Libreta): sección "LOGROS DE LA ROSCA" en 2 columnas —
  desbloqueados en verde (✓ HECHO), pendientes en gris con su recompensa
- Verificado en Chromium headless: un clear con combo 25 + rango Rosca
  desbloqueó primera_sangre/cadena_de_bronca/sin_una_marca, sumó $1500 al
  wallet (además del score), panel en resultados y sección en la Libreta
  revisados; re-evaluar no vuelve a pagar; sin errores de runtime
- 7 tests en `AchievementManifest.test.ts` (integridad, unlock por
  clear/combo/rango/campaña, idempotencia, pureza)

### HITO 043 — Modos de dificultad (Normal / Difícil / Furia) ✅
- `data/DifficultyManifest.ts` (puro): 3 modos que escalan HP y daño de
  enemigos + multiplicador de score — Normal (×1/×1/×1), Difícil
  (×1.4/×1.3/×1.3), Furia (×1.8/×1.6/×1.6); `difficultyById`, `cycleDifficulty`
  (wrap), y load/save defensivo en localStorage (patrón de AudioSettings)
- `GameScene`: `applyUpgrades` resuelve los multiplicadores del modo;
  `spawnEnemy` escala HP máx/actual y `attackDamage` al aparecer; nuevo helper
  `addScore(base)` centraliza TODAS las sumas de puntaje y aplica el
  multiplicador de dificultad (combo, zona, rompible, pickups, pendrive)
- `StageSelectScene`: **tecla D cicla la dificultad** (persistida), indicador
  "DIFICULTAD: X" coloreado arriba a la izquierda + hint en el pie
- Verificado en Chromium headless: seleccionar Furia se guardó; al entrar,
  un grunt (base 60 hp / 8 daño) escaló a 108 hp / 13 daño, y `diffScore`=1.6;
  captura de la selección con "DIFICULTAD: FURIA" revisada; sin errores
- 6 tests en `DifficultyManifest.test.ts` (multiplicadores crecientes, lookup
  con fallback, ciclo con wrap, persistencia + saneo de id inválido)

### HITO 044 — Barra de vida dedicada del jefe + pulido de fases ✅
- `systems/BossBar.ts` (puro): `bossBarView(input)` decide visibilidad, label
  (bossLabel/miniBossLabel según kind), fracción clampada 0..1 y flag enraged;
  `bossBarColor(fraction, enraged)` (verde→ámbar→rojo, rojo intenso si
  enfurecido). Solo visible en zona boss/mini_boss en fase de combate con jefe
  vivo
- `GameScene`: barra superior centrada (label + fondo + relleno que sigue
  hp/maxHp del jefe); `updateBossBar(zoneKind)` busca el enemigo tipo
  boss/miniboss de la zona activa; el banner de objetivo deja de duplicar el
  nombre del jefe (la barra lo posee); el mensaje de fase 2 pasó a un
  `flashBanner` transitorio ("¡EL JEFE SE ENFURECE!") que se desvanece
- **Bugfix TDZ**: los campos `static` de geometría leían `GAME_WIDTH` al
  evaluar la clase → crash "Cannot access 'p' before initialization" (GameConfig
  importa las escenas antes de declarar GAME_WIDTH); movidos a getter/campos de
  instancia computados en runtime
- Verificado en Chromium headless: barra llena con "¡EL CAPATAZ NOCTURNO!",
  y al 35% + enfurecido la barra se encoge a rojo intenso con el flash de
  fase 2; sin errores de runtime
- 8 tests en `BossBar.test.ts` (visibilidad por kind/fase/jefe, label por
  kind, clamp de fracción, flag enraged, colores por HP y enraged)

### HITO 045 — Feedback de impacto escalado por combo ✅
- `systems/ComboFeedback.ts` (puro): `impactScale(mult)` (x1→1.0 … x4→1.6)
  para el tamaño del VFX de golpe; `crossedComboBand(count)` (true al cruzar
  5/10/20/30, coincide con un aumento real de multiplicador); `usesHeavyShake`
  (shake medio desde x2)
- `GameScene`: cada golpe conectado usa `impactScale(mult)` como `scaleMul`
  del VFX de impacto y el shake según el multiplicador; al cruzar una banda,
  `comboBandFlash()` dispara un flash de cámara + sonido + un pop más grande
  del contador
- Verificado en Chromium headless (instrumentando `cameras.main.flash`):
  golpeando una multitud el combo subió a 24 (×3) y el flash disparó **3
  veces** (bandas 5/10/20); HUD "16 HITS x2 / ¡QUÉ MÁQUINA!" revisado; sin
  errores de runtime
- 6 tests en `ComboFeedback.test.ts` (escala monótona, cruce de bandas exacto
  y consistente con `comboMultiplier`, shake pesado desde x2)

### HITO 046 — Números de daño flotantes ✅
- `systems/DamageNumbers.ts` (puro): `damageStyle(damage)` mapea el daño a
  color+tamaño por bandas — blanco chico (<10), ámbar (10-17), naranja (18-29),
  rojo grande (≥30); presentación testeable sin Phaser
- `GameScene`: al conectar un golpe a un enemigo vulnerable, `spawnDamageNumber`
  proyecta la posición a pantalla (con FLOOR_OFFSET) y crea un texto que sube
  y se desvanece (jitter horizontal para que no se apilen); también en el
  especial radial (30 por enemigo); solo se muestra si el enemigo era
  vulnerable (no números en frames invulnerables)
- Verificado en Chromium headless: golpeando una multitud se generaron 15
  números en pocos golpes; captura con "16" y "10" flotando sobre los
  enemigos + chispas; sin errores de runtime
- 4 tests en `DamageNumbers.test.ts` (4 bandas de color distintas, tamaño
  no-decreciente, banda máxima, límites de banda)

### HITO 047 — Barra de progreso del escenario (mini-mapa de zonas) ✅
- `systems/StageProgress.ts` (puro): `progressFraction(playerX, laneMaxX)`
  (0..1 clampado), `zoneMarkers(zones, laneMaxX, currentZoneIndex)` (posición
  normalizada + kind + cleared por índice) y `zoneMarkerColor(kind, cleared)`
  (boss rojo, mini-boss naranja, emboscada magenta, oleada gris, despejada
  verde)
- `WaveSystem`: nuevo getter `currentZoneIndex` (las zonas por debajo están
  despejadas)
- `GameScene`: barra fina al pie con pista, marcadores por zona (los de jefe
  más altos) y punto amarillo del jugador; redibujada cada frame en `update`
- Verificado en Chromium headless: al teleportar al jugador a mitad del nivel
  (zoneIndex 2) el punto se movió al centro, apareció un marcador verde
  (despejado) y los marcadores naranja (mini-boss) y rojo (boss) a la derecha;
  captura revisada; sin errores de runtime
- 7 tests en `StageProgress.test.ts` (fracción con clamp y lane degenerada,
  normalización + cleared por índice, todas despejadas pasado el final,
  colores distintos por kind y cleared, integridad con un escenario real)

### HITO 048 — Flecha de guía "→ SEGUÍ" ✅
- `systems/GuidanceArrow.ts` (puro): `showGuidance(input)` decide mostrar la
  flecha solo mientras se viaja (`traveling`) sin enemigos vivos, no en pausa,
  no terminado el escenario, y con camino por delante (a > `GUIDANCE_END_MARGIN`
  del final)
- `GameScene`: flecha pulsante "→ SEGUÍ" en el borde derecho (tween de vaivén);
  `updateGuidance()` la muestra/oculta cada frame según la regla
- Verificado en Chromium headless: al viajar sin enemigos la flecha es visible
  (true) y al aparecer un enemigo se oculta (false); captura revisada (ajustada
  la posición para que no se recorte); sin errores de runtime
- 5 tests en `GuidanceArrow.test.ts` (muestra al viajar con camino, oculta al
  pelear / con enemigos / en pausa / terminado / cerca del final)

### HITO 049 — Bonus de "Zona Perfecta" ✅
- `systems/ZoneBonus.ts` (puro): `zoneClearReward(tookDamage)` → base 200
  siempre + 300 extra si se despejó la zona sin recibir daño; constantes
  `ZONE_CLEAR_BASE`/`ZONE_PERFECT_BONUS`
- `GameScene`: bandera `tookDamageThisZone` (se resetea al bloquear la cámara
  al iniciar cada zona, se marca en `damagePlayer`, se limpia al reiniciar el
  run); al despejar una zona usa `zoneClearReward` y, si fue perfecta, muestra
  el flash verde "¡ZONA PERFECTA! +$N" (recompensa escalada por dificultad);
  `flashBanner` ahora acepta color
- Verificado en Chromium headless: despejar la zona 1 recibiendo daño dio solo
  +200; simulando un clear sin daño dio +500 (200+300) con el flash verde
  "¡ZONA PERFECTA! +$300"; captura revisada; sin errores de runtime
- 3 tests en `ZoneBonus.test.ts` (solo base con daño, base+bonus impecable,
  el impecable siempre paga más)

### HITO 050 — Racha de zonas perfectas + contador persistente + logro ✅
- `ZoneBonus.ts`: `perfectStreakMultiplier(streak)` (1ª ×1, 2ª ×1.5, 3ª+ ×2
  con tope); `zoneClearReward(tookDamage, streak)` ahora devuelve la nueva
  racha y el multiplicador, y aplica el multiplicador al bonus perfecto;
  recibir daño rompe la racha
- `CampaignProgress`: nuevo `perfectZones` (contador de por vida, saneado) +
  `recordPerfectZone()` (carga, incrementa, guarda)
- `GameScene`: `perfectStreak` por run (reset al recibir daño-rompe-zona y al
  reiniciar); al despejar una zona perfecta guarda el contador y muestra el
  flash "¡ZONA PERFECTA xN! +$M" con el bonus escalado por racha y dificultad
- Logro **Intocable** (`AchievementManifest`): 10 zonas perfectas de por vida
  → $1200; `CampaignStats` expone `perfectZones` y la Libreta muestra
  "ZONAS PERFECTAS N"
- Verificado en Chromium headless: dos zonas perfectas seguidas → racha 1→2,
  score 500 → 1150 (bonus ×1.5 en la segunda), flash "¡ZONA PERFECTA x2!
  +$450", y `perfectZones` persistido = 2; sin errores de runtime
- Tests: multiplicador de racha 1/1.5/2 con tope y recompensa creciente
  (`ZoneBonus`), `recordPerfectZone` incrementa+persiste (`CampaignProgress`),
  logro Intocable a las 10 (`AchievementManifest`), `perfectZones` en stats

### HITO 051 — Enemigos elite (variantes duras por dificultad) ✅
- `systems/EliteSystem.ts` (puro): `eliteEveryN(difficultyId)` (Normal 0 / sin
  elites, Difícil cada 5, Furia cada 3); `isEliteSpawn(ordinal, everyN)`
  (promoción determinista del N-ésimo spawn regular); constantes de
  multiplicadores (HP ×2.2, daño ×1.4), escala (×1.22) y bonus de muerte (120)
- `EnemyEntity`: campos `elite`/`deathRewarded` + `makeElite(hpMult, dmgMult)`
  (escala HP/daño, idempotente)
- `GameScene`: contador de spawns regulares (`eliteSpawnOrdinal`), promueve a
  elite según la cadencia de la dificultad (solo enemigos comunes, no
  bosses/minibosses); render diferenciado sin desteñir el sprite — **más
  grande + aura roja en los pies**; bonus de guita una-sola-vez al caer un
  elite (escalado por dificultad)
- Verificado en Chromium headless (Furia): cadencia 3, los spawns 3° y 6°
  elite con HP 238 vs 108 y daño 18 vs 13; matar un elite dio +192 (120×1.6);
  aura roja visible en la captura; sin errores de runtime
- 5 tests en `EliteSystem.test.ts` (cadencia por dificultad, promoción cada N,
  frecuencia ~1/N, `makeElite` escala HP/daño y es idempotente)

### HITO 052 — Etiqueta flotante "ELITE" sobre enemigos elite ✅
- `GameScene`: pool paralelo `enemyLabels` (un `Text` por enemigo, oculto por
  defecto); se muestra en rojo con contorno oscuro solo sobre elites, flotando
  justo encima de la barra de HP con un leve bob senoidal para legibilidad; se
  oculta al morir el enemigo o si deja de ser elite
- Complementa el render de Hito 051 (aura roja + escala) dando identificación
  textual inmediata de la amenaza, sin desteñir el sprite
- Verificado en Chromium headless: grunts promovidos a elite muestran la
  etiqueta roja "ELITE" sobre la cabeza junto al aura en los pies; sin errores
  de runtime; 419 tests, typecheck/build limpios

### HITO 053 — Paleta de enemigos por escenario (arte por nivel, palette-swap) ✅
- Comienzo del bloque **A** (arte de enemigos por nivel). La campaña reutiliza
  el mismo elenco de sheets en los 10 niveles; sin tratamiento, todos los mobs
  se ven idénticos. Solución in-engine, determinista y testeable: tinte de
  color por escenario (técnica clásica de palette-swap de beat'em up)
- `systems/EnemyPalette.ts` (puro): `STAGE_ENEMY_PALETTES` (un tinte + tema por
  cada uno de los 10 niveles, todos cerca del blanco para recolorear suave sin
  oscurecer); `paletteForStage(id)` (con fallback neutro); `scaleColor(color,
  factor)` (multiplica canales RGB con clamp); `spriteVariant(spriteKey)`
  (factor de brillo determinista 0.86–1.0 por sheet para que el mob de un nivel
  no sea un bloque de color uniforme); `enemyTint(stageId, spriteKey)`
- `GameScene`: el sprite del enemigo lleva su tinte de escenario en vez de
  `clearTint()` neutro; el flash de daño (hurt) sigue teniendo prioridad
- Verificado en Chromium headless: Once con cast cálido/marrón vs Estación
  Oxidada con cast oxidado/naranja — distinción visible por nivel, sin
  oscurecer el arte; sin errores de runtime
- 6 tests en `EnemyPalette.test.ts` (paleta por nivel, unicidad de tintes,
  `scaleColor` con clamp, `spriteVariant` en rango y variando, `enemyTint`
  varía por sprite dentro del nivel y por nivel para el mismo sprite)

### HITO 054 — Tono por arquetipo sobre el tinte de escenario (bloque A) ✅
- `EnemyPalette`: `archetypeTone(type)` — sesgo de brillo por arquetipo para
  reforzar la lectura de silueta (tank 0.9 más pesado/oscuro, speedster 1.06
  más claro/rápido, zoner 0.96; grunt/miniboss/boss neutros = 1). `enemyTint`
  ahora acepta `type` opcional y multiplica `spriteVariant × archetypeTone`
- `GameScene`: pasa `enemy.type` al calcular el tinte, así el tipo de enemigo
  se distingue de un vistazo sobre la identidad de color del nivel
- Extiende el pipeline de tinte ya verificado visualmente (mismo camino de
  render, solo cambia el factor calculado); +2 tests en `EnemyPalette.test.ts`
  (tono por arquetipo, `enemyTint` varía por tipo con mismo sprite/nivel)

### HITO 055 — Esquiva / rodada con i-frames (bloque B) ✅
- Inicio del bloque **B** (profundidad de combate). Primera mecánica: esquiva
  evasiva con frames de invulnerabilidad
- Input: nueva acción `dodge` (teclado **O**, gamepad **L1**; ambos libres)
- `PlayerStateMachine`: estado `DODGE` (18 frames, i-frames en frames 1–11),
  `isDodging()`, `isInvulnerable()`; se dispara desde IDLE/WALK/RUN (no
  cancela ataques), mira la dirección del input y emite evento `dodge`
- `GameScene`: `startDodgeRoll` aplica un burst de 640 en la dirección de
  encare (+ componente de profundidad con arriba/abajo) que desliza con
  fricción; `damagePlayer` ignora el golpe durante `isInvulnerable()` (con
  SFX de esquiva); tinte celeste + fantasmeo del sprite durante el roll
- `SoundBank`: SFX `dodge` (whoosh: ruido corto + barrido de seno)
- `TitleScene`: la ayuda de controles ahora lista `O = ESQUIVAR`
- Verificado en Chromium headless (prueba directa en la escena viva): tras
  pulsar O el estado pasa a `dodge` e `isInvulnerable()` = true; `damagePlayer`
  se anula durante los i-frames (HP intacto) y vuelve a aplicar al terminar la
  ventana (100→75, estado `hurt`)
- 6 tests nuevos en `PlayerStateMachine.test.ts` (entra desde IDLE/WALK/RUN,
  encara el input, ventana de i-frames, vuelve a IDLE y bloquea movimiento, no
  arranca en pleno ataque)

### HITO 056 — Overhaul de legibilidad y calibración de escala ✅
- Respuesta directa al feedback: "personajes semi-invisibles" y "objetos
  demasiado grandes comparados con los personajes". Diagnóstico anclado en
  evidencia (capturas headless) y en números del código, no de memoria
- **Legibilidad de personajes:** rim-light aditivo cálido detrás de Mostasa y
  de cada enemigo (sprite duplicado sincronizado por frame, tinte `0xffd9a0`,
  blend ADD, escala ×1.08) que separa las siluetas del fondo fotorrealista;
  sombras de contacto en dos capas (pool suave + núcleo oscuro) que anclan a
  los personajes al piso. Helpers `createOutlineSprite`/`syncOutline`
- **Calibración de escala:** los rompibles se renderizaban a escala nativa
  (frame 362×181 → ~2× el héroe). Nuevo `BREAKABLE_RENDER_SCALE = 0.5` los
  deja a la altura de la cintura. Props reducidos un 28 % global
  (`PROP_SCALE_MULT = 0.72` en `PropSystem`) para que dejen de tapar la escena
- Verificado en Chromium headless con el jugador + grunt + tank ubicados junto
  a un cajón: antes el cajón medía casi el doble que Mostasa y los personajes
  eran manchas oscuras; después el cajón queda a la cintura, los props en
  escala de fondo y los personajes se leen nítidos con borde cálido y sombra
- Honestidad: parte de los objetos grandes están *pintados dentro* de los
  paneles de fondo (imagen plana) y no se pueden reescalar por objeto sin
  regenerar ese arte; esta pasada corrige todo lo que se renderiza por separado
- Sin cambios de lógica pura → sin tests nuevos; 433 tests siguen en verde,
  typecheck/build limpios

### HITO 057 — Presencia en pantalla: escala de personajes + exposición ✅
- Segunda pasada tras el rechazo del resultado anterior. Diagnóstico honesto:
  el problema dominante no eran los props sino que **los personajes eran
  miniaturas** (~18 % de la altura del cuadro con el aire interno del frame;
  un beat'em up clásico usa 28–35 %) y además se renderizaban subexpuestos
  frente a los fondos fotorrealistas
- **Escala:** `PLAYER_SPRITE_SCALE` 0.9 → 1.45 y `ENEMY_SCREEN_HEIGHT_K`
  1.9 → 3.05 (misma proporción relativa jugador/enemigos). Mostasa pasa a
  ~38 % de la pantalla: presencia de protagonista
- **Exposición:** overlay aditivo del propio sprite encima de cada personaje
  (`createLiftSprite`/`syncLift`, alpha 0.26) que levanta su iluminación a
  "sujeto iluminado" sin tocar el arte fuente; respeta el alpha del sprite
  (parpadeo de i-frames)
- Sombras del jugador ampliadas al nuevo tamaño; barra de HP enemiga ahora
  relativa a `sprite.displayHeight` (sigue la cabeza a cualquier escala)
- Verificado en Chromium headless a 1280×720 nativo: Mostasa (camisa clara),
  grunt (chaleco) y tank (negro) se leen nítidos, iluminados y con escala de
  género junto al cajón (ahora a la rodilla); sin errores de runtime
- Render puro → sin tests nuevos; 433 tests en verde, typecheck/build limpios

### HITO 058 — Sprites rotos: re-segmentación y reempaquetado de las hojas ✅
- Respuesta al reclamo "el sprite de los personajes no es completo, se siguen
  viendo con bugs". Causa raíz confirmada mirando las hojas: **el arte subido
  no está alineado a la grilla fija de 140px** que asumía el juego (cada fila
  tiene ~9-14 figuras en posiciones irregulares, bandas de altura irregular y
  líneas separadoras dibujadas encima de las figuras cada 140px). Cortar con
  grilla fija producía cuerpos cortados + pedazos del frame vecino
- **`scripts/png-lib.mjs`**: codec PNG compartido (decode RGB/RGBA, encode
  RGBA), extraído del procesador existente
- **`scripts/process-sprites.mjs`**: nuevo paso `inpaintGridLines` — repinta
  las franjas de ±3px en cada múltiplo de 140 (filas y columnas) interpolando
  desde los vecinos, antes del key-out; elimina las líneas que cruzaban a los
  personajes por el pecho
- **`scripts/normalize-sprites.mjs`** (nuevo): re-segmenta cada hoja keyed por
  **componentes conectados** (vecindario 5×5 puentea el anti-aliasing),
  re-adjunta fragmentos huérfanos (un puño extendido, un zapato) al cuerpo más
  cercano, divide componentes anómalamente altos (dos figuras pegadas) por su
  costura más débil, agrupa las figuras en filas por centro vertical y
  reempaqueta TODO en celdas uniformes con los pies anclados al fondo de la
  celda, ciclando los frames de cada fila para llenar todas las columnas
- Resultado: las 11 hojas quedan en grillas limpias (Mostasa 10×9 de 122×210,
  comunes 9-10 columnas, etc.) con una figura completa por celda
- `AnimationData`: `CHARACTER_GRIDS` regenerado desde la salida del
  normalizador; `MOSTASA_ANIMS` remapeado al layout real de 9 filas (idle,
  walk, dash/jab, puños, patadas, avance/guardia, hurt, down+crawl+rise,
  victoria) con sub-rangos por golpe (light_1 = jab 0-4, light_2 = 5-9,
  light_3/heavy = patadas, special = fila victoria); enemigos remapeados
  (hurt/down/get_up ahora usan las filas reales de caída/arrastre/levantada);
  clip `dodge` nuevo
- `GameScene`: rim-outline **eliminado** (a escala grande producía un
  duplicado fantasma del personaje — diagnosticado con capturas por capas);
  la legibilidad la dan el lift de exposición + sombras; `SPRITE_ORIGIN_Y`
  0.98 (pies al fondo de la celda normalizada), `PLAYER_SPRITE_SCALE` 1.3,
  `ENEMY_SCREEN_HEIGHT_K` 3.0
- Tests: `AnimationData.test.ts` reescrito — ahora valida que **cada grilla
  embaldosa exactamente su PNG real** (lee el header del archivo) y que cada
  clip cabe en la grilla de cada hoja que lo usa (mapeo por `enemyAnimsFor`)
- Verificado en Chromium headless con primeros planos: Mostasa completo y
  limpio en idle/caminata/golpe (sin fantasma, sin líneas, sin fragmentos);
  grunt y tank completos y animados en la toma amplia
- `npm run sprites:build` = process + normalize (pipeline reproducible)
- 432 tests en verde; typecheck/lint/build limpios

## HITOS PENDIENTES

- ... (hitos 052-060)

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
| PlayerStateMachine.test.ts      | 59     | ✅ OK  |
| EnemyStateMachine.test.ts       | 35     | ✅ OK  |
| CombatSystem.test.ts            | 26     | ✅ OK  |
| AnimationData.test.ts           | 23     | ✅ OK  |
| AssetSystems.test.ts            | 20     | ✅ OK  |
| WaveSystem.test.ts              | 10     | ✅ OK  |
| RankSystem.test.ts              | 8      | ✅ OK  |
| EnemyAttack.test.ts             | 10     | ✅ OK  |
| SoundBank.test.ts               | 12     | ✅ OK  |
| AudioSystem.test.ts             | 4      | ✅ OK  |
| AudioSettings.test.ts           | 6      | ✅ OK  |
| StoryManifest.test.ts           | 3      | ✅ OK  |
| ShopManifest.test.ts            | 11     | ✅ OK  |
| ComboSystem.test.ts             | 9      | ✅ OK  |
| CampaignStats.test.ts           | 5      | ✅ OK  |
| AchievementManifest.test.ts     | 8      | ✅ OK  |
| DifficultyManifest.test.ts      | 6      | ✅ OK  |
| BossBar.test.ts                 | 8      | ✅ OK  |
| ComboFeedback.test.ts           | 6      | ✅ OK  |
| DamageNumbers.test.ts           | 4      | ✅ OK  |
| StageProgress.test.ts           | 7      | ✅ OK  |
| GuidanceArrow.test.ts           | 5      | ✅ OK  |
| ZoneBonus.test.ts               | 5      | ✅ OK  |
| EliteSystem.test.ts             | 5      | ✅ OK  |
| EnemyPalette.test.ts            | 8      | ✅ OK  |
| BossAI.test.ts                  | 11     | ✅ OK  |
| PropManifest.test.ts            | 8      | ✅ OK  |
| CampaignProgress.test.ts        | 11     | ✅ OK  |
| StageData.test.ts               | 34     | ✅ OK  |
| **Total**                       | **432**| ✅ OK  |

---

## LIMITACIONES DE LA BUILD ACTUAL

1. Sin sprites finales (placeholders rectangulares)
2. Audio 100% procedural (WebAudio sintetizado); faltan assets de audio finales
3. Sin combate funcional (solo movimiento)
4. Sin enemigos
5. Sin máquina de estados del jugador
6. Sin waves ni sistema de combate
