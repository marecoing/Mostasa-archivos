import { describe, it, expect } from 'vitest';
import { STAGE_INTROS, introForStage } from '../../src/game/data/StoryManifest';
import { STAGES } from '../../src/game/data/StageManifest';

describe('STAGE_INTROS', () => {
  it('has an intro with non-empty lines for every campaign stage', () => {
    for (const s of STAGES) {
      const intro = STAGE_INTROS[s.id];
      expect(intro, `missing intro for ${s.id}`).toBeDefined();
      expect(intro!.stageId).toBe(s.id);
      expect(intro!.lines.length).toBeGreaterThan(0);
      for (const line of intro!.lines) {
        expect(line.text.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps lines short enough for the dialogue box (max 3 visual rows)', () => {
    for (const intro of Object.values(STAGE_INTROS)) {
      for (const line of intro.lines) {
        expect(line.text.split('\n').length).toBeLessThanOrEqual(3);
      }
    }
  });

  it('introForStage returns undefined for unknown stages', () => {
    expect(introForStage('nope')).toBeUndefined();
    expect(introForStage('01-once')).toBe(STAGE_INTROS['01-once']);
  });
});
