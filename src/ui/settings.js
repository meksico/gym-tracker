import { getGoogleUser } from '../config.js';
import { signOut } from '../auth/auth.js';
import { navigate } from '../router.js';

export async function renderSettings() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const googleUser = getGoogleUser();

  // ── Header ──
  const header = document.createElement('header');
  header.className = 'app-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-icon';
  backBtn.setAttribute('aria-label', 'Назад');
  backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
  backBtn.addEventListener('click', () => navigate('#home'));
  header.appendChild(backBtn);

  const titleGroup = document.createElement('div');
  titleGroup.className = 'app-header__titles';
  const titleEl = document.createElement('h1');
  titleEl.className = 'app-header__title';
  titleEl.textContent = 'Налаштування';
  titleGroup.appendChild(titleEl);
  header.appendChild(titleGroup);
  app.appendChild(header);

  const main = document.createElement('main');
  main.className = 'main';

  // ── Connection status chip ──
  const statusChip = document.createElement('div');
  statusChip.className = 'status-chip status-chip--connected';
  statusChip.textContent = '● Підключено до Google Sheets';
  main.appendChild(statusChip);

  // ── Account card ──
  if (googleUser) {
    const accountCard = document.createElement('div');
    accountCard.className = 'settings-card';

    const accountTitle = document.createElement('p');
    accountTitle.className = 'settings-card__title';
    accountTitle.textContent = 'Google акаунт';

    const accountDesc = document.createElement('p');
    accountDesc.className = 'settings-card__desc';
    accountDesc.textContent = googleUser.name
      ? `Увійшли як ${googleUser.name} (${googleUser.email})`
      : googleUser.email;

    if (googleUser.picture) {
      const avatar = document.createElement('img');
      avatar.src   = googleUser.picture;
      avatar.alt   = googleUser.name || googleUser.email;
      avatar.style.cssText = 'width:40px;height:40px;border-radius:50%;margin-bottom:8px;display:block';
      accountCard.appendChild(avatar);
    }

    const signOutBtn = document.createElement('button');
    signOutBtn.className = 'btn btn--secondary';
    signOutBtn.textContent = 'Вийти з акаунту';
    signOutBtn.addEventListener('click', () => {
      signOut();
      window.location.reload();
    });

    accountCard.append(accountTitle, accountDesc, signOutBtn);
    main.appendChild(accountCard);
  }

  app.appendChild(main);
}
