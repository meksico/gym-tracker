import { getQueue, removeFromQueue } from '../store/queueStore.js';
import { appendLog, updateLog, getRecentWeights, appendBodyWeight, getBodyWeights } from '../api/sheets.js';
import { cacheRecentWeights } from '../store/recentWeightStore.js';
import { cacheBodyWeight } from '../store/bodyWeightStore.js';
import { logger } from '../lib/logger.js';

let draining        = false;
let lastError       = null;
let lastErrorIsAuth = false;
let pendingCount    = 0;

// For tests: resets all module-level state.
export function _resetForTesting() {
  draining = false;
  lastError = null;
  lastErrorIsAuth = false;
  pendingCount = 0;
}

function isAuthError(msg) {
  return msg.includes('HTTP 401') || msg.includes('HTTP 403');
}

export function getSyncStatus() {
  return { lastError, lastErrorIsAuth, pendingCount };
}

export async function drainQueue() {
  if (draining || !navigator.onLine) return;
  draining = true;
  try {
    const queue = await getQueue();
    pendingCount = queue.length;
    if (queue.length > 0) logger.debug('sync', 'Drain started', { queueLength: queue.length });
    let synced = 0;
    for (const op of queue) {
      try {
        if (op.type === 'POST') {
          await appendLog(op.payload);
        } else if (op.type === 'PATCH') {
          await updateLog(op.uuid, op.payload);
        } else if (op.type === 'BODY_WEIGHT') {
          await appendBodyWeight(op.weight);
        }
        await removeFromQueue(op.id);
        synced++;
        pendingCount--;
        lastError = null;
        lastErrorIsAuth = false;
        logger.info('sync', 'Op synced', { opId: op.id, type: op.type, uuid: op.uuid });
      } catch (err) {
        lastError = err.message;
        logger.error('sync', 'Queue op failed', { opId: op.id, type: op.type, uuid: op.uuid, error: err.message });
        if (isAuthError(err.message)) {
          lastErrorIsAuth = true;
          logger.warn('sync', 'Auth error — session may have expired');
          window.dispatchEvent(new CustomEvent('sync-auth-expired'));
        } else {
          lastErrorIsAuth = false;
          window.dispatchEvent(new CustomEvent('sync-error', { detail: err.message }));
        }
        break;
      }
    }
    if (synced > 0) {
      try {
        const weights = await getRecentWeights();
        await cacheRecentWeights(weights);
      } catch (err) {
        logger.warn('sync', 'Recent-weight refresh failed', { error: err.message });
      }
      try {
        const bodyWeights = await getBodyWeights();
        await cacheBodyWeight(bodyWeights);
      } catch (err) {
        logger.warn('sync', 'Body-weight refresh failed', { error: err.message });
      }
    }
  } finally {
    draining = false;
  }
}

export function startSyncEngine() {
  window.addEventListener('online', () => {
    logger.info('sync', 'Online — draining queue');
    drainQueue();
  });
  window.addEventListener('auth-token-refreshed', () => {
    logger.info('sync', 'Token refreshed — draining queue');
    drainQueue();
  });
  drainQueue();
}
