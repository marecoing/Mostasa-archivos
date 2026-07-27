# Fuentes de las piezas de Mostasa

Esta carpeta conserva la trazabilidad de la entrega de
`assets/entrega-mostasa/`.

- `imagegen/`: fuentes seleccionadas, una imagen por pieza, producidas con la
  herramienta integrada ImageGen sobre croma verde.
- `alpha/`: mismas fuentes después de extracción local de croma con
  `remove_chroma_key.py`, `--auto-key border`, `--soft-matte` y `--despill`.
- `PROMPTS.md`: especificaciones creativas utilizadas para cada pieza.

Los PNG de `alpha/` no son los archivos de integración. El procesador
determinista `scripts/process-mostasa-parts.mts` los registra en el lienzo
oficial, recompone el contorno de 13 px, elimina ruido cromático y cuantiza a
la paleta cerrada.

No editar a mano los PNG de `assets/entrega-mostasa/`: cualquier corrección
debe hacerse en la fuente o en el procesador y luego volver a validar.
