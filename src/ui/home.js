import { getPlan } from '../store/planStore.js';
import { getStarCounts } from '../store/logStore.js';
import { getCurrentDay, getTrainingDays } from '../lib/day.js';
import { chipEl, exerciseCardEl, appHeaderEl, emptyStateEl } from './components.js';
import { renderExerciseModal } from './exerciseModal.js';
import { navigate } from '../router.js';
import { getGoogleUser } from '../config.js';
import { getSyncStatus } from '../sync/syncEngine.js';

let selectedDay = null;
let dayPickerVisible = false;

export async function renderHome(day) {
  if (day) selectedDay = day;
  if (!selectedDay) selectedDay = getCurrentDay();

  const app = document.getElementById('app');
  app.innerHTML = '';

  app.appendChild(appHeaderEl({ onSettingsClick: () => navigate('#settings'), user: getGoogleUser() }));

  // Sync error banner — shown when a write to Sheets fails
  const syncBanner = document.createElement('div');
  syncBanner.id = 'sync-error-banner';
  syncBanner.style.cssText = 'display:none;background:#fce8e6;color:#c5221f;padding:8px 16px;font-size:13px;line-height:1.4';

  function showSyncError(msg) {
    syncBanner.style.display = 'block';
    syncBanner.textContent = `⚠ Помилка синхронізації: ${msg}`;
  }

  const { lastError } = getSyncStatus();
  if (lastError) showSyncError(lastError);

  window.addEventListener('sync-error', (e) => showSyncError(e.detail), { once: false });
  app.appendChild(syncBanner);

  const main = document.createElement('main');
  main.className = 'main';

  // Section label + "Change day" toggle
  const sectionRow = document.createElement('div');
  sectionRow.className = 'section-row';

  const sectionLabel = document.createElement('span');
  sectionLabel.className = 'section-label';
  sectionLabel.textContent = 'ПЛАН НА СЬОГОДНІ';

  const changeDayBtn = document.createElement('button');
  changeDayBtn.className = 'btn-link';
  changeDayBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Змінити день`;
  changeDayBtn.addEventListener('click', () => {
    dayPickerVisible = !dayPickerVisible;
    dayPickerEl.style.display = dayPickerVisible ? 'flex' : 'none';
  });

  sectionRow.appendChild(sectionLabel);
  sectionRow.appendChild(changeDayBtn);
  main.appendChild(sectionRow);

  // Day picker chips
  const dayPickerEl = document.createElement('div');
  dayPickerEl.className = 'day-picker';
  dayPickerEl.style.display = dayPickerVisible ? 'flex' : 'none';

  for (const trainingDay of getTrainingDays()) {
    const chip = chipEl(trainingDay, trainingDay === selectedDay, () => {
      dayPickerVisible = false;
      renderHome(trainingDay);
    });
    dayPickerEl.appendChild(chip);
  }
  main.appendChild(dayPickerEl);

  // Day summary card
  const [plan, starCounts] = await Promise.all([getPlan(), getStarCounts()]);
  const dayExercises = plan.filter((ex) => ex.day === selectedDay);

  const daySummary = document.createElement('div');
  daySummary.className = 'day-summary';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'day-summary__icon';
  iconWrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v16M18 4v16M2 12h20M2 6h4M18 6h4M2 18h4M18 18h4"/></svg>`;

  const dayInfo = document.createElement('div');
  dayInfo.className = 'day-summary__info';

  const dayName = document.createElement('strong');
  dayName.textContent = selectedDay;

  const dayCount = document.createElement('span');
  dayCount.textContent = `${dayExercises.length} вправ`;

  dayInfo.appendChild(dayName);
  dayInfo.appendChild(dayCount);
  daySummary.appendChild(iconWrap);
  daySummary.appendChild(dayInfo);
  main.appendChild(daySummary);

  // Exercise list
  const listEl = document.createElement('div');
  listEl.className = 'exercise-list';

  if (dayExercises.length === 0) {
    listEl.appendChild(
      emptyStateEl('Немає вправ. Підключіться до інтернету для першого завантаження.')
    );
  } else {
    for (const exercise of dayExercises) {
      const card = exerciseCardEl({
        ...exercise,
        starCount: starCounts[exercise.name] || 0,
        onClick: () => renderExerciseModal(exercise),
      });
      listEl.appendChild(card);
    }
  }

  main.appendChild(listEl);
  app.appendChild(main);
}
