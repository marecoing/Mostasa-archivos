/**
 * VFX manifest — 2D animated effect sheets (horizontal strips, 181px tall).
 * Sourced from the uploaded `vfx/` drop + asset-manifest.json.
 * Each effect is a one-shot animation played at a world position.
 */

export interface VfxDef {
  id: string;
  /** runtime texture path (served from public/) */
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  /** playback frame rate for the one-shot */
  frameRate: number;
  /** render scale multiplier when spawned */
  scale: number;
}

export const VFX: Record<string, VfxDef> = {
  impacto_puno: {
    id: 'impacto_puno', path: 'assets/vfx/impacto_puno.png',
    frameWidth: 181, frameHeight: 181, frameCount: 6, frameRate: 30, scale: 0.7,
  },
  impacto_pesado: {
    id: 'impacto_pesado', path: 'assets/vfx/impacto_pesado.png',
    frameWidth: 181, frameHeight: 181, frameCount: 6, frameRate: 28, scale: 1.0,
  },
  chispas_metal: {
    id: 'chispas_metal', path: 'assets/vfx/chispas_metal.png',
    frameWidth: 181, frameHeight: 181, frameCount: 6, frameRate: 32, scale: 0.7,
  },
  polvo_caida: {
    id: 'polvo_caida', path: 'assets/vfx/polvo_caida.png',
    frameWidth: 181, frameHeight: 181, frameCount: 6, frameRate: 22, scale: 0.9,
  },
  vidrio_roto_vfx: {
    id: 'vidrio_roto_vfx', path: 'assets/vfx/vidrio_roto_vfx.png',
    frameWidth: 181, frameHeight: 181, frameCount: 6, frameRate: 26, scale: 1.0,
  },
  bronca_especial: {
    id: 'bronca_especial', path: 'assets/vfx/bronca_especial.png',
    frameWidth: 181, frameHeight: 181, frameCount: 8, frameRate: 24, scale: 1.6,
  },
};

export const VFX_LIST: VfxDef[] = Object.values(VFX);

/** Frame indices for a strip effect (0..frameCount-1). */
export function vfxFrames(def: VfxDef): number[] {
  return Array.from({ length: def.frameCount }, (_, i) => i);
}
