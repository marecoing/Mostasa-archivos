# Character atlas v2/v3 provenance

These files replace the damaged character sheets whose painted grid lines crossed the figures.
The legacy raw files remain under `assets/raw/characters/` for identity reference only.

## Generation

- Date: 2026-07-22
- Mode: built-in ImageGen edit workflow (`precise-object-edit`)
- Style contract: grounded semi-realistic painted characters for a gritty 1990s Argentine beat-em-up
- Background contract: flat `#00ff00`, no shadows, gradients, floor, text, watermark, or grid lines
- Frame contract: one complete, consistent character per cell; complete heads, feet, hands, and props; no cell-boundary crossings

Each `*-imagegen-source.png` is a project copy of the corresponding built-in output. The original
ImageGen output remains available through Codex's generated-images directory. Each `*-alpha.png`
was produced with the ImageGen skill's `remove_chroma_key.py` helper using border auto-key,
soft matte, thresholds 12/220, and despill.

| Character | Requested/reference grid | Built-in output | Project source |
|---|---:|---|---|
| Mostasa | 10x9 | `exec-05d15c3d-73b8-4715-9236-3f0f7426a7a6.png` | `mostasa-imagegen-source.png` |
| enemy_001 | 10x8 | `exec-dfb5d903-7752-492c-ad1d-2517583d1226.png` | `enemy_001-imagegen-source.png` |
| enemy_002 | 9x8 | `exec-60410b25-d7c1-4eb9-9c5b-4c2898334488.png` | `enemy_002-imagegen-source.png` |
| enemy_003 | 10x8, rows 6-7 contain 9 real poses | `exec-b5fa051c-ffe2-48a3-b1cf-f8711fe81095.png` | `enemy_003-imagegen-source.png` |
| enemy_004 | 9x9 | `exec-aba81e46-fda9-4506-9e7a-9b662e10aa6e.png` | `enemy_004-imagegen-source.png` |
| enemy_005 | 10x9 | `exec-b3c7b5ea-a267-4f7f-a68d-73f605b35246.png` | `enemy_005-imagegen-source.png` |
| enemy_006 | 10x9 | `exec-4ec51e68-b580-4e5e-ad3b-cbf3176c19f1.png` | `enemy_006-imagegen-source.png` |
| enemy_007 | 9x8 | `exec-79f270ef-3eab-42f3-b180-3f55463bad7c.png` | `enemy_007-imagegen-source.png` |
| enemy_008 | 10x8 | `exec-d87a783d-2067-4e91-8811-8ef26bf76945.png` | `enemy_008-imagegen-source.png` |
| enemy_009 | 8x11 real output | `exec-ed457398-4668-4fcd-9244-93c5bf250ef8.png` | `enemy_009-imagegen-source.png` |
| enemy_010 | 10x9 | `exec-89c80257-6e8b-469a-97c2-e9c63287c4d0.png` | `enemy_010-imagegen-source.png` |

## Atlas build

Run `npm run sprites:v2:build` to segment the alpha sources and rebuild all runtime atlases.
The v3 builder uses strict alpha-component counts, one isotropic scale per character, bottom-center
alignment, premultiplied-alpha bilinear resampling, and an 8 px transparent gutter. It never cycles
or duplicates poses. `enemy_003` explicitly declares two unused cells; no runtime clip references them.

Run `npm run sprites:v2:validate` to verify dimensions, occupancy, gutters, soft alpha, chroma residue,
duplicate frames, manifest consistency, and clip bounds.
