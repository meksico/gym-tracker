import { describe, it, expect } from 'vitest';
import { enqueuePost, enqueuePatch, getQueue, removeFromQueue } from '../../src/store/queueStore.js';

describe('queueStore', () => {
  it('enqueuePost adds a POST op to the queue', async () => {
    await enqueuePost({ uuid: 'p-1', exercise: 'Squat', weight: 100, reps: 5 });
    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('POST');
    expect(queue[0].uuid).toBe('p-1');
  });

  it('getQueue returns ops sorted oldest-first by id', async () => {
    await enqueuePost({ uuid: 'first', exercise: 'A', weight: 1, reps: 1 });
    await enqueuePost({ uuid: 'second', exercise: 'B', weight: 1, reps: 1 });
    const queue = await getQueue();
    expect(queue[0].uuid).toBe('first');
    expect(queue[1].uuid).toBe('second');
  });

  it('enqueuePatch adds a PATCH op', async () => {
    await enqueuePatch('u-1', { uuid: 'u-1', weight: 50, reps: 10 });
    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe('PATCH');
    expect(queue[0].uuid).toBe('u-1');
  });

  it('enqueuePatch deduplicates: second call for same uuid replaces the first', async () => {
    await enqueuePatch('u-2', { uuid: 'u-2', weight: 50, reps: 10 });
    await enqueuePatch('u-2', { uuid: 'u-2', weight: 60, reps: 12 });

    const queue = await getQueue();
    const patches = queue.filter(op => op.type === 'PATCH' && op.uuid === 'u-2');
    expect(patches).toHaveLength(1);
    expect(patches[0].payload.weight).toBe(60);
  });

  it('enqueuePatch does NOT dedup across different uuids', async () => {
    await enqueuePatch('u-a', { uuid: 'u-a', weight: 50, reps: 10 });
    await enqueuePatch('u-b', { uuid: 'u-b', weight: 60, reps: 12 });

    const queue = await getQueue();
    expect(queue).toHaveLength(2);
  });

  it('removeFromQueue deletes the op by id', async () => {
    await enqueuePost({ uuid: 'del-me', exercise: 'X', weight: 1, reps: 1 });
    const before = await getQueue();
    expect(before).toHaveLength(1);

    await removeFromQueue(before[0].id);
    const after = await getQueue();
    expect(after).toHaveLength(0);
  });

  it('POST and PATCH coexist in the queue', async () => {
    await enqueuePost({ uuid: 'post-1', exercise: 'A', weight: 1, reps: 1 });
    await enqueuePatch('patch-1', { uuid: 'patch-1', weight: 2, reps: 2 });

    const queue = await getQueue();
    expect(queue).toHaveLength(2);
    const types = queue.map(op => op.type).sort();
    expect(types).toEqual(['PATCH', 'POST']);
  });
});
