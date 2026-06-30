import { STORES } from '../config.js';
import { putInStore, getAllFromStore, deleteFromStore } from './db.js';
import { logger } from '../lib/logger.js';

export async function enqueuePost(payload) {
  await putInStore(STORES.QUEUE, { type: 'POST', uuid: payload.uuid, payload, enqueuedAt: Date.now() });
  logger.debug('queue', 'POST enqueued', { uuid: payload.uuid });
}

export async function enqueuePatch(uuid, payload) {
  // Remove any older PATCH ops for this uuid before adding the new one
  const queue = await getQueue();
  let removed = 0;
  for (const op of queue) {
    if (op.type === 'PATCH' && op.uuid === uuid) {
      await deleteFromStore(STORES.QUEUE, op.id);
      removed++;
    }
  }
  if (removed > 0) logger.debug('queue', 'PATCH deduped', { uuid, removed });
  await putInStore(STORES.QUEUE, { type: 'PATCH', uuid, payload, enqueuedAt: Date.now() });
  logger.debug('queue', 'PATCH enqueued', { uuid });
}

export async function enqueueBodyWeight(weight) {
  await putInStore(STORES.QUEUE, { type: 'BODY_WEIGHT', weight, enqueuedAt: Date.now() });
  logger.debug('queue', 'BODY_WEIGHT enqueued', { weight });
}

export async function getQueue() {
  const all = await getAllFromStore(STORES.QUEUE);
  return all.sort((a, b) => a.id - b.id); // oldest-first
}

export async function removeFromQueue(id) {
  await deleteFromStore(STORES.QUEUE, id);
  logger.debug('queue', 'Op removed', { id });
}
