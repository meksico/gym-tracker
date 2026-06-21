import { getQueue, removeFromQueue } from '../store/queueStore.js';
import { appendLog, updateLog, getRecentWeights } from '../api/sheets.js';
import { cacheRecentWeights } from '../store/recentWeightStore.js';

let draining = false;

export async function drainQueue() {
  if (draining || !navigator.onLine) return;
  draining = true;
  try {
    const queue = await getQueue();
    let synced = 0;
    for (const op of queue) {
      try {
        if (op.type === 'POST') {
          await appendLog(op.payload);
        } else if (op.type === 'PATCH') {
          await updateLog(op.uuid, op.payload);
        }
        await removeFromQueue(op.id);
        synced++;
      } catch (err) {
        console.warn(`Sync: op ${op.id} failed, will retry on next drain:`, err.message);
        break;
      }
    }
    if (synced > 0) {
      try {
        const weights = await getRecentWeights();
        await cacheRecentWeights(weights);
      } catch (err) {
        console.warn('Sync: recent-weight refresh failed:', err.message);
      }
    }
  } finally {
    draining = false;
  }
}

export function startSyncEngine() {
  window.addEventListener('online', () => {
    console.log('Sync: online — draining queue');
    drainQueue();
  });
  drainQueue();
}
