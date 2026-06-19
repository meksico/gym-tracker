import { STORES, META_KEYS } from '../config.js';
import { clearStore, putInStore, getAllFromStore, getFromStore } from './db.js';

export async function cacheRecentWeights(rows) {
  await clearStore(STORES.RECENT_WEIGHT);
  for (const row of rows) {
    await putInStore(STORES.RECENT_WEIGHT, row);
  }
  await putInStore(STORES.META, { key: META_KEYS.RECENT_WEIGHT_REFRESHED, value: Date.now() });
}

export async function getRecentWeightForExercise(exerciseName) {
  return getFromStore(STORES.RECENT_WEIGHT, exerciseName);
}
