# MOSTASA'S RAGE: CIUDAD DE LA FURIA

Beat'em up 2.5D de comedia negra argentina. Buenos Aires, 2026.

## Requisitos

- Node.js 20+
- npm 10+

## Instalación

```bash
npm install
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo en `http://localhost:3000` |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Preview del build en `http://localhost:4000` |
| `npm run typecheck` | Verificación de tipos TypeScript |
| `npm run lint` | Linting con ESLint |
| `npm run test` | Tests con Vitest |
| `npm run check` | typecheck + lint + test + build |

## Controles

| Tecla | Acción |
|-------|--------|
| A / ← | Izquierda |
| D / → | Derecha |
| W / ↑ | Hacia atrás (profundidad) |
| S / ↓ | Hacia adelante (profundidad) |
| Espacio | Saltar |
| J | Ataque ligero |
| K | Ataque fuerte |
| L | Especial |
| Shift | Correr |
| F1 | Toggle debug overlay |
| Escape | Volver al título |
| Enter | Confirmar / iniciar |

## Estado del proyecto

Ver `docs/PRODUCTION_STATE.md` para el estado actual de los hitos.

Hitos implementados: **001-005** (base jugable mínima)

## Stack

- TypeScript 5.5 (strict)
- Phaser 4.2.1 (WebGL)
- Vite 5.4
- Vitest 2

## Estructura

```
src/
  main.ts                    — Entry point
  game/
    config/GameConfig.ts     — Configuración de Phaser
    core/Physics25D.ts       — Sistema de física 2.5D (X/Y/Z)
    scenes/
      BootScene.ts           — Inicialización
      PreloadScene.ts        — Carga de assets
      TitleScene.ts          — Pantalla de título
      GameScene.ts           — Escena de juego principal
docs/
  PRODUCTION_STATE.md        — Estado de producción
  GAME_BIBLE.md, TECH_BIBLE.md, ...
production/
  BACKLOG.md                 — Backlog de hitos
  ASSET_MANIFEST.json        — Registro de assets
tests/
  unit/Physics25D.test.ts    — Tests de física
```

## Notas legales

- Todos los personajes son ficticios
- No se usan marcas reales, clubes reales ni semejanzas de celebridades
- Las figuras políticas son personajes de comedia ficticios
