import { describe, it, expect } from 'vitest';
import {
  SFX,
  ONCE_MUSIC,
  MUSIC_BPM,
  MUSIC_PATTERN_BEATS,
  MUSIC_VARIANTS,
  midiToFreq,
  beatDuration,
  variantForStage,
} from '../../src/game/systems/audio/SoundBank';
import { STAGES } from '../../src/game/data/StageManifest';
import type { SfxLayer } from '../../src/game/systems/audio/SoundBank';

describe('midiToFreq', () => {
  it('maps A4 (MIDI 69) to 440 Hz', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
  });

  it('goes up an octave every 12 semitones', () => {
    expect(midiToFreq(81)).toBeCloseTo(880, 4);
    expect(midiToFreq(57)).toBeCloseTo(220, 4);
  });

  it('is monotonically increasing', () => {
    expect(midiToFreq(60)).toBeLessThan(midiToFreq(61));
  });
});

describe('beatDuration', () => {
  it('is 60/bpm seconds', () => {
    expect(beatDuration(120)).toBeCloseTo(0.5, 6);
    expect(beatDuration(MUSIC_BPM)).toBeCloseTo(60 / 132, 6);
  });
});

describe('SFX bank integrity', () => {
  const expected = [
    'punch', 'heavy_hit', 'enemy_hurt', 'player_hurt', 'breakable',
    'pickup', 'weapon_pickup', 'jump', 'special', 'weapon_break',
    'ui_confirm', 'zone_clear',
  ];

  it('defines every gameplay sound the scene triggers', () => {
    for (const name of expected) {
      expect(SFX[name], `missing SFX "${name}"`).toBeDefined();
    }
  });

  it('has no empty definitions', () => {
    for (const [name, def] of Object.entries(SFX)) {
      expect(def.length, `SFX "${name}" has no layers`).toBeGreaterThan(0);
    }
  });

  it('uses only valid, in-range layer parameters', () => {
    const waves = new Set(['sine', 'square', 'sawtooth', 'triangle', 'noise']);
    const allLayers: SfxLayer[] = Object.values(SFX).flat();
    for (const layer of allLayers) {
      expect(waves.has(layer.wave)).toBe(true);
      expect(layer.dur).toBeGreaterThan(0);
      expect(layer.gain).toBeGreaterThan(0);
      expect(layer.gain).toBeLessThanOrEqual(1);
      if (layer.wave !== 'noise') expect(layer.freq).toBeGreaterThan(0);
      if (layer.delay !== undefined) expect(layer.delay).toBeGreaterThanOrEqual(0);
      if (layer.freqEnd !== undefined) expect(layer.freqEnd).toBeGreaterThan(0);
    }
  });
});

describe('music variants per stage', () => {
  it('defines a variant for every campaign stage', () => {
    for (const s of STAGES) {
      expect(MUSIC_VARIANTS[s.id], `missing variant for ${s.id}`).toBeDefined();
    }
  });

  it('keeps every transposed note at a playable frequency and sane BPM', () => {
    for (const [id, v] of Object.entries(MUSIC_VARIANTS)) {
      expect(v.bpm, id).toBeGreaterThanOrEqual(80);
      expect(v.bpm, id).toBeLessThanOrEqual(200);
      for (const note of ONCE_MUSIC) {
        const f = midiToFreq(note.midi + v.transpose);
        expect(f, `${id} note too low`).toBeGreaterThan(20);
        expect(f, `${id} note too high`).toBeLessThan(8000);
      }
    }
  });

  it('falls back to the neutral rendition for unknown stages', () => {
    const v = variantForStage('nope');
    expect(v.transpose).toBe(0);
    expect(v.bpm).toBe(MUSIC_BPM);
    expect(variantForStage('10-casa-rosada-final').bpm).toBeGreaterThan(variantForStage('01-once').bpm);
  });
});

describe('ONCE_MUSIC loop', () => {
  it('has notes and a sane BPM/pattern', () => {
    expect(ONCE_MUSIC.length).toBeGreaterThan(0);
    expect(MUSIC_BPM).toBeGreaterThan(0);
    expect(MUSIC_PATTERN_BEATS).toBeGreaterThan(0);
  });

  it('keeps every note inside the pattern window', () => {
    const waves = new Set(['sine', 'square', 'sawtooth', 'triangle', 'noise']);
    for (const note of ONCE_MUSIC) {
      expect(note.beat).toBeGreaterThanOrEqual(0);
      expect(note.beat + note.len).toBeLessThanOrEqual(MUSIC_PATTERN_BEATS);
      expect(note.len).toBeGreaterThan(0);
      expect(note.gain).toBeGreaterThan(0);
      expect(waves.has(note.wave)).toBe(true);
      expect(midiToFreq(note.midi)).toBeGreaterThan(0);
    }
  });
});
