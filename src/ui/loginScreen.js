import { initAuth, signIn } from '../auth/auth.js';

// Ensures the user is authenticated before the app routes to content.
// - If token is cached and valid: resolves immediately (no UI shown).
// - If sign-in is needed: renders the login screen and resolves after success.
// - initAuth() is always called so the access token is restored into memory.
export function ensureAuth() {
  return new Promise((resolve) => {
    let uiRendered = false;

    function getOrCreateUI() {
      if (uiRendered) return document.getElementById('login-card');
      uiRendered = true;

      const app = document.getElementById('app');
      app.innerHTML = '';

      const screen = document.createElement('div');
      screen.className = 'setup-screen';

      const card = document.createElement('div');
      card.id        = 'login-card';
      card.className = 'setup-card';

      const icon = document.createElement('div');
      icon.className  = 'setup-card__icon';
      icon.textContent = '💪';

      const title = document.createElement('h2');
      title.textContent = 'Gym Logs';

      const desc = document.createElement('p');
      desc.textContent = 'Увійдіть через Google щоб продовжити';

      const btnContainer = document.createElement('div');
      btnContainer.id        = 'login-btn-container';
      btnContainer.style.cssText = 'display:flex;justify-content:center;min-height:44px;margin-top:8px';

      const errorEl = document.createElement('p');
      errorEl.id        = 'login-error';
      errorEl.className = 'settings-status settings-status--error';
      errorEl.style.display = 'none';

      card.append(icon, title, desc, btnContainer, errorEl);
      screen.appendChild(card);
      app.appendChild(screen);
      return card;
    }

    function showSignInButton() {
      getOrCreateUI();
      const container = document.getElementById('login-btn-container');
      if (!container) return;
      container.innerHTML = '';
      const btn = document.createElement('button');
      btn.className   = 'btn btn--primary';
      btn.textContent = 'Увійти через Google';
      btn.addEventListener('click', () => signIn());
      container.appendChild(btn);
    }

    function showError(text) {
      getOrCreateUI();
      const el = document.getElementById('login-error');
      if (!el) return;
      el.style.display = '';
      el.textContent = text;
    }

    function showAccessDenied(userInfo) {
      getOrCreateUI();
      const container = document.getElementById('login-btn-container');
      if (container) container.innerHTML = '';
      const el = document.getElementById('login-error');
      if (!el) return;
      el.style.display = '';
      el.textContent = '';

      const line1 = document.createElement('span');
      line1.textContent = `⛔ Доступ заборонено для `;
      const bold = document.createElement('strong');
      bold.textContent = userInfo.email;
      line1.appendChild(bold);

      const line2 = document.createElement('span');
      line2.textContent = 'Надішліть свій ID адміністратору:';

      const code = document.createElement('code');
      code.style.cssText = 'user-select:all;word-break:break-all;display:block;margin-top:4px';
      code.textContent = userInfo.sub;

      el.append(line1, document.createElement('br'), line2, code);
    }

    initAuth((result) => {
      if (result.gsiUnavailable) {
        showError("⚠ Не вдалося завантажити Google Sign-In. Перевірте з'єднання.");
        return;
      }
      if (result.needsButton) {
        showSignInButton();
        return;
      }
      if (!result.allowed) {
        showAccessDenied(result.userInfo);
        return;
      }
      // Authenticated and allowed — resolve without showing any UI
      resolve();
    });
  });
}
