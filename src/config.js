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
