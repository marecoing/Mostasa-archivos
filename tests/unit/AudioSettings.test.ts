import { describe, it, expect, beforeEach } from 'vitest';
import {
  clamp01,
  sanitizeMix,
  loadAudioSettings,
  saveAudioSettings,
} from '../../src/game/data/AudioSettings';
import { AudioSystem, DEFAULT_MIX } from '../../src/game/systems/audio/AudioSystem';

describe('clamp01 / sanitizeMix', () => {
  it('clamps into [0,1] and maps NaN to 0', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(NaN)).toBe(0);
  });

  it('fills invalid fields with defaults and clamps valid ones', () => {
    const m = sanitizeMix({ master: 2, sfx: 'loud', music: -1 });
    expect(m.master).toBe(1);
    expect(m.sfx).toBe(DEFAULT_MIX.sfx);
    expect(m.music).toBe(0);
    expect(sanitizeMix(null)).toEqual(DEFAULT_MIX);
    expect(sanitizeMix(undefined)).toEqual(DEFAULT_MIX);
  });
});

describe('persistence (jsdom localStorage)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('round-trips a mix', () => {
    saveAudioSettings({ master: 0.5, sfx: 0.8, music: 0.2 });
    expect(loadAudioSettings()).toEqual({ master: 0.5, sfx: 0.8, music: 0.2 });
  });

  it('returns defaults when nothing stored or storage corrupt', () => {
    expect(loadAudioSettings()).toEqual(DEFAULT_MIX);
    localStorage.setItem('mostasas-rage:audio:v1', '{not json');
    expect(loadAudioSettings()).toEqual(DEFAULT_MIX);
  });
});

describe('AudioSystem volume control (no WebAudio)', () => {
  it('tracks per-channel volume and clamps, without throwing', () => {
    const a = new AudioSystem({ master: 0.7, sfx: 1, music: 0.6 });
    a.setVolume('music', 0.3);
    a.setVolume('sfx', 5);
    a.setVolume('master', -1);
    const mix = a.getMix();
    expect(mix.music).toBe(0.3);
    expect(mix.sfx).toBe(1);
    expect(mix.master).toBe(0);
  });

  it('getMix returns a copy, not internal state', () => {
    const a = new AudioSystem();
    const m = a.getMix();
    m.master = 0;
    expect(a.getMix().master).toBe(DEFAULT_MIX.master);
  });
});
