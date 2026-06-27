import { describe, it, expect } from 'vitest';
import { cachePlan, getPlan, getPlanLastRefreshed } from '../../src/store/planStore.js';

const SAMPLE_ROWS = [
  { id: 1, day: 'Monday',    group: 'Chest', name: 'Bench Press', formula: '80%', sets: 4, minReps: 8,  maxReps: 12, weight: '80', youtubeUrl: '' },
  { id: 2, day: 'Wednesday', group: 'Back',  name: 'Pull-up',     formula: '',    sets: 3, minReps: 6,  maxReps: 10, weight: '',   youtubeUrl: '' },
];

describe('planStore', () => {
  it('getPlan returns empty array on fresh DB', async () => {
    const plan = await getPlan();
    expect(plan).toEqual([]);
  });

  it('cachePlan stores all rows and getPlan retrieves them', async () => {
    await cachePlan(SAMPLE_ROWS);
    const plan = await getPlan();
    expect(plan).toHaveLength(2);
    expect(plan.find(r => r.name === 'Bench Press')).toBeDefined();
    expect(plan.find(r => r.name === 'Pull-up')).toBeDefined();
  });

  it('cachePlan replaces previous data (clears before writing)', async () => {
    await cachePlan(SAMPLE_ROWS);
    await cachePlan([{ id: 9, day: 'Friday', group: 'Legs', name: 'Squat', formula: '', sets: 4, minReps: 5, maxReps: 8, weight: '100', youtubeUrl: '' }]);
    const plan = await getPlan();
    expect(plan).toHaveLength(1);
    expect(plan[0].name).toBe('Squat');
  });

  it('getPlanLastRefreshed returns null before first cache', async () => {
    const ts = await getPlanLastRefreshed();
    expect(ts).toBeNull();
  });

  it('getPlanLastRefreshed returns a timestamp after cachePlan', async () => {
    const before = Date.now();
    await cachePlan(SAMPLE_ROWS);
    const ts = await getPlanLastRefreshed();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(Date.now());
  });
});
