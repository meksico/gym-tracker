import { STORES } from '../config.js';
import { putInStore, getAllFromStore, getFromStore } from './db.js';
import { logger } from '../lib/logger.js';

export function todayStr() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function saveLog(entry) {
  await putInStore(STORES.LOGS, entry);
  logger.info('logStore', 'Set saved', { uuid: entry.uuid, exercise: entry.exercise, weight: entry.weight, reps: entry.reps });
}

export async function getTodayLogs() {
  const all = await getAllFromStore(STORES.LOGS);
  const today = todayStr();
  return all.filter((l) => l.date === today);
}

export async function getLogsByExercise(exerciseName) {
  const logs = await getTodayLogs();
  return logs
    .filter((l) => l.exercise === exerciseName)
    .sort((a, b) => (a.ts || 0) - (b.ts || 0));
}

export async function getLogByUuid(uuid) {
  return getFromStore(STORES.LOGS, uuid);
}

export async function getStarCounts() {
  const logs = await getTodayLogs();
  const counts = {};
  for (const log of logs) {
    counts[log.exercise] = (counts[log.exercise] || 0) + 1;
  }
  return counts;
}

export async function updateLog(uuid, patch) {
  const existing = await getLogByUuid(uuid);
  if (!existing) {
    logger.warn('logStore', 'updateLog: uuid not found', { uuid });
    throw new Error(`Log ${uuid} not found`);
  }
  await putInStore(STORES.LOGS, { ...existing, ...patch });
  logger.info('logStore', 'Set updated', { uuid, patch });
}
