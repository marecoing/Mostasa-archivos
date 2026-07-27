import { describe, expect, it } from 'vitest';
import { HERO_HEIGHT_M, PIXELS_PER_METRE } from '../../src/game/art/ArtBible';
import {
  BREAKABLE_HEIGHT_M,
  PICKUP_HEIGHT_M,
  SCENERY_HEIGHT_M,
  WEAPON_HEIGHT_M,
  declaredHeightM,
  fractionOfHero,
  screenHeightPx,
  targetHeightPxFor,
} from '../../src/game/art/WorldScale';
import {
  BREAKABLE_VISUALS,
  PICKUP_VISUALS,
  PROP_VISUALS,
  WEAPON_VISUALS,
  propScaleFor,
} from '../../src/game/data/VisualMetrics';

describe('todo lo que se ve tiene medida real declarada', () => {
  it('no deja ningún objeto decorativo sin altura en metros', () => {
    for (const id of Object.keys(PROP_VISUALS)) {
      expect(declaredHeightM(id), `${id} no tiene altura declarada`).not.toBeNull();
    }
  });

  it('no deja ningún arma sin altura en metros', () => {
    for (const id of Object.keys(WEAPON_VISUALS)) {
      expect(declaredHeightM(id), `${id} no tiene altura declarada`).not.toBeNull();
    }
  });

  it('no deja ningún consumible sin altura en metros', () => {
    for (const id of Object.keys(PICKUP_VISUALS)) {
      expect(declaredHeightM(id), `${id} no tiene altura declarada`).not.toBeNull();
    }
  });

  it('no deja ningún rompible sin altura en metros', () => {
    for (const id of Object.keys(BREAKABLE_VISUALS)) {
      expect(declaredHeightM(id), `${id} no tiene altura declarada`).not.toBeNull();
    }
  });

  it('deja el cajón rompible del mismo tamaño que el cajón agarrable', () => {
    // Son el mismo objeto del mundo: no puede medir distinto segun de que
    // tabla del codigo salga.
    expect(BREAKABLE_HEIGHT_M.cajon_rompible).toBeCloseTo(WEAPON_HEIGHT_M.cajon_verdura, 5);
  });
});

describe('las alturas declaradas son creíbles', () => {
  it('mantiene el mobiliario urbano en un rango de calle', () => {
    for (const [id, h] of Object.entries(SCENERY_HEIGHT_M)) {
      expect(h, `${id} demasiado chico`).toBeGreaterThanOrEqual(0.05);
      expect(h, `${id} más alto que un segundo piso`).toBeLessThanOrEqual(5);
    }
  });

  it('no permite un arma de una mano más alta que Mostasa', () => {
    for (const [id, h] of Object.entries(WEAPON_HEIGHT_M)) {
      expect(h, id).toBeLessThan(HERO_HEIGHT_M);
    }
  });

  it('mantiene los consumibles como objetos de mano', () => {
    for (const [id, h] of Object.entries(PICKUP_HEIGHT_M)) {
      expect(h, `${id} no entra en una mano`).toBeLessThanOrEqual(0.4);
      expect(h, `${id} es más chico que una moneda`).toBeGreaterThanOrEqual(0.03);
    }
  });

  it('deja el cajón de verdulería por debajo de la rodilla', () => {
    // El defecto concreto que se veía en pantalla: estaba declarado en 105 px
    // (0.70 m), el doble de un cajón real, y quedaba del tamaño de un banco.
    expect(WEAPON_HEIGHT_M.cajon_verdura).toBeCloseTo(0.34, 5);
    expect(fractionOfHero(WEAPON_HEIGHT_M.cajon_verdura)).toBeLessThan(0.25);
  });

  it('deja el tacho de basura a la altura de la cadera', () => {
    const f = fractionOfHero(SCENERY_HEIGHT_M.bolsa_basura);
    expect(f).toBeGreaterThan(0.2);
    expect(f).toBeLessThan(0.4);
  });

  it('hace que una persiana de local sea más alta que Mostasa', () => {
    expect(SCENERY_HEIGHT_M.persiana_metalica).toBeGreaterThan(HERO_HEIGHT_M);
  });
});

describe('conversión a pantalla', () => {
  it('convierte metros a píxeles con la escala del mundo', () => {
    expect(screenHeightPx(1)).toBe(PIXELS_PER_METRE);
    expect(screenHeightPx(HERO_HEIGHT_M)).toBeCloseTo(264, 6);
  });

  it('usa la altura declarada y no la que traía el manifiesto', () => {
    // 999 es una reserva absurda: si aparece, la tabla no se está consultando.
    expect(targetHeightPxFor('cajon_verdura', 999)).toBeCloseTo(0.34 * PIXELS_PER_METRE, 6);
  });

  it('cae en la reserva sólo para assets todavía sin medir', () => {
    expect(targetHeightPxFor('asset_que_no_existe', 123)).toBe(123);
  });
});

describe('el juego usa la escala real', () => {
  it('achica los props que estaban sobredimensionados', () => {
    // La escala de colocación se pasa tal cual; lo que cambia es la altura
    // objetivo, que ahora sale de los metros declarados.
    const banco = PROP_VISUALS['banco_anden']!;
    const escala = propScaleFor('banco_anden', banco.authoredScale);
    const alturaEnPantalla = banco.referenceHeightPx * escala;
    expect(alturaEnPantalla).toBeCloseTo(SCENERY_HEIGHT_M.banco_anden * PIXELS_PER_METRE, 1);
  });

  it('respeta la escala de colocación relativa que ya tenía cada prop', () => {
    const prop = PROP_VISUALS['farol_estacion']!;
    const normal = propScaleFor('farol_estacion', prop.authoredScale);
    const mitad = propScaleFor('farol_estacion', prop.authoredScale / 2);
    expect(mitad / normal).toBeCloseTo(0.5, 6);
  });

  it('deja a todos los props decorativos por debajo de dos veces Mostasa', () => {
    for (const [id, visual] of Object.entries(PROP_VISUALS)) {
      const alturaPx = visual.referenceHeightPx * propScaleFor(id, visual.authoredScale);
      expect(alturaPx / (HERO_HEIGHT_M * PIXELS_PER_METRE), id).toBeLessThan(2);
    }
  });
});
