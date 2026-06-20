export function chipEl(label, isActive, onClick) {
  const btn = document.createElement('button');
  btn.className = `chip${isActive ? ' chip--active' : ''}`;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

export function exerciseCardEl({ name, group, minReps, maxReps, sets, starCount = 0, onClick }) {
  const card = document.createElement('div');
  card.className = 'exercise-card';
  if (onClick) card.addEventListener('click', onClick);

  // Header row: name + group badge
  const header = document.createElement('div');
  header.className = 'exercise-card__header';

  const nameEl = document.createElement('span');
  nameEl.className = 'exercise-card__name';
  nameEl.textContent = name;

  const groupEl = document.createElement('span');
  groupEl.className = 'exercise-card__group';
  groupEl.textContent = group;

  header.appendChild(nameEl);
  header.appendChild(groupEl);

  // Footer row: stars + reps + arrow
  const footer = document.createElement('div');
  footer.className = 'exercise-card__footer';

  const starsEl = document.createElement('div');
  starsEl.className = 'stars';
  for (let i = 0; i < sets; i++) {
    const star = document.createElement('span');
    star.className = `star${i < starCount ? ' star--filled' : ''}`;
    star.textContent = '★';
    starsEl.appendChild(star);
  }

  const repsEl = document.createElement('span');
  repsEl.className = 'exercise-card__reps';
  repsEl.textContent = `Повт: ${minReps}-${maxReps}`;

  const arrowEl = document.createElement('span');
  arrowEl.className = 'exercise-card__arrow';
  arrowEl.textContent = '›';

  footer.appendChild(starsEl);
  footer.appendChild(repsEl);
  footer.appendChild(arrowEl);

  card.appendChild(header);
  card.appendChild(footer);

  return card;
}

export function appHeaderEl({ onSettingsClick, user } = {}) {
  const header = document.createElement('header');
  header.className = 'app-header';

  const titleGroup = document.createElement('div');
  titleGroup.className = 'app-header__titles';

  const title = document.createElement('h1');
  title.className = 'app-header__title';
  title.textContent = 'Gym Logs';

  const subtitle = document.createElement('p');
  subtitle.className = 'app-header__subtitle';
  subtitle.textContent = 'Трекінг тренувань';

  titleGroup.appendChild(title);
  titleGroup.appendChild(subtitle);

  const actions = document.createElement('div');
  actions.className = 'header-actions';

  if (user?.picture) {
    const avatar = document.createElement('img');
    avatar.src = user.picture;
    avatar.alt = user.name || '';
    avatar.className = 'user-avatar';
    actions.appendChild(avatar);
  }

  const gearBtn = document.createElement('button');
  gearBtn.className = 'btn-icon';
  gearBtn.setAttribute('aria-label', 'Налаштування');
  gearBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
  if (onSettingsClick) gearBtn.addEventListener('click', onSettingsClick);
  actions.appendChild(gearBtn);

  header.appendChild(titleGroup);
  header.appendChild(actions);

  return header;
}

export function emptyStateEl(message) {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.textContent = message;
  return div;
}
