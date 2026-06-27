import { describe, it, expect, vi } from 'vitest';
import { saveLog, updateLog, getTodayLogs, getLogsByExercise, getLogByUuid, getStarCounts, todayStr } from '../../src/store/logStore.js';

function makeEntry(overrides = {}) {
  return {
    uuid:     overrides.uuid     ?? `uuid-${Math.random()}`,
    ts:       overrides.ts       ?? Date.now(),
    date:     overrides.date     ?? todayStr(),
    exercise: overrides.exercise ?? 'Bench Press',
    group:    overrides.group    ?? 'Chest',
    weight:   overrides.weight   ?? 80,
    reps:     overrides.reps     ?? 10,
  };
}

describe('logStore', () => {
  it('saveLog persists and getLogByUuid retrieves it', async () => {
    const entry = makeEntry({ uuid: 'abc-123' });
    await saveLog(entry);
    const result = await getLogByUuid('abc-123');
    expect(result).toMatchObject({ uuid: 'abc-123', exercise: 'Bench Press', weight: 80, reps: 10 });
  });

  it('getTodayLogs returns only entries for today', async () => {
    const today = makeEntry({ uuid: 'today' });
    const yesterday = makeEntry({ uuid: 'yesterday', date: '2000-01-01' });
    await saveLog(today);
    await saveLog(yesterday);

    const logs = await getTodayLogs();
    expect(logs.some(l => l.uuid === 'today')).toBe(true);
    expect(logs.some(l => l.uuid === 'yesterday')).toBe(false);
  });

  it('getLogsByExercise returns only matching exercise, sorted by ts', async () => {
    await saveLog(makeEntry({ uuid: 'e1', exercise: 'Squat', ts: 100 }));
    await saveLog(makeEntry({ uuid: 'e2', exercise: 'Squat', ts: 200 }));
    await saveLog(makeEntry({ uuid: 'e3', exercise: 'Bench Press', ts: 50 }));

    const logs = await getLogsByExercise('Squat');
    expect(logs).toHaveLength(2);
    expect(logs[0].uuid).toBe('e1');
    expect(logs[1].uuid).toBe('e2');
  });

  it('updateLog merges patch onto existing entry', async () => {
    const entry = makeEntry({ uuid: 'upd-1', weight: 80, reps: 10 });
    await saveLog(entry);
    await updateLog('upd-1', { weight: 90, reps: 8 });

    const updated = await getLogByUuid('upd-1');
    expect(updated.weight).toBe(90);
    expect(updated.reps).toBe(8);
    expect(updated.exercise).toBe(entry.exercise); // unchanged fields preserved
  });

  it('updateLog throws when uuid does not exist', async () => {
    await expect(updateLog('nonexistent', { weight: 50 })).rejects.toThrow('Log nonexistent not found');
  });

  it('getStarCounts counts each exercise correctly', async () => {
    await saveLog(makeEntry({ uuid: 'c1', exercise: 'Squat' }));
    await saveLog(makeEntry({ uuid: 'c2', exercise: 'Squat' }));
    await saveLog(makeEntry({ uuid: 'c3', exercise: 'Bench Press' }));

    const counts = await getStarCounts();
    expect(counts['Squat']).toBe(2);
    expect(counts['Bench Press']).toBe(1);
  });

  it('todayStr returns YYYY-MM-DD format', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
