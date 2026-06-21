import { initAuth, signIn } from '../auth/auth.js';

export function renderLoginScreen() {
  return new Promise((resolve) => {
    const app = document.getElementById('app');
    app.innerHTML = '';

    const screen = document.createElement('div');
    screen.className = 'setup-screen';

    const card = document.createElement('div');
    card.className = 'setup-card';

    const icon = document.createElement('div');
    icon.className = 'setup-card__icon';
    icon.textContent = '💪';

    const title = document.createElement('h2');
    title.textContent = 'Gym Logs';

    const desc = document.createElement('p');
    desc.textContent = 'Увійдіть через Google щоб продовжити';

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;justify-content:center;min-height:44px;margin-top:8px';

    const errorEl = document.createElement('p');
    errorEl.className = 'settings-status settings-status--error';
    errorEl.style.display = 'none';

    card.append(icon, title, desc, btnContainer, errorEl);
    screen.appendChild(card);
    app.appendChild(screen);

    function showSignInButton() {
      btnContainer.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'btn btn--primary';
      btn.textContent = 'Увійти через Google';
      btn.addEventListener('click', () => signIn());
      btnContainer.appendChild(btn);
    }

    function showAccessDenied(userInfo) {
      btnContainer.innerHTML = '';
      errorEl.style.display  = '';
      errorEl.innerHTML = `⛔ Доступ заборонено для <strong>${userInfo.email}</strong>.<br>
        Надішліть свій ID адміністратору:<br>
        <code style="user-select:all;word-break:break-all">${userInfo.sub}</code>`;
    }

    initAuth((result) => {
      if (result.gsiUnavailable) {
        errorEl.style.display = '';
        errorEl.textContent   = "⚠ Не вдалося завантажити Google Sign-In. Перевірте з'єднання.";
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
      // Authenticated and allowed — proceed
      resolve();
    });
  });
}
