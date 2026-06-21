import { h, ui } from './tp7-ui.js';
import { initAuth, signIn } from '../auth/auth.js';

export function ensureAuth() {
  return new Promise((resolve) => {
    let uiRendered = false;

    function getOrCreateUI() {
      if (uiRendered) return document.getElementById('login-card');
      uiRendered = true;

      const app = document.getElementById('app');
      app.innerHTML = '';

      const screen = h('div', { class: 'setup-screen' });

      const card = h('div', {
        id: 'login-card',
        class: 'tp7-card',
        style: 'text-align:center;display:flex;flex-direction:column;gap:16px;padding:32px 24px;width:100%',
      });

      const icon = document.createElement('div');
      icon.style.fontSize = '40px';
      icon.textContent = '💪';

      const title = h('div', {
        style: 'font:var(--weight-bold) var(--text-lg)/1 var(--font-expanded);letter-spacing:.02em',
      }, "GYM_LOGS");

      const desc = h('div', {
        style: 'font:var(--type-body);color:var(--text-secondary)',
      }, "Увійдіть через Google щоб продовжити");

      const btnContainer = h('div', {
        id: 'login-btn-container',
        style: 'display:flex;justify-content:center;min-height:44px',
      });

      const errorEl = document.createElement('p');
      errorEl.id = 'login-error';
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
      container.replaceChildren();
      const btn = ui.button("УВІЙТИ ЧЕРЕЗ GOOGLE", { variant: 'routine', size: 'lg', block: true });
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
      if (container) container.replaceChildren();
      const el = document.getElementById('login-error');
      if (!el) return;
      el.style.display = '';
      el.textContent = '';

      const line1 = document.createElement('span');
      line1.textContent = "⛔ Доступ заборонено для ";
      const bold = document.createElement('strong');
      bold.textContent = userInfo.email;
      line1.appendChild(bold);

      const line2 = document.createElement('span');
      line2.textContent = "Надішліть свій ID адміністратору:";

      const code = document.createElement('code');
      code.style.cssText = 'user-select:all;word-break:break-all;display:block;margin-top:4px;font-family:var(--font-mono)';
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
      resolve();
    });
  });
}
