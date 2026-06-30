import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueuePost, enqueuePatch, enqueueBodyWeight, getQueue } from '../../src/store/queueStore.js';
import { drainQueue, getSyncStatus, _resetForTesting } from '../../src/sync/syncEngine.js';
import { getLatestBodyWeight } from '../../src/store/bodyWeightStore.js';

// Replace the real Sheets API with controllable mocks
vi.mock('../../src/api/sheets.js', () => ({
  appendLog:        vi.fn(),
  updateLog:        vi.fn(),
  getRecentWeights: vi.fn().mockResolvedValue([]),
  appendBodyWeight: vi.fn(),
  getBodyWeights:   vi.fn().mockResolvedValue([]),
}));

import { appendLog, updateLog, getRecentWeights, appendBodyWeight, getBodyWeights } from '../../src/api/sheets.js';

beforeEach(() => {
  _resetForTesting();
  vi.clearAllMocks();
  appendLog.mockResolvedValue(5);
  updateLog.mockResolvedValue(undefined);
  getRecentWeights.mockResolvedValue([]);
  appendBodyWeight.mockResolvedValue(undefined);
  getBodyWeights.mockResolvedValue([]);
  // jsdom's navigator.onLine is true by default
});

describe('syncFlow: POST', () => {
  it('drains a POST op and removes it from the queue', async () => {
    await enqueuePost({ uuid: 'p-1', exercise: 'Squat', weight: 100, reps: 5 });
    expect(await getQueue()).toHaveLength(1);

    await drainQueue();

    expect(appendLog).toHaveBeenCalledOnce();
    expect(appendLog).toHaveBeenCalledWith(
      expect.objectContaining({ uuid: 'p-1', exercise: 'Squat' }),
    );
    expect(await getQueue()).toHaveLength(0);
    expect(getSyncStatus().lastError).toBeNull();
  });

  it('drains multiple POST ops in order', async () => {
    await enqueuePost({ uuid: 'first',  exercise: 'A', weight: 1, reps: 1 });
    await enqueuePost({ uuid: 'second', exercise: 'B', weight: 2, reps: 2 });

    await drainQueue();

    expect(appendLog).toHaveBeenCalledTimes(2);
    expect(appendLog.mock.calls[0][0].uuid).toBe('first');
    expect(appendLog.mock.calls[1][0].uuid).toBe('second');
    expect(await getQueue()).toHaveLength(0);
  });
});

describe('syncFlow: PATCH', () => {
  it('drains a PATCH op and calls updateLog', async () => {
    await enqueuePatch('u-1', { uuid: 'u-1', weight: 90, reps: 8 });

    await drainQueue();

    expect(updateLog).toHaveBeenCalledOnce();
    expect(updateLog).toHaveBeenCalledWith('u-1', expect.objectContaining({ weight: 90 }));
    expect(await getQueue()).toHaveLength(0);
  });

  it('second enqueuePatch for same uuid results in one updateLog call', async () => {
    await enqueuePatch('u-2', { uuid: 'u-2', weight: 50, reps: 10 });
    await enqueuePatch('u-2', { uuid: 'u-2', weight: 60, reps: 12 });

    await drainQueue();

    expect(updateLog).toHaveBeenCalledOnce();
    expect(updateLog.mock.calls[0][1].weight).toBe(60);
  });
});

describe('syncFlow: BODY_WEIGHT', () => {
  it('drains a BODY_WEIGHT op and calls appendBodyWeight', async () => {
    await enqueueBodyWeight(80.2);

    await drainQueue();

    expect(appendBodyWeight).toHaveBeenCalledOnce();
    expect(appendBodyWeight).toHaveBeenCalledWith(80.2);
    expect(await getQueue()).toHaveLength(0);
  });

  it('refreshes the cached latest body weight after a successful sync', async () => {
    getBodyWeights.mockResolvedValue([{ date: '06/30/2026', weight: 80.2 }]);
    await enqueueBodyWeight(80.2);

    await drainQueue();

    const latest = await getLatestBodyWeight();
    expect(latest).toEqual({ key: 'latest', date: '06/30/2026', weight: 80.2 });
  });
});

describe('syncFlow: error handling', () => {
  it('stops draining on auth error (401) and emits sync-auth-expired', async () => {
    appendLog.mockRejectedValue(new Error('Sheets append failed (HTTP 401): Unauthorized'));

    await enqueuePost({ uuid: 'fail-1', exercise: 'X', weight: 1, reps: 1 });
    await enqueuePost({ uuid: 'fail-2', exercise: 'Y', weight: 1, reps: 1 });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    await drainQueue();

    const { lastError, lastErrorIsAuth } = getSyncStatus();
    expect(lastError).toMatch(/401/);
    expect(lastErrorIsAuth).toBe(true);
    // First op failed → second op should still be in the queue
    expect(await getQueue()).toHaveLength(2);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sync-auth-expired' }),
    );
  });

  it('stops draining on network error and emits sync-error', async () => {
    appendLog.mockRejectedValue(new Error('Failed to fetch'));

    await enqueuePost({ uuid: 'net-fail', exercise: 'Z', weight: 1, reps: 1 });

    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    await drainQueue();

    const { lastError, lastErrorIsAuth } = getSyncStatus();
    expect(lastError).toBeTruthy();
    expect(lastErrorIsAuth).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'sync-error' }),
    );
  });

  it('does nothing when queue is empty', async () => {
    await drainQueue();
    expect(appendLog).not.toHaveBeenCalled();
    expect(updateLog).not.toHaveBeenCalled();
  });

  it('does not drain when navigator is offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await enqueuePost({ uuid: 'offline', exercise: 'X', weight: 1, reps: 1 });

    await drainQueue();

    expect(appendLog).not.toHaveBeenCalled();
    expect(await getQueue()).toHaveLength(1);
  });
});
