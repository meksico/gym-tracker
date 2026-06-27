import { openDb } from '../store/db.js';
import { STORES, LOG_MAX_ENTRIES } from '../config.js';

const LEVEL_RANK = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const PERSIST_AT  = LEVEL_RANK.WARN; // WARN and above always persisted

function devMode() {
  try { return localStorage.getItem('gym_debug') === '1'; } catch { return false; }
}

async function persist(entry) {
  try {
    const db = await openDb();
    // Add entry
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.APP_LOG, 'readwrite');
      const store = tx.objectStore(STORES.APP_LOG);
      store.add(entry);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    // Ring-buffer: prune oldest entries when over limit
    await new Promise((resolve) => {
      const tx = db.transaction(STORES.APP_LOG, 'readwrite');
      const store = tx.objectStore(STORES.APP_LOG);
      const countReq = store.count();
      countReq.onsuccess = () => {
        const excess = countReq.result - LOG_MAX_ENTRIES;
        if (excess <= 0) { resolve(); return; }
        let deleted = 0;
        const cursorReq = store.openCursor();
        cursorReq.onsuccess = (e) => {
          const cursor = e.target.result;
          if (cursor && deleted < excess) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve();
          }
        };
        cursorReq.onerror = resolve;
      };
      countReq.onerror = resolve;
    });
  } catch {
    // Logging must never crash the app
  }
}

function emit(level, context, message, data) {
  const entry = { level, context, message, data, ts: Date.now() };

  if (level === 'ERROR')     console.error(`[${level}][${context}]`, message, ...(data !== undefined ? [data] : []));
  else if (level === 'WARN') console.warn(`[${level}][${context}]`, message, ...(data !== undefined ? [data] : []));
  else if (devMode())        console.log(`[${level}][${context}]`, message, ...(data !== undefined ? [data] : []));

  if (LEVEL_RANK[level] >= PERSIST_AT || devMode()) persist(entry);
}

export const logger = {
  debug: (context, message, data) => emit('DEBUG', context, message, data),
  info:  (context, message, data) => emit('INFO',  context, message, data),
  warn:  (context, message, data) => emit('WARN',  context, message, data),
  error: (context, message, data) => emit('ERROR', context, message, data),
};
