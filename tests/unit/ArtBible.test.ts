import { describe, expect, it } from 'vitest';
import {
  CHARACTER_HEIGHT_M,
  HEADS_TALL,
  HEAD_HEIGHT_M,
  HERO_HEIGHT_M,
  HERO_HEIGHT_PX,
  MAX_ONE_HANDED_LENGTH_M,
  OBJECT_HEIGHT_M,
  OUTLINE_WIDTH_PX,
  PIXELS_PER_METRE,
  WEAPON_LENGTH_M,
  metres,
  toMetres,
} from '../../src/game/art/ArtBible';
import { CLOSED_PALETTE, RAMPS, isInPalette, toCss } from '../../src/game/art/Palette';

describe('escala de mundo', () => {
  it('deriva la altura del héroe de píxeles por metro y no al revés', () => {
    expect(HERO_HEIGHT_PX).toBeCloseTo(264, 6);
    expect(HERO_HEIGHT_PX).toBe(HERO_HEIGHT_M * PIXELS_PER_METRE);
  });

  it('convierte metros y píxeles de ida y de vuelta', () => {
    expect(toMetres(metres(3.7))).toBeCloseTo(3.7, 10);
  });

  it('mantiene la proporción declarada de cabezas', () => {
    expect(HEAD_HEIGHT_M * HEADS_TALL).toBeCloseTo(HERO_HEIGHT_M, 10);
  });
});

describe('escalas de personaje', () => {
  it('no hace enanos a los enemigos comunes: miden como el héroe', () => {
    const ratio = CHARACTER_HEIGHT_M.grunt / CHARACTER_HEIGHT_M.hero;
    expect(ratio).toBeGreaterThan(0.95);
    expect(ratio).toBeLessThan(1.05);
  });

  it('mantiene a todo el elenco humano dentro de un rango creíble', () => {
    for (const [role, height] of Object.entries(CHARACTER_HEIGHT_M)) {
      expect(height, role).toBeGreaterThanOrEqual(1.6);
      expect(height, role).toBeLessThanOrEqual(2.2);
    }
  });
});

describe('escala de objetos', () => {
  it('mide los objetos de calle contra la estatura del héroe, no contra la nada', () => {
    // El tacho de basura le llega a Mostasa aproximadamente a la cadera.
    expect(OBJECT_HEIGHT_M.tacho_basura / HERO_HEIGHT_M).toBeGreaterThan(0.4);
    expect(OBJECT_HEIGHT_M.tacho_basura / HERO_HEIGHT_M).toBeLessThan(0.6);
    // El cajón de verdulería no puede pasarle de la rodilla.
    expect(OBJECT_HEIGHT_M.cajon_verduleria).toBeLessThan(0.5);
    // El poste de luz tiene que superarlo largamente.
    expect(OBJECT_HEIGHT_M.poste_luz).toBeGreaterThan(HERO_HEIGHT_M * 2);
  });

  it('no permite armas de una mano más largas que el límite de legibilidad', () => {
    for (const [weapon, length] of Object.entries(WEAPON_LENGTH_M)) {
      expect(length, weapon).toBeLessThanOrEqual(MAX_ONE_HANDED_LENGTH_M);
    }
  });

  it('no permite que un arma supere la estatura del personaje que la usa', () => {
    for (const [weapon, length] of Object.entries(WEAPON_LENGTH_M)) {
      expect(length, weapon).toBeLessThan(HERO_HEIGHT_M);
    }
  });
});

describe('contorno', () => {
  it('escala el contorno con el mundo en vez de fijarlo en píxeles', () => {
    expect(OUTLINE_WIDTH_PX).toBeCloseTo(3.3, 5);
  });
});

describe('paleta cerrada', () => {
  it('no tiene colores repetidos', () => {
    expect(new Set(CLOSED_PALETTE).size).toBe(CLOSED_PALETTE.length);
  });

  it('deja todas las rampas dentro de la paleta cerrada', () => {
    for (const [name, ramp] of Object.entries(RAMPS)) {
      expect(isInPalette(ramp.lit), `${name}.lit`).toBe(true);
      expect(isInPalette(ramp.base), `${name}.base`).toBe(true);
      expect(isInPalette(ramp.shade), `${name}.shade`).toBe(true);
    }
  });

  it('ordena cada rampa de clara a oscura por luminancia', () => {
    const luminance = (hex: number): number => {
      const r = (hex >> 16) & 0xff;
      const g = (hex >> 8) & 0xff;
      const b = hex & 0xff;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const [name, ramp] of Object.entries(RAMPS)) {
      expect(luminance(ramp.lit), `${name}: lit > base`).toBeGreaterThan(luminance(ramp.base));
      expect(luminance(ramp.base), `${name}: base > shade`).toBeGreaterThan(luminance(ramp.shade));
    }
  });

  it('no usa negro puro como tinta', () => {
    expect(CLOSED_PALETTE).not.toContain(0x000000);
  });

  it('convierte a css con seis dígitos siempre', () => {
    expect(toCss(0x11141d)).toBe('#11141d');
    expect(toCss(0x0000ff)).toBe('#0000ff');
  });
});
