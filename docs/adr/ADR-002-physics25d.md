# ADR 002 — Física 2.5D propia

**Estado**: Aceptado
**Fecha**: 2026-07-13

## Decisión
Implementar física X/Y/Z propia desacoplada de Arcade Physics de Phaser.

## Contexto
Phaser tiene Arcade Physics para colisiones 2D, pero el juego necesita un eje Z para saltos, gravedad y proyección 2.5D. Mezclar el sistema de Phaser con un eje Z custom sería frágil.

## Consecuencias
- `Physics25D.ts` contiene toda la matemática vectorial
- Fixed timestep 60Hz con acumulador garantiza determinismo
- Renders interpolados opcionales para fluidez visual
- Tests unitarios verifican cada función matemática
- Hitboxes y hurtboxes también son custom en X/Y/Z
