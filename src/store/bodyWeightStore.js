import { STORES } from '../config.js';
import { putInStore, getFromStore } from './db.js';

export async function cacheBodyWeight(rows) {
  if (!rows.length) return;
  const latest = rows[rows.length - 1];
  await putInStore(STORES.BODY_WEIGHT, { key: 'latest', date: latest.date, weight: latest.weight });
}

export async function getLatestBodyWeight() {
  return getFromStore(STORES.BODY_WEIGHT, 'latest');
}
