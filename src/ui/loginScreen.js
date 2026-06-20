import { GOOGLE_CLIENT_ID, setGoogleUser } from '../config.js';

export async function renderLoginScreen() {
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
  desc.textContent = "Увійдіть через Google щоб продовжити";

  const btnContainer = document.createElement('div');
  btnContainer.id = 'google-signin-btn';
  btnContainer.style.cssText = 'display:flex;justify-content:center;min-height:44px';

  const errorEl = document.createElement('p');
  errorEl.className = 'settings-status settings-status--error';
  errorEl.style.display = 'none';

  card.append(icon, title, desc, btnContainer, errorEl);
  screen.appendChild(card);
  app.appendChild(screen);

  await waitForGis();

  if (!window.google?.accounts?.id) {
    errorEl.style.display = '';
    errorEl.textContent = "⚠ Не вдалося завантажити Google Sign-In. Перевірте з'єднання.";
    return;
  }

  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      const payload = decodeJwt(response.credential);
      setGoogleUser({ email: payload.email, name: payload.name, picture: payload.picture });
      window.dispatchEvent(new Event('hashchange'));
    },
    auto_select: true,
  });

  window.google.accounts.id.renderButton(btnContainer, {
    theme: 'outline',
    size: 'large',
    width: 280,
    locale: 'uk',
  });

  window.google.accounts.id.prompt();
}

function waitForGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(timer);
        resolve();
      }
    }, 100);
    setTimeout(() => { clearInterval(timer); resolve(); }, 5000);
  });
}

function decodeJwt(token) {
  const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(base64));
}
