# GAP ANALYSIS — Biblia Maestra v3.0 vs. estado real (FASE 0)

Fecha: 2026-07-15. Método: lectura completa de la Biblia + relevamiento
exhaustivo de la carpeta Drive (ver `assets/DRIVE_INVENTORY.json`).

## 1. Matriz por área

| Área (Biblia §) | Requerido para 1.0 | Estado real | Cobertura |
|---|---|---|---|
| Proyecto Phaser 4 + Vite + TS (§1, §28) | Sí | No existe package.json ni src/ | 0% |
| Scenes Boot/Preload/Menu/Gameplay… (§28) | 8 scenes | Nada | 0% |
| Física 2.5D X/Z/Y, 60 Hz fijo (§8) | Sí | Nada | 0% |
| Combate (§9): combos, bronca, hitstop | Sí | Nada | 0% |
| IA (§10): fichas, 11 arquetipos, 16 estados | Sí | Nada | 0% |
| Oleadas/zonas (§11) | Sí | Nada | 0% |
| Datos de personajes (§16): 101 CharacterDefinition | 101 | 0 definiciones de datos | 0% |
| **Arte personajes (§15, §18)** | 101 hojas 12×8 aprobadas | 12 referencias canónicas (paso A) de 000–010 + ~90 raw sin triage | ~11% del paso A; 0% de hojas |
| **Arte escenarios (§14, §21)** | 10 escenarios, 5 paneles c/u | 10 strips 5120×1024 + 50 paneles 1024×1024 declarados (verificado 01-once) + manifest | ~80% material base; 0% capas parallax/colisiones |
| **Objetos (§13)** | pickups, armas, destruibles, props, UI, VFX | 61 sprites con manifest y metadata de gameplay | Alta para demo; sin validación §20 |
| Audio (§22) | música, SFX, voces | Nada | 0% |
| UI/UX (§23) | 14 pantallas + HUD | Solo 5 íconos de HUD | ~5% |
| Guardado (§25) | IndexedDB, 3 slots | Nada | 0% |
| Backend comercial (§26) | 8 endpoints | Nada (demo no lo requiere) | 0% |
| Localización (§34) | es-AR, en, pt-BR | Nada | 0% |
| Tests (§31) / CI (§30) | unit+integración+E2E | Nada | 0% |
| Legal (§35) | revisión marcas/rostros | Pendiente revisión visual de assets | 0% |

## 2. Gaps específicos numerados

**GAP-01 — IDs de escenarios inconsistentes (bloqueante para FASE 5).**
La Biblia §14 define: `once, constitucion, barrio_31, palermo, obelisco,
microcentro, puerto_madero, conurbano_industrial, congreso, casa_rosada`.
El `scenario-manifest.json` de Drive usa: `01-once, 02-estacion-oxidada,
03-pasillo-del-conurbano, 04-palermo-de-carton, 05-avenida-de-la-protesta,
06-catalinas-del-humo, 07-puerto-del-country, 08-galpon-del-acceso,
09-pasillos-del-poder, 10-casa-rosada-final`. Temáticamente alineados 1-a-1,
pero los IDs difieren. Propuesta (decisión D-02): tabla de mapeo en
`src/data/stages/stageManifest.ts` con ID canónico de la Biblia como clave y
`artBundleId` apuntando al ID del manifest de Drive. No renombrar archivos.

**GAP-02 — Personajes: solo paso A del pipeline (§18) y solo Escenario 1.**
Existen referencias canónicas de 000–010. Faltan: tiras de 8 frames por
animación (paso B), ensamblado/atlas (paso C), y todo 011–100. Las ~90
imágenes raw en `generated_images/` no están clasificadas ni nombradas por
personaje/animación → requieren triage antes de contar como avance.

**GAP-03 — Sin proyecto de código.** Fases 1–4 completas por hacer. Ninguna
línea de TypeScript existe.

**GAP-04 — Sin validación de assets (§20).** Ningún reporte en
`reports/art-validation/`. Los 61 objetos y 10 escenarios están "generated"
pero no "approved" según los estados del §19.

**GAP-05 — Duplicación characters/ vs enemies/.** Los PNG 01–10 están dos
veces (mismos bytes, distinto fileId). Definir fuente única en FASE 1
(propuesta: `assets/raw/characters/`; enemies/ queda como legado, no se borra).

**GAP-06 — Estructura de carpetas.** El Drive no sigue `assets/raw/...` de la
Biblia §28 (usa carpetas con timestamp `scenarios_20260713_1348`). Migración
no destructiva al integrar (conservar originales, según regla principal de la
Biblia).

**GAP-07 — Audio, guardado, backend, localización, accesibilidad:** 0%.
Esperado para esta etapa; se cubren en FASES 6–8.

## 3. Riesgos

| ID | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | Codificar FASE 5 contra IDs de Drive y romper con la Biblia | Alta | Alto | Resolver GAP-01 en FASE 1 (tabla de mapeo data-driven) |
| R2 | Asumir que las referencias canónicas son hojas jugables | Media | Alto | Estados de asset §19 en manifest local; Mostasa necesita hoja 12×8 antes de FASE 6 |
| R3 | API de Phaser 4 distinta a lo asumido | Media | Medio | Fijar versión exacta + lockfile + smoke test en FASE 1 |
| R4 | Assets con defectos (magenta residual, logos, extras) llegan al build | Media | Alto | Implementar validación §20 antes de integrar arte |
| R5 | Pérdida de trazabilidad Drive↔repo | Baja | Medio | `DRIVE_INVENTORY.json` versionado; nunca renombrar en Drive |
| R6 | Costo de generación masiva sin control | Media | Alto | Respetar §19: dry-run + SPRITE_MAX_COST_USD antes de lotes |

## 4. Trabajo aprovechable (no rehacer)

- 10 strips + 50 paneles de escenarios: base visual completa de fondos.
- 61 sprites de objetos con metadata de gameplay lista para `itemManifest.ts`.
- 12 referencias canónicas del cast completo del Escenario 1 (demo).
- 2 manifiestos JSON existentes que ya siguen filosofía data-driven de la Biblia.
