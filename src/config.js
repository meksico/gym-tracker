export const DB_NAME = 'gymTracker';
export const DB_VERSION = 1;

export const STORES = {
  PLAN: 'plan',
  RECENT_WEIGHT: 'recentWeight',
  LOGS: 'logs',
  QUEUE: 'queue',
  META: 'meta',
};

export const META_KEYS = {
  PLAN_REFRESHED: 'planRefreshed',
  RECENT_WEIGHT_REFRESHED: 'recentWeightRefreshed',
};

export function getGasUrl() {
  return localStorage.getItem('gasUrl') || '';
}

export function setGasUrl(url) {
  localStorage.setItem('gasUrl', url.trim());
}

export function isDemoMode() {
  return localStorage.getItem('demoMode') === 'true';
}

export function setDemoMode(value) {
  localStorage.setItem('demoMode', value ? 'true' : 'false');
}

export function isConfigured() {
  return Boolean(getGasUrl()) || isDemoMode();
}

export const GOOGLE_CLIENT_ID = '239860888601-52ta8ut5tpgvrnhc4d9j2flq44ah2oot.apps.googleusercontent.com';

export const ALLOWED_EMAILS = ['eugene@garkavtcev.com'];

export function getGoogleUser() {
  try {
    const raw = localStorage.getItem('googleUser');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setGoogleUser({ email, name, picture }) {
  localStorage.setItem('googleUser', JSON.stringify({ email, name, picture }));
}

export function clearGoogleUser() {
  localStorage.removeItem('googleUser');
}

export function isAuthenticated() {
  return Boolean(getGoogleUser());
}
