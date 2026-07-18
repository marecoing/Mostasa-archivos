import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_BY_ID,
  pendingAchievements,
  grantAchievements,
} from '../../src/game/data/AchievementManifest';
import { emptyProgress, withStageCleared } from '../../src/game/data/CampaignProgress';
import type { CampaignProgress } from '../../src/game/data/CampaignProgress';
import { STAGES } from '../../src/game/data/StageManifest';

describe('ACHIEVEMENTS integrity', () => {
  it('has unique ids, positive rewards and non-empty text', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.reward).toBeGreaterThan(0);
      expect(a.name.length).toBeGreaterThan(0);
      expect(a.description.length).toBeGreaterThan(0);
      expect(ACHIEVEMENT_BY_ID[a.id]).toBe(a);
    }
  });
});

describe('pendingAchievements / grantAchievements', () => {
  it('unlocks nothing for an empty progress', () => {
    expect(pendingAchievements(emptyProgress()).ids).toEqual([]);
  });

  it('unlocks first-clear and pays its reward', () => {
    const p = withStageCleared(emptyProgress(), '01-once', 1000, 'C');
    const pend = pendingAchievements(p);
    expect(pend.ids).toContain('primera_sangre');
    const { progress, unlocked } = grantAchievements(p);
    expect(progress.achievements).toContain('primera_sangre');
    expect(progress.wallet).toBe(p.wallet + unlocked.reward);
  });

  it('is idempotent — never pays a claimed achievement twice', () => {
    let p = withStageCleared(emptyProgress(), '01-once', 1000, 'C');
    p = grantAchievements(p).progress;
    const walletAfterFirst = p.wallet;
    const second = grantAchievements(p);
    expect(second.unlocked.ids).toEqual([]);
    expect(second.progress.wallet).toBe(walletAfterFirst);
  });

  it('unlocks combo achievements from bestCombo', () => {
    const p: CampaignProgress = { ...emptyProgress(), bestCombo: 31 };
    const ids = pendingAchievements(p).ids;
    expect(ids).toContain('cadena_de_bronca'); // >=20
    expect(ids).toContain('imparable'); // >=30
  });

  it('unlocks Intocable at 10 lifetime perfect zones', () => {
    expect(pendingAchievements({ ...emptyProgress(), perfectZones: 9 }).ids).not.toContain('intocable');
    expect(pendingAchievements({ ...emptyProgress(), perfectZones: 10 }).ids).toContain('intocable');
  });

  it('unlocks S-rank and campaign-complete achievements', () => {
    let p: CampaignProgress = emptyProgress();
    for (const s of STAGES) p = withStageCleared(p, s.id, 1000, s.index === 1 ? 'S' : 'C');
    const ids = pendingAchievements(p).ids;
    expect(ids).toContain('sin_una_marca');
    expect(ids).toContain('la_rosca_cayo');
    expect(ids).toContain('media_ciudad');
  });

  it('grant leaves the original progress untouched (pure)', () => {
    const p = withStageCleared(emptyProgress(), '01-once', 1000, 'C');
    const before = p.achievements.length;
    grantAchievements(p);
    expect(p.achievements.length).toBe(before);
  });
});
