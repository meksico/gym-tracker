import { describe, it, expect } from 'vitest';
import { cacheRecentWeights, getRecentWeightForExercise } from '../../src/store/recentWeightStore.js';

const SAMPLE_WEIGHTS = [
  { exercise: 'Bench Press', group: 'Chest', maxWeight: 85, maxReps: 10 },
  { exercise: 'Squat',       group: 'Legs',  maxWeight: 120, maxReps: 5 },
];

describe('recentWeightStore', () => {
  it('getRecentWeightForExercise returns undefined on fresh DB', async () => {
    const result = await getRecentWeightForExercise('Bench Press');
    expect(result).toBeUndefined();
  });

  it('cacheRecentWeights stores data and getRecentWeightForExercise retrieves it', async () => {
    await cacheRecentWeights(SAMPLE_WEIGHTS);
    const result = await getRecentWeightForExercise('Bench Press');
    expect(result).toEqual({ exercise: 'Bench Press', group: 'Chest', maxWeight: 85, maxReps: 10 });
  });

  it('getRecentWeightForExercise returns undefined for unknown exercise', async () => {
    await cacheRecentWeights(SAMPLE_WEIGHTS);
    const result = await getRecentWeightForExercise('Unknown Exercise');
    expect(result).toBeUndefined();
  });

  it('cacheRecentWeights replaces all previous data', async () => {
    await cacheRecentWeights(SAMPLE_WEIGHTS);
    await cacheRecentWeights([{ exercise: 'Deadlift', group: 'Back', maxWeight: 150, maxReps: 3 }]);

    const bench = await getRecentWeightForExercise('Bench Press');
    expect(bench).toBeUndefined(); // replaced

    const dead = await getRecentWeightForExercise('Deadlift');
    expect(dead?.maxWeight).toBe(150);
  });

  it('cacheRecentWeights sets the META refresh timestamp', async () => {
    const { getFromStore } = await import('../../src/store/db.js');
    const { STORES, META_KEYS } = await import('../../src/config.js');

    const before = Date.now();
    await cacheRecentWeights(SAMPLE_WEIGHTS);
    const meta = await getFromStore(STORES.META, META_KEYS.RECENT_WEIGHT_REFRESHED);
    expect(meta?.value).toBeGreaterThanOrEqual(before);
  });
});
