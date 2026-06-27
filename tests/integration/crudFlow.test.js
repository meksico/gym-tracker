import { describe, it, expect } from 'vitest';
import { saveLog, updateLog, getTodayLogs, getLogsByExercise, getLogByUuid, getStarCounts, todayStr } from '../../src/store/logStore.js';
import { enqueuePost, enqueuePatch, getQueue } from '../../src/store/queueStore.js';

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

describe('crudFlow: full local lifecycle', () => {
  it('save → retrieve → update → retrieve (happy path)', async () => {
    const entry = makeEntry({ uuid: 'flow-1', weight: 80, reps: 10 });

    // Save
    await saveLog(entry);
    const after_save = await getLogByUuid('flow-1');
    expect(after_save).toMatchObject({ weight: 80, reps: 10 });

    // Update
    await updateLog('flow-1', { weight: 90, reps: 8 });
    const after_update = await getLogByUuid('flow-1');
    expect(after_update.weight).toBe(90);
    expect(after_update.reps).toBe(8);
    expect(after_update.exercise).toBe('Bench Press'); // unchanged
  });

  it('save multiple sets → getLogsByExercise returns all, sorted by ts', async () => {
    await saveLog(makeEntry({ uuid: 's1', exercise: 'Squat', ts: 1000 }));
    await saveLog(makeEntry({ uuid: 's2', exercise: 'Squat', ts: 2000 }));
    await saveLog(makeEntry({ uuid: 's3', exercise: 'Squat', ts: 3000 }));
    await saveLog(makeEntry({ uuid: 'other', exercise: 'Deadlift', ts: 500 }));

    const squats = await getLogsByExercise('Squat');
    expect(squats).toHaveLength(3);
    expect(squats.map(l => l.uuid)).toEqual(['s1', 's2', 's3']);
  });

  it('getTodayLogs excludes entries from other days', async () => {
    await saveLog(makeEntry({ uuid: 'today-1' }));
    await saveLog(makeEntry({ uuid: 'old', date: '2020-01-01' }));

    const today = await getTodayLogs();
    expect(today.every(l => l.date === todayStr())).toBe(true);
    expect(today.find(l => l.uuid === 'old')).toBeUndefined();
  });

  it('getStarCounts reflects multiple saves and ignores other exercises', async () => {
    await saveLog(makeEntry({ uuid: 'sc1', exercise: 'Bench Press' }));
    await saveLog(makeEntry({ uuid: 'sc2', exercise: 'Bench Press' }));
    await saveLog(makeEntry({ uuid: 'sc3', exercise: 'Bench Press' }));
    await saveLog(makeEntry({ uuid: 'sc4', exercise: 'Squat' }));

    const counts = await getStarCounts();
    expect(counts['Bench Press']).toBe(3);
    expect(counts['Squat']).toBe(1);
  });
});

describe('crudFlow: queue integration', () => {
  it('saveLog + enqueuePost → queue contains POST op', async () => {
    const entry = makeEntry({ uuid: 'q-post-1' });
    await saveLog(entry);
    await enqueuePost(entry);

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('POST');
    expect(queue[0].uuid).toBe('q-post-1');
  });

  it('updateLog + enqueuePatch → queue contains PATCH op with latest values', async () => {
    const entry = makeEntry({ uuid: 'q-patch-1', weight: 80, reps: 10 });
    await saveLog(entry);
    await enqueuePost(entry);

    // Edit the set twice — only the last PATCH should remain
    await updateLog('q-patch-1', { weight: 85, reps: 9 });
    await enqueuePatch('q-patch-1', { uuid: 'q-patch-1', weight: 85, reps: 9 });

    await updateLog('q-patch-1', { weight: 90, reps: 8 });
    await enqueuePatch('q-patch-1', { uuid: 'q-patch-1', weight: 90, reps: 8 });

    const queue = await getQueue();
    const patches = queue.filter(op => op.type === 'PATCH');
    expect(patches).toHaveLength(1);
    expect(patches[0].payload.weight).toBe(90);

    // Local store should reflect the final update
    const stored = await getLogByUuid('q-patch-1');
    expect(stored.weight).toBe(90);
  });
});
