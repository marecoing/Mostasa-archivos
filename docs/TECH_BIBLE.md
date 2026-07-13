# TECH BIBLE

## Stack
- TypeScript 5.5 (strict)
- Phaser 4.2.1 (WebGL)
- Vite 5.4
- Vitest 2
- ESLint 9 (flat config) + Prettier 3

## Física 2.5D
- X: desplazamiento horizontal
- Y: profundidad en el plano caminable
- Z: altura sobre el suelo
- depthScale: 0.60
- Fixed timestep: 60 Hz
- Gravedad Z: -1800 px/s²

## Comandos
- `npm run dev` — servidor de desarrollo
- `npm run typecheck` — verificación de tipos
- `npm run lint` — linting
- `npm run test` — tests
- `npm run build` — build de producción
- `npm run check` — typecheck + lint + test + build

## Persistencia
- localStorage (settings simples)
- IndexedDB (saves, perfiles)

## Backend (futuro)
- POST /api/checkout/create
- GET /api/entitlements/status
- POST /api/payments/webhook
