# ADR 001 — Usar Phaser 4.2.1

**Estado**: Aceptado
**Fecha**: 2026-07-13

## Decisión
Usar Phaser 4.2.1 como engine de rendering y game loop.

## Contexto
El documento maestro especifica Phaser 4.2.x. La versión 4.2.1 es la más reciente estable en npm al momento de implementación.

## Consecuencias
- API muy similar a Phaser 3 con mejoras de rendimiento
- WebGL como renderer principal
- Sound Manager integrado
- Input unificado (teclado, gamepad)
- La física 2.5D X/Y/Z es propia (no usa Arcade Physics de Phaser para Z)
