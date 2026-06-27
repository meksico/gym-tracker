import { describe, it, expect } from 'vitest';
import { openDb, getAllFromStore, putInStore, getFromStore, clearStore, deleteFromStore } from '../../src/store/db.js';
import { STORES } from '../../src/config.js';

describe('db helpers', () => {
  it('putInStore and getFromStore round-trip', async () => {
    await openDb();
    await putInStore(STORES.META, { key: 'test', value: 42 });
    const result = await getFromStore(STORES.META, 'test');
    expect(result).toEqual({ key: 'test', value: 42 });
  });

  it('getAllFromStore returns all entries', async () => {
    await openDb();
    await putInStore(STORES.META, { key: 'a', value: 1 });
    await putInStore(STORES.META, { key: 'b', value: 2 });
    const all = await getAllFromStore(STORES.META);
    expect(all).toHaveLength(2);
  });

  it('getFromStore returns undefined for missing key', async () => {
    await openDb();
    const result = await getFromStore(STORES.META, 'nonexistent');
    expect(result).toBeUndefined();
  });

  it('clearStore empties the store', async () => {
    await openDb();
    await putInStore(STORES.META, { key: 'x', value: 99 });
    await clearStore(STORES.META);
    const all = await getAllFromStore(STORES.META);
    expect(all).toHaveLength(0);
  });

  it('deleteFromStore removes the entry', async () => {
    await openDb();
    await putInStore(STORES.META, { key: 'del', value: 1 });
    await deleteFromStore(STORES.META, 'del');
    const result = await getFromStore(STORES.META, 'del');
    expect(result).toBeUndefined();
  });

  it('putInStore overwrites an existing entry with the same key', async () => {
    await openDb();
    await putInStore(STORES.META, { key: 'k', value: 1 });
    await putInStore(STORES.META, { key: 'k', value: 2 });
    const all = await getAllFromStore(STORES.META);
    expect(all).toHaveLength(1);
    expect(all[0].value).toBe(2);
  });
});
