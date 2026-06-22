import { GOOGLE_CLIENT_ID, ALLOWED_USER_IDS } from '../config.js';

const SCOPE      = 'https://www.googleapis.com/auth/spreadsheets openid email profile';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const LS_TOKEN   = 'gym_access_token';
const LS_EXPIRY  = 'gym_token_expiry';
const LS_USER    = 'gym_user_info';
const LS_SESSION = 'gym_session_expiry';

let accessToken     = null;
let currentUserInfo = null;
let tokenClient     = null;

export function getAccessToken() { return accessToken; }
export function getUserInfo()    { return currentUserInfo; }

function tokenValid() {
  const exp = parseInt(localStorage.getItem(LS_EXPIRY) || '0', 10);
  return Date.now() < exp && !!localStorage.getItem(LS_TOKEN);
}

function loadSession() {
  const session = parseInt(localStorage.getItem(LS_SESSION) || '0', 10);
  if (Date.now() > session) return null;
  return {
    token:    localStorage.getItem(LS_TOKEN),
    userInfo: JSON.parse(localStorage.getItem(LS_USER) || 'null'),
  };
}

function saveToken(response) {
  accessToken = response.access_token;
  const exp   = Date.now() + (response.expires_in - 60) * 1000;
  localStorage.setItem(LS_TOKEN,   accessToken);
  localStorage.setItem(LS_EXPIRY,  String(exp));
  localStorage.setItem(LS_SESSION, String(Date.now() + SESSION_MS));
}

async function fetchUserInfo() {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.json();
}

function setupTokenClient(onResult) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope:     SCOPE,
    callback:  async (response) => {
      if (response.error) { onResult({ needsButton: true }); return; }
      saveToken(response);
      if (!currentUserInfo) {
        currentUserInfo = await fetchUserInfo();
        localStorage.setItem(LS_USER, JSON.stringify(currentUserInfo));
      }
      window.dispatchEvent(new CustomEvent('auth-token-refreshed'));
      const allowed = ALLOWED_USER_IDS.includes(currentUserInfo.sub);
      onResult({ allowed, userInfo: currentUserInfo });
    },
  });
}

function waitForGsi() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (window.google?.accounts?.oauth2) { clearInterval(timer); resolve(); }
    }, 100);
    setTimeout(() => { clearInterval(timer); resolve(); }, 5000);
  });
}

export async function initAuth(onResult) {
  await waitForGsi();

  const session = loadSession();

  if (!window.google?.accounts?.oauth2) {
    // GSI script unavailable (offline or blocked). If a session exists, let the
    // app load from cache — sync will prompt re-auth when it eventually fails.
    if (session) {
      currentUserInfo = session.userInfo;
      const allowed = ALLOWED_USER_IDS.includes(currentUserInfo?.sub);
      onResult({ allowed, userInfo: currentUserInfo, tokenExpired: true });
    } else {
      onResult({ needsButton: true, gsiUnavailable: true });
    }
    return;
  }

  if (!session) {
    setupTokenClient(onResult);
    onResult({ needsButton: true });
    return;
  }

  // Token still valid — use it immediately
  if (tokenValid()) {
    accessToken     = session.token;
    currentUserInfo = session.userInfo;
    setupTokenClient(onResult);
    const allowed = ALLOWED_USER_IDS.includes(currentUserInfo?.sub);
    onResult({ allowed, userInfo: currentUserInfo });
    return;
  }

  // Session valid but access token expired. Don't attempt silent refresh —
  // iOS Safari blocks the required popup when there's no user gesture.
  // The app loads normally; the sync engine will emit sync-auth-expired
  // when it hits a 401, and the banner CTA re-auths via user gesture.
  currentUserInfo = session.userInfo;
  setupTokenClient(onResult);
  const allowed = ALLOWED_USER_IDS.includes(currentUserInfo?.sub);
  onResult({ allowed, userInfo: currentUserInfo, tokenExpired: true });
}

export function signIn() {
  tokenClient.requestAccessToken({ prompt: 'select_account' });
}

export function signOut() {
  [LS_TOKEN, LS_EXPIRY, LS_USER, LS_SESSION].forEach(k => localStorage.removeItem(k));
  if (accessToken) window.google.accounts.oauth2.revoke(accessToken, () => {});
  accessToken = null;
  currentUserInfo = null;
}
