import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAppVersion } from '../../src/lib/version.js';

const CACHE_KEY = 'gym_app_version';

function okJson(body) {
  return { ok: true, json: async () => body };
}

beforeEach(() => {
  localStorage.removeItem(CACHE_KEY);
});

afterEach(() => {
  localStorage.removeItem(CACHE_KEY);
});

describe('getAppVersion', () => {
  it('fetches the latest commit short SHA and caches it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(okJson({ sha: 'a1b2c3d4e5f6' })));

    const version = await getAppVersion();

    expect(version).toBe('a1b2c3d');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/meksico/gym-tracker/commits/main',
    );
    expect(localStorage.getItem(CACHE_KEY)).toBe('a1b2c3d');
  });

  it('falls back to the cached value when the fetch fails', async () => {
    localStorage.setItem(CACHE_KEY, 'cached1');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    const version = await getAppVersion();

    expect(version).toBe('cached1');
  });

  it('falls back to the cached value on a non-ok response', async () => {
    localStorage.setItem(CACHE_KEY, 'cached2');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }));

    const version = await getAppVersion();

    expect(version).toBe('cached2');
  });

  it('falls back to the cached value when offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    localStorage.setItem(CACHE_KEY, 'cached3');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const version = await getAppVersion();

    expect(version).toBe('cached3');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns a placeholder when offline with no cache', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const version = await getAppVersion();

    expect(version).toBe('—');
  });
});
