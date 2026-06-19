import { STORES } from '../config.js';
import { putInStore, getAllFromStore, deleteFromStore } from './db.js';

export async function enqueuePost(payload) {
  await putInStore(STORES.QUEUE, { type: 'POST', uuid: payload.uuid, payload, enqueuedAt: Date.now() });
}

export async function enqueuePatch(uuid, payload) {
  // Remove any older PATCH ops for this uuid before adding the new one
  const queue = await getQueue();
  for (const op of queue) {
    if (op.type === 'PATCH' && op.uuid === uuid) {
      await deleteFromStore(STORES.QUEUE, op.id);
    }
  }
  await putInStore(STORES.QUEUE, { type: 'PATCH', uuid, payload, enqueuedAt: Date.now() });
}

export async function getQueue() {
  const all = await getAllFromStore(STORES.QUEUE);
  return all.sort((a, b) => a.id - b.id); // oldest-first
}

export async function removeFromQueue(id) {
  await deleteFromStore(STORES.QUEUE, id);
}
