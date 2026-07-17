import { describe, it, expect } from 'vitest';
import { computeStats } from '../../src/game/data/CampaignStats';
import { emptyProgress, withStageCleared } from '../../src/game/data/CampaignProgress';
import type { CampaignProgress } from '../../src/game/data/CampaignProgress';
import { STAGES } from '../../src/game/data/StageManifest';

describe('computeStats', () => {
  it('is all-zero for an empty progress', () => {
    const st = computeStats(emptyProgress());
    expect(st.stagesCleared).toBe(0);
    expect(st.stagesTotal).toBe(STAGES.length);
    expect(st.campaignComplete).toBe(false);
    expect(st.totalBestScore).toBe(0);
    expect(st.bestCombo).toBe(0);
    expect(st.wallet).toBe(0);
    expect(st.topRank).toBeNull();
    expect(st.sRankCount).toBe(0);
  });

  it('aggregates clears, scores, top rank and S-rank count', () => {
    let p = withStageCleared(emptyProgress(), '01-once', 1000, 'B');
    p = withStageCleared(p, '02-estacion-oxidada', 3000, 'S');
    p = withStageCleared(p, '03-pasillo-del-conurbano', 2000, 'A');
    p = { ...p, bestCombo: 22 };
    const st = computeStats(p);
    expect(st.stagesCleared).toBe(3);
    expect(st.totalBestScore).toBe(6000);
    expect(st.topRank).toBe('S');
    expect(st.sRankCount).toBe(1);
    expect(st.bestCombo).toBe(22);
    expect(st.wallet).toBe(6000); // each clear paid its score in
  });

  it('counts Rosca as an S-tier rank and picks it as top', () => {
    let p = withStageCleared(emptyProgress(), '01-once', 3500, 'Rosca');
    p = withStageCleared(p, '02-estacion-oxidada', 3200, 'S');
    const st = computeStats(p);
    expect(st.topRank).toBe('Rosca');
    expect(st.sRankCount).toBe(2);
  });

  it('reports campaignComplete when every stage is cleared', () => {
    let p: CampaignProgress = emptyProgress();
    for (const s of STAGES) p = withStageCleared(p, s.id, 1000, 'C');
    const st = computeStats(p);
    expect(st.stagesCleared).toBe(STAGES.length);
    expect(st.campaignComplete).toBe(true);
  });
});
