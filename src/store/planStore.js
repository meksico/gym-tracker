import { STORES, META_KEYS } from '../config.js';
import { clearStore, putInStore, getAllFromStore, getFromStore } from './db.js';

export async function cachePlan(rows) {
  await clearStore(STORES.PLAN);
  for (const row of rows) {
    await putInStore(STORES.PLAN, row);
  }
  await putInStore(STORES.META, { key: META_KEYS.PLAN_REFRESHED, value: Date.now() });
}

export async function getPlan() {
  return getAllFromStore(STORES.PLAN);
}

export async function getPlanLastRefreshed() {
  const meta = await getFromStore(STORES.META, META_KEYS.PLAN_REFRESHED);
  return meta ? meta.value : null;
}
