export const DB_NAME    = 'gymTracker';
export const DB_VERSION = 1;

export const STORES = {
  PLAN:          'plan',
  RECENT_WEIGHT: 'recentWeight',
  LOGS:          'logs',
  QUEUE:         'queue',
  META:          'meta',
};

export const META_KEYS = {
  PLAN_REFRESHED:          'planRefreshed',
  RECENT_WEIGHT_REFRESHED: 'recentWeightRefreshed',
};

export const GOOGLE_CLIENT_ID = '239860888601-52ta8ut5tpgvrnhc4d9j2flq44ah2oot.apps.googleusercontent.com';
export const SHEET_ID         = '1lr7ZHvzGa03ZA10ys5xX_p6SRNAYmtbvfkU2_LRG1Ps';

// Allowlist by stable Google user ID (sub).
// To find your sub: sign in → if access is denied, your sub is shown on screen.
export const ALLOWED_USER_IDS = [];

export function isConfigured() {
  return Boolean(isAuthenticated());
}

export function isAuthenticated() {
  try {
    const raw = localStorage.getItem('gym_user_info');
    return Boolean(raw && JSON.parse(raw)?.sub);
  } catch { return false; }
}

export function getGoogleUser() {
  try {
    const raw = localStorage.getItem('gym_user_info');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
