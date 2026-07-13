# MOSTASA'S RAGE — PRODUCTION STATE

## Versión actual: 0.1.0
## Última actualización: 2026-07-13
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

## HITOS PENDIENTES

- HITO 011 — Máquina de estados del jugador
- HITO 012 — Debug overlay y volúmenes F2
- HITO 011 — Debug overlay y volúmenes F2
- HITO 012 — AttackDefinition data-driven
- ... (hitos 013-060)

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

| Archivo                         | Tests | Estado |
|---------------------------------|-------|--------|
| Physics25D.test.ts              | 24    | ✅ OK  |
| CameraSystem.test.ts            | 18    | ✅ OK  |
| Pushbox.test.ts                 | 17    | ✅ OK  |
| **Total**                       | **59**| ✅ OK  |

---

## LIMITACIONES DE LA BUILD ACTUAL

1. Sin sprites finales (placeholders rectangulares)
2. Sin audio (SFX ni música)
3. Sin combate funcional (solo movimiento)
4. Sin enemigos
5. Sin máquina de estados del jugador
6. Sin waves ni sistema de combate
