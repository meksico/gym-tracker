import { IDBFactory } from 'fake-indexeddb';
import { resetDb } from '../src/store/db.js';

// Each test gets a completely fresh IndexedDB instance — no bleed between tests.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetDb();
});

afterEach(() => {
  vi.restoreAllMocks();
});
