# STATUS — Mostasa's Rage: Ciudad de la Furia

Fecha: 2026-07-15
Fase actual: **FASE 0 — AUDITORÍA (completada en esta sesión)**
Fuente de verdad: `docs/BIBLIA_MAESTRA.txt` (v3.0)

## Resumen ejecutivo

El "repositorio" recibido (carpeta de Google Drive `MOSTASAS RAGE`) es una
**biblioteca de assets visuales pre-generados, sin código**. No existe todavía
proyecto Phaser/Vite/TypeScript, ni backend, ni tests, ni CI. El material de
arte cubre parcialmente FASE 5/6 (fondos de los 10 escenarios, referencias
canónicas de los 11 personajes del Escenario 1, ~61 sprites de objetos) pero
ninguna fase de código (1–4) tiene avance.

## Completado (verificado)

- Biblia Maestra v3.0 leída completa (2063 líneas, 42 secciones) y copiada a `docs/BIBLIA_MAESTRA.txt`.
- Inventario completo de la carpeta Drive con fileIds → `assets/DRIVE_INVENTORY.json`.
- Manifiestos de Drive relevados y espejados → `assets/raw/manifests/`.
- Gap analysis Biblia vs. estado real → `docs/production/GAP_ANALYSIS.md`.
- Plan de implementación por fases → `docs/production/IMPLEMENTATION_PLAN.md`.
- Conflictos documentales registrados → `docs/production/DECISIONS.md`.
- Repositorio git local inicializado con commit de FASE 0.

## Estado de build (evidencia real)

```
$ npm run build   → npm error ENOENT: no existe package.json
$ npm test        → npm error ENOENT: no existe package.json
```

**Build base: NO EXISTE.** No es un fallo: es el hallazgo esperado de la
auditoría. El primer build verde es el criterio de salida de FASE 1.

## Estado de tests

Sin suite. `tests/` no existe. Cobertura 0%. Se crea en FASE 1.

## Toolchain disponible (verificado en este entorno)

| Herramienta | Versión | Estado |
|---|---|---|
| Node.js | v22.22.2 | OK (≥18 requerido por Vite/Phaser) |
| npm | 10.9.7 | OK |
| git | 2.43.0 | OK |
| Python 3 | 3.12.3 | OK (scripts de pipeline de arte) |

## Errores / hallazgos abiertos

1. IDs de escenario del `scenario-manifest.json` no coinciden con los IDs
   canónicos de la Biblia (§14). Ver GAP-01 en GAP_ANALYSIS.md.
2. Las referencias de personajes existen solo para 000–010 (Escenario 1);
   ninguna tira de animación clasificada; ~90 imágenes raw sin triage.
3. Assets pesados (~500 MB estimados) viven solo en Drive; el repo local
   los referencia por fileId (decisión D-03).

## Riesgos principales (detalle en GAP_ANALYSIS.md §Riesgos)

- R1 (alto): arrancar FASE 5/6 sin resolver el mapeo de IDs de escenarios.
- R2 (alto): tratar las referencias canónicas como sprites jugables (no son
  hojas 12×8; solo cubren el paso A del pipeline §18).
- R3 (medio): Phaser 4 — fijar versión exacta y lockfile en FASE 1.
- R4 (medio): assets sin validación automática (§20) todavía.
- R5 (bajo): duplicación characters/ vs enemies/ (mismo contenido, doble fuente).

## Próximo paso exacto

**FASE 1 — FUNDACIÓN**: `npm create vite` + Phaser 4 + TS estricto, scenes
Boot/Preload/MainMenu/Gameplay, escala 1280×720, InputSystem, bus de eventos
tipados, carga de datos de balance, tests unitarios base y CI.
Comando sugerido para retomar: `/build-game next`

## Fuera de alcance de esta sesión (por instrucción del usuario)

Sin generación de imágenes, sin borrado de archivos, sin features nuevas.
Cumplido: solo lectura de Drive + documentación local.
