import { logger } from './logger.js';

const REPO = 'meksico/gym-tracker';
const CACHE_KEY = 'gym_app_version';

// Live-fetches the latest deployed commit (short SHA) from GitHub, caching it
// locally so the version still displays when offline or rate-limited.
export async function getAppVersion() {
  if (navigator.onLine) {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/commits/main`);
      if (res.ok) {
        const { sha } = await res.json();
        const version = sha.slice(0, 7);
        localStorage.setItem(CACHE_KEY, version);
        return version;
      }
    } catch (err) {
      logger.warn('version', 'GitHub version fetch failed', { error: err.message });
    }
  }
  return localStorage.getItem(CACHE_KEY) || '—';
}
