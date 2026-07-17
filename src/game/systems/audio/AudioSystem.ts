/**
 * WebAudio playback for the procedural SoundBank (Biblia §22).
 *
 * Design goals:
 *  - Respect autoplay policy: the AudioContext is created/resumed lazily on the
 *    first user gesture, never at construction.
 *  - Separate master / sfx / music gain buses so volumes can be mixed
 *    independently (Biblia §22 "volúmenes separados").
 *  - Fully defensive: if the environment has no AudioContext (jsdom/tests) or a
 *    node fails to build, every method degrades to a no-op instead of throwing.
 */

import type { SfxDef, SfxLayer, MusicNote } from './SoundBank';
import {
  SFX,
  ONCE_MUSIC,
  MUSIC_BPM,
  MUSIC_PATTERN_BEATS,
  midiToFreq,
  beatDuration,
} from './SoundBank';

type WebAudioCtor = new () => AudioContext;

function resolveAudioContextCtor(): WebAudioCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: WebAudioCtor;
    webkitAudioContext?: WebAudioCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export interface AudioMix {
  master: number;
  sfx: number;
  music: number;
}

export const DEFAULT_MIX: AudioMix = { master: 0.7, sfx: 1, music: 0.6 };

export class AudioSystem {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private mix: AudioMix;
  private musicOn = false;
  private muted = false;

  /** Diagnostics: number of one-shot layers scheduled (used by verification). */
  playCount = 0;

  private musicTimer: ReturnType<typeof setInterval> | null = null;

  constructor(mix: AudioMix = DEFAULT_MIX) {
    this.mix = { ...mix };
  }

  /** True once a real AudioContext has been created. */
  get isActive(): boolean {
    return this.ctx !== null;
  }

  /**
   * Create (or resume) the AudioContext. Must be called from within a user
   * gesture handler the first time to satisfy the browser autoplay policy.
   * Safe to call repeatedly; safe when no AudioContext exists.
   */
  unlock(): void {
    if (this.ctx === null) {
      const Ctor = resolveAudioContextCtor();
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        this.ctx = null;
        return;
      }
      this.buildGraph();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
  }

  private buildGraph(): void {
    if (!this.ctx) return;
    try {
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.mix.master;
      this.sfxGain.gain.value = this.mix.sfx;
      this.musicGain.gain.value = this.mix.music;
      this.sfxGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer();
    } catch {
      this.masterGain = null;
      this.sfxGain = null;
      this.musicGain = null;
    }
  }

  private createNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    try {
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return buf;
    } catch {
      return null;
    }
  }

  /** Play a named SFX from the bank. Unknown names / inactive audio no-op. */
  play(name: string): void {
    const def = SFX[name];
    if (def) this.playDef(def);
  }

  /** Play an ad-hoc SfxDef (layer list). */
  playDef(def: SfxDef): void {
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    for (const layer of def) this.scheduleLayer(layer, now, this.sfxGain);
  }

  private scheduleLayer(layer: SfxLayer, startBase: number, dest: GainNode): void {
    if (!this.ctx) return;
    try {
      const start = startBase + (layer.delay ?? 0);
      const end = start + layer.dur;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0002, layer.gain), start + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      env.connect(dest);

      if (layer.wave === 'noise') {
        const src = this.ctx.createBufferSource();
        if (!this.noiseBuffer) return;
        src.buffer = this.noiseBuffer;
        src.connect(env);
        src.start(start);
        src.stop(end);
      } else {
        const osc = this.ctx.createOscillator();
        osc.type = layer.wave;
        osc.frequency.setValueAtTime(layer.freq, start);
        if (layer.freqEnd !== undefined) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(1, layer.freqEnd), end);
        }
        osc.connect(env);
        osc.start(start);
        osc.stop(end);
      }
      this.playCount++;
    } catch {
      /* ignore a single failed layer */
    }
  }

  /** Start the looping stage music. Idempotent. */
  startMusic(): void {
    if (this.musicOn) return;
    if (!this.ctx || !this.musicGain) return;
    this.musicOn = true;
    const loopSeconds = MUSIC_PATTERN_BEATS * beatDuration(MUSIC_BPM);
    this.scheduleMusicBar();
    // Re-schedule each bar slightly ahead of time.
    this.musicTimer = setInterval(() => this.scheduleMusicBar(), loopSeconds * 1000);
  }

  private scheduleMusicBar(): void {
    if (!this.ctx || !this.musicGain || !this.musicOn) return;
    const spb = beatDuration(MUSIC_BPM);
    const base = this.ctx.currentTime + 0.05;
    for (const note of ONCE_MUSIC) this.scheduleMusicNote(note, base, spb);
  }

  private scheduleMusicNote(note: MusicNote, base: number, spb: number): void {
    if (!this.ctx || !this.musicGain) return;
    try {
      const start = base + note.beat * spb;
      const dur = Math.max(0.05, note.len * spb) * 0.9;
      const end = start + dur;
      const env = this.ctx.createGain();
      env.gain.setValueAtTime(0.0001, start);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0002, note.gain), start + 0.02);
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      env.connect(this.musicGain);

      const osc = this.ctx.createOscillator();
      osc.type = note.wave === 'noise' ? 'triangle' : note.wave;
      osc.frequency.setValueAtTime(midiToFreq(note.midi), start);
      osc.connect(env);
      osc.start(start);
      osc.stop(end);
    } catch {
      /* ignore */
    }
  }

  /** Stop the looping music. */
  stopMusic(): void {
    this.musicOn = false;
    if (this.musicTimer !== null) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.mix.master, this.ctx.currentTime, 0.02);
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Release resources (scene shutdown). */
  destroy(): void {
    this.stopMusic();
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {
        /* ignore */
      }
    }
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.noiseBuffer = null;
  }
}
