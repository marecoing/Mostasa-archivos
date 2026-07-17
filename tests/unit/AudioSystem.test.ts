import { describe, it, expect } from 'vitest';
import { AudioSystem, DEFAULT_MIX } from '../../src/game/systems/audio/AudioSystem';

/**
 * These run under jsdom, which has no Web Audio implementation. The point is to
 * prove the system degrades to a safe no-op instead of throwing — real audio is
 * exercised in the headless-Chromium verification pass, not in unit tests.
 */
describe('AudioSystem (no WebAudio available)', () => {
  it('constructs without an AudioContext and stays inactive', () => {
    const a = new AudioSystem();
    expect(a.isActive).toBe(false);
    expect(a.playCount).toBe(0);
  });

  it('never throws when driven before/without unlock', () => {
    const a = new AudioSystem();
    expect(() => {
      a.play('punch');
      a.play('does_not_exist');
      a.startMusic();
      a.stopMusic();
      a.unlock();
      a.play('special');
      a.destroy();
    }).not.toThrow();
    // Without a real AudioContext nothing was scheduled.
    expect(a.playCount).toBe(0);
  });

  it('tracks mute state', () => {
    const a = new AudioSystem();
    expect(a.isMuted).toBe(false);
    expect(a.toggleMuted()).toBe(true);
    expect(a.isMuted).toBe(true);
    a.setMuted(false);
    expect(a.isMuted).toBe(false);
  });

  it('exposes a sane default mix', () => {
    expect(DEFAULT_MIX.master).toBeGreaterThan(0);
    expect(DEFAULT_MIX.sfx).toBeGreaterThan(0);
    expect(DEFAULT_MIX.music).toBeGreaterThan(0);
  });
});
