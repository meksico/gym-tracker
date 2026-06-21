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
  if (!window.google?.accounts?.oauth2) {
    onResult({ needsButton: true, gsiUnavailable: true });
    return;
  }

  const session = loadSession();
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

  // Session valid but token expired — try silent refresh
  // NOTE: will fail on iOS Safari; onResult({needsButton}) fires if it does
  setupTokenClient(onResult);
  try {
    tokenClient.requestAccessToken({ prompt: '' });
  } catch {
    onResult({ needsButton: true });
  }
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
