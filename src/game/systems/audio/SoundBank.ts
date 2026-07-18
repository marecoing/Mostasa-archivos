/**
 * Procedural sound bank (Biblia §22). No audio files are shipped yet, so
 * every SFX is synthesized from simple layers (oscillators + noise) with a
 * gain envelope. Pure data + math — the AudioSystem renders it via WebAudio.
 */

export type LayerWave = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';

export interface SfxLayer {
  wave: LayerWave;
  /** start frequency (Hz); ignored for noise */
  freq: number;
  /** optional end frequency for a pitch sweep */
  freqEnd?: number;
  /** duration in seconds */
  dur: number;
  /** peak gain 0..1 */
  gain: number;
  /** start offset in seconds */
  delay?: number;
}

export type SfxDef = SfxLayer[];

/** Equal-tempered MIDI note → frequency (A4 = 69 = 440 Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export const SFX: Record<string, SfxDef> = {
  punch: [
    { wave: 'noise', freq: 0, dur: 0.09, gain: 0.5 },
    { wave: 'triangle', freq: 180, freqEnd: 90, dur: 0.1, gain: 0.35 },
  ],
  heavy_hit: [
    { wave: 'noise', freq: 0, dur: 0.14, gain: 0.6 },
    { wave: 'square', freq: 120, freqEnd: 55, dur: 0.18, gain: 0.4 },
  ],
  enemy_hurt: [
    { wave: 'sawtooth', freq: 320, freqEnd: 180, dur: 0.1, gain: 0.28 },
  ],
  player_hurt: [
    { wave: 'square', freq: 260, freqEnd: 90, dur: 0.22, gain: 0.4 },
    { wave: 'noise', freq: 0, dur: 0.1, gain: 0.3 },
  ],
  breakable: [
    { wave: 'noise', freq: 0, dur: 0.18, gain: 0.5 },
    { wave: 'square', freq: 90, freqEnd: 60, dur: 0.12, gain: 0.25 },
  ],
  pickup: [
    { wave: 'triangle', freq: midiToFreq(76), dur: 0.08, gain: 0.3 },
    { wave: 'triangle', freq: midiToFreq(83), dur: 0.1, gain: 0.32, delay: 0.07 },
  ],
  weapon_pickup: [
    { wave: 'square', freq: midiToFreq(64), dur: 0.06, gain: 0.28 },
    { wave: 'square', freq: midiToFreq(71), dur: 0.09, gain: 0.3, delay: 0.05 },
  ],
  jump: [
    { wave: 'sine', freq: 300, freqEnd: 620, dur: 0.16, gain: 0.28 },
  ],
  dodge: [
    { wave: 'noise', freq: 0, dur: 0.14, gain: 0.3 },
    { wave: 'sine', freq: 520, freqEnd: 180, dur: 0.14, gain: 0.18 },
  ],
  special: [
    { wave: 'sawtooth', freq: midiToFreq(52), dur: 0.4, gain: 0.32 },
    { wave: 'sawtooth', freq: midiToFreq(59), dur: 0.4, gain: 0.3, delay: 0.02 },
    { wave: 'sawtooth', freq: midiToFreq(64), dur: 0.45, gain: 0.3, delay: 0.04 },
    { wave: 'noise', freq: 0, dur: 0.5, gain: 0.25 },
  ],
  weapon_break: [
    { wave: 'noise', freq: 0, dur: 0.22, gain: 0.5 },
    { wave: 'square', freq: 220, freqEnd: 60, dur: 0.2, gain: 0.28 },
  ],
  ui_confirm: [
    { wave: 'square', freq: midiToFreq(72), dur: 0.06, gain: 0.25 },
    { wave: 'square', freq: midiToFreq(79), dur: 0.1, gain: 0.28, delay: 0.06 },
  ],
  zone_clear: [
    { wave: 'triangle', freq: midiToFreq(72), dur: 0.12, gain: 0.3 },
    { wave: 'triangle', freq: midiToFreq(76), dur: 0.12, gain: 0.3, delay: 0.1 },
    { wave: 'triangle', freq: midiToFreq(79), dur: 0.2, gain: 0.32, delay: 0.2 },
  ],
};

/** A repeating musical note in the stage loop. */
export interface MusicNote {
  midi: number;
  /** beat index within the pattern */
  beat: number;
  /** length in beats */
  len: number;
  wave: LayerWave;
  gain: number;
}

/** Beats per minute and pattern length (in beats) for the Once loop. */
export const MUSIC_BPM = 132;
export const MUSIC_PATTERN_BEATS = 16;

/** A gritty two-part loop: a driving bass + a sparse minor arpeggio. */
export const ONCE_MUSIC: MusicNote[] = [
  // Bass (A minor-ish walk).
  { midi: 33, beat: 0, len: 1, wave: 'square', gain: 0.18 },
  { midi: 33, beat: 2, len: 1, wave: 'square', gain: 0.16 },
  { midi: 36, beat: 4, len: 1, wave: 'square', gain: 0.18 },
  { midi: 36, beat: 6, len: 1, wave: 'square', gain: 0.16 },
  { midi: 31, beat: 8, len: 1, wave: 'square', gain: 0.18 },
  { midi: 31, beat: 10, len: 1, wave: 'square', gain: 0.16 },
  { midi: 28, beat: 12, len: 2, wave: 'square', gain: 0.18 },
  // Arpeggio accents.
  { midi: 69, beat: 1, len: 0.5, wave: 'triangle', gain: 0.08 },
  { midi: 72, beat: 3, len: 0.5, wave: 'triangle', gain: 0.08 },
  { midi: 76, beat: 5, len: 0.5, wave: 'triangle', gain: 0.08 },
  { midi: 72, beat: 9, len: 0.5, wave: 'triangle', gain: 0.08 },
  { midi: 67, beat: 13, len: 0.5, wave: 'triangle', gain: 0.08 },
  { midi: 64, beat: 15, len: 0.5, wave: 'triangle', gain: 0.08 },
];

/** Seconds per beat for a given BPM. */
export function beatDuration(bpm: number): number {
  return 60 / bpm;
}

/**
 * Per-stage rendition of the loop (Biblia §22 "música por escenario"): the
 * same pattern re-keyed and re-paced so each zone has its own mood while the
 * whole campaign stays coherent. Tension rises toward the Casa Rosada.
 */
export interface MusicVariant {
  /** semitones added to every note */
  transpose: number;
  bpm: number;
}

export const MUSIC_VARIANTS: Record<string, MusicVariant> = {
  '01-once': { transpose: 0, bpm: 132 },
  '02-estacion-oxidada': { transpose: -2, bpm: 126 },
  '03-pasillo-del-conurbano': { transpose: 3, bpm: 136 },
  '04-palermo-de-carton': { transpose: 5, bpm: 140 },
  '05-avenida-de-la-protesta': { transpose: -4, bpm: 122 },
  '06-catalinas-del-humo': { transpose: 1, bpm: 128 },
  '07-puerto-del-country': { transpose: 7, bpm: 138 },
  '08-galpon-del-acceso': { transpose: -5, bpm: 130 },
  '09-pasillos-del-poder': { transpose: 2, bpm: 144 },
  '10-casa-rosada-final': { transpose: 6, bpm: 150 },
};

const DEFAULT_VARIANT: MusicVariant = { transpose: 0, bpm: MUSIC_BPM };

export function variantForStage(stageId: string): MusicVariant {
  return MUSIC_VARIANTS[stageId] ?? DEFAULT_VARIANT;
}
