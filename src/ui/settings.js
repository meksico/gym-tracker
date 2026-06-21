import { h, icon, ui } from './tp7-ui.js';
import { getGoogleUser } from '../config.js';
import { signOut } from '../auth/auth.js';
import { navigate } from '../router.js';

export async function renderSettings() {
  const app = document.getElementById('app');
  app.innerHTML = '';

  const googleUser = getGoogleUser();

  // ── App bar ──
  app.appendChild(
    h('header', { class: 'appbar', style: 'padding:14px 16px' },
      ui.iconButton('back', { label: "Назад", onClick: () => navigate('#home') }),
      h('div', { style: 'font:var(--weight-bold) var(--text-lg)/1 var(--font-expanded)' },
        "НАЛАШТУВАННЯ")));

  // ── Scrollable body ──
  const scroll = h('div', { class: 'screen-scroll' });

  // Connection status chip (live dot)
  scroll.appendChild(
    h('div', { style: 'margin-bottom:4px' },
      h('span', {
        style: 'display:inline-flex;align-items:center;gap:8px;height:26px;padding:0 12px;' +
               'background:var(--bg-sunken);border:1px solid var(--border-channel);box-shadow:var(--shadow-inset);' +
               'border-radius:var(--radius-sm);font:var(--weight-bold) var(--text-2xs)/1 var(--font-mono);' +
               'letter-spacing:var(--tracking-wide);color:var(--text-secondary)',
      },
        h('span', { style: 'width:7px;height:7px;border-radius:50%;background:var(--orange-500);box-shadow:0 0 8px rgba(255,79,0,.6)' }),
        "ПІДКЛЮЧЕНО · GOOGLE SHEETS")));

  // Account card
  if (googleUser) {
    const initials = (googleUser.name || googleUser.email || 'G')
      .split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');

    scroll.appendChild(
      h('div', { class: 'tp7-card', style: 'border-radius:var(--radius-lg);padding:18px' },
        h('div', { style: 'display:flex;align-items:center;gap:14px;margin-bottom:16px' },
          h('div', {
            style: 'width:48px;height:48px;border-radius:50%;flex:none;' +
                   'background:radial-gradient(circle at 50% 35%,var(--grey-800),var(--grey-950));' +
                   'border:1px solid #000;box-shadow:var(--shadow-key);' +
                   'display:flex;align-items:center;justify-content:center;' +
                   'font:var(--weight-bold) 16px/1 var(--font-mono);color:var(--grey-50)',
          }, initials),
          h('div', {},
            h('div', { class: 'tp7-label' }, "GOOGLE АКАУНТ"),
            h('div', { style: 'margin-top:5px;font:var(--weight-medium) var(--text-sm)/1.3 var(--font-sans)' },
              googleUser.name || ''),
            h('div', { class: 'tp7-mono', style: 'font-size:var(--text-xs);color:var(--text-tertiary)' },
              googleUser.email || ''))),
        ui.button("ВИЙТИ З АКАУНТУ", {
          block: true,
          onClick: () => { signOut(); window.location.reload(); },
        })));
  }

  app.appendChild(scroll);
}
