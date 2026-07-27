# Entrega de arte modular de Mostasa

Esta carpeta contiene la entrega final definida por
[`docs/PLIEGO-DE-ARTE.md`](../../docs/PLIEGO-DE-ARTE.md). Los únicos PNG de
entrega son las ocho piezas corporales que consume el rig.

| Archivo | Lienzo | Pivote padre | Articulación hija |
| --- | ---: | ---: | ---: |
| `cabeza.png` | 221 × 219 | 113, 118 | — |
| `torso.png` | 227 × 480 | 114, 139 | 114, 427 |
| `brazo.png` | 145 × 280 | 72, 53 | 72, 233 |
| `antebrazo.png` | 113 × 265 | 55, 45 | 55, 213 |
| `mano.png` | 133 × 102 | 64, 18 | — |
| `muslo.png` | 169 × 386 | 84, 69 | 84, 339 |
| `pantorrilla.png` | 136 × 329 | 74, 47 | 74, 287 |
| `borcegui.png` | 205 × 195 | 75, 120 | — |

## Contrato de integración

- PNG RGBA de 8 bits, transparencia real y 18 px de aire mínimo.
- Resolución de autoría: 600 px/m.
- Contorno cerrado de 13 px en `#11141d`.
- Colores limitados a la paleta cerrada de `src/game/art/Palette.ts`.
- La cabeza y el borceguí miran a la derecha.
- Los miembros se autoran con la articulación padre arriba y el hueso hacia
  abajo.
- El torso se entrega pelvis→hombros: por eso su orientación de archivo está
  invertida verticalmente respecto de una prenda vista de pie.
- El lado lejano reutiliza estas mismas piezas y lo oscurece el motor.

`manifest.json` registra dimensiones, pivotes, articulaciones, colores,
límites opacos y SHA-256 de cada fuente y salida.

## Reproducción y validación

```powershell
npm.cmd run arte:procesar
npm.cmd run arte:validar -- assets/entrega-mostasa
```

Las fuentes seleccionadas, el alfa extraído y el juego de prompts están en
`assets/source/mostasa-parts/`.
