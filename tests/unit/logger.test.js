import { describe, it, expect } from 'vitest';
import { logger } from '../../src/lib/logger.js';
import { openDb, getAllFromStore } from '../../src/store/db.js';
import { STORES } from '../../src/config.js';

// logger.persist() is fire-and-forget; this waits for all pending async work.
const flush = () => new Promise(r => setTimeout(r, 30));

describe('logger', () => {
  it('error() persists an entry to IndexedDB', async () => {
    await openDb();
    logger.error('test', 'Something broke', { code: 500 });
    await flush();

    const entries = await getAllFromStore(STORES.APP_LOG);
    const entry = entries.find(e => e.message === 'Something broke');
    expect(entry).toBeDefined();
    expect(entry.level).toBe('ERROR');
    expect(entry.context).toBe('test');
    expect(entry.data).toEqual({ code: 500 });
    expect(typeof entry.ts).toBe('number');
  });

  it('warn() persists an entry to IndexedDB', async () => {
    await openDb();
    logger.warn('test', 'Watch out');
    await flush();

    const entries = await getAllFromStore(STORES.APP_LOG);
    const entry = entries.find(e => e.message === 'Watch out');
    expect(entry?.level).toBe('WARN');
  });

  it('info() does NOT persist when gym_debug is unset', async () => {
    await openDb();
    // localStorage.getItem('gym_debug') returns null in jsdom by default
    logger.info('test', 'Just an info message');
    await flush();

    const entries = await getAllFromStore(STORES.APP_LOG);
    const entry = entries.find(e => e.message === 'Just an info message');
    expect(entry).toBeUndefined();
  });

  it('info() DOES persist when gym_debug=1', async () => {
    localStorage.setItem('gym_debug', '1');
    await openDb();
    logger.info('test', 'Dev mode info');
    await flush();

    const entries = await getAllFromStore(STORES.APP_LOG);
    const entry = entries.find(e => e.message === 'Dev mode info');
    expect(entry?.level).toBe('INFO');
    localStorage.removeItem('gym_debug');
  });

  it('entry has correct shape (level, context, message, data, ts)', async () => {
    await openDb();
    const before = Date.now();
    logger.error('ctx', 'shaped entry', { x: 1 });
    await flush();
    const after = Date.now();

    const entries = await getAllFromStore(STORES.APP_LOG);
    const entry = entries.find(e => e.message === 'shaped entry');
    expect(entry.level).toBe('ERROR');
    expect(entry.context).toBe('ctx');
    expect(entry.data).toEqual({ x: 1 });
    expect(entry.ts).toBeGreaterThanOrEqual(before);
    expect(entry.ts).toBeLessThanOrEqual(after);
  });

  it('entries without data are stored with data=undefined', async () => {
    await openDb();
    logger.warn('ctx', 'no data');
    await flush();

    const entries = await getAllFromStore(STORES.APP_LOG);
    const entry = entries.find(e => e.message === 'no data');
    expect(entry).toBeDefined();
    expect(entry.data).toBeUndefined();
  });
});
