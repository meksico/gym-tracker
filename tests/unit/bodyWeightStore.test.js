import { describe, it, expect } from 'vitest';
import { cacheBodyWeight, getLatestBodyWeight } from '../../src/store/bodyWeightStore.js';

describe('bodyWeightStore', () => {
  it('getLatestBodyWeight returns undefined on fresh DB', async () => {
    const result = await getLatestBodyWeight();
    expect(result).toBeUndefined();
  });

  it('cacheBodyWeight persists only the last row as the latest value', async () => {
    await cacheBodyWeight([
      { date: '06/28/2026', weight: 81.0 },
      { date: '06/30/2026', weight: 80.2 },
    ]);
    const result = await getLatestBodyWeight();
    expect(result).toEqual({ key: 'latest', date: '06/30/2026', weight: 80.2 });
  });

  it('cacheBodyWeight overwrites the previous latest value', async () => {
    await cacheBodyWeight([{ date: '06/30/2026', weight: 80.2 }]);
    await cacheBodyWeight([{ date: '07/01/2026', weight: 79.9 }]);
    const result = await getLatestBodyWeight();
    expect(result.weight).toBe(79.9);
  });

  it('cacheBodyWeight does nothing when given an empty array', async () => {
    await cacheBodyWeight([{ date: '06/30/2026', weight: 80.2 }]);
    await cacheBodyWeight([]);
    const result = await getLatestBodyWeight();
    expect(result.weight).toBe(80.2);
  });
});
