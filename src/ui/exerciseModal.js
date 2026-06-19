import { getLogsByExercise, saveLog, updateLog } from '../store/logStore.js';
import { enqueuePost, enqueuePatch } from '../store/queueStore.js';
import { getRecentWeightForExercise } from '../store/recentWeightStore.js';
import { drainQueue } from '../sync/syncEngine.js';
import { doneTodayEl } from './doneToday.js';
import { generateUuid } from '../lib/uuid.js';

// Persists typed values across navigation within the session
const inputCache = {};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function extractYtId(url) {
  const patterns = [
    /youtube\.com\/shorts\/([^?&/]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&/]+)/,
    /youtube\.com\/embed\/([^?&/]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export async function renderExerciseModal(exercise) {
  const { renderHome } = await import('./home.js');

  const app = document.getElementById('app');
  app.innerHTML = '';

  // ── Header ──
  const header = document.createElement('header');
  header.className = 'app-header';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn-icon';
  backBtn.setAttribute('aria-label', 'Назад');
  backBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
  backBtn.addEventListener('click', () => renderHome());

  const titleGroup = document.createElement('div');
  titleGroup.className = 'app-header__titles';

  const title = document.createElement('h1');
  title.className = 'app-header__title';
  title.textContent = exercise.name;

  const subtitle = document.createElement('p');
  subtitle.className = 'app-header__subtitle';
  subtitle.textContent = `${exercise.group} · ${exercise.formula}`;

  titleGroup.appendChild(title);
  titleGroup.appendChild(subtitle);
  header.appendChild(backBtn);
  header.appendChild(titleGroup);
  app.appendChild(header);

  const main = document.createElement('main');
  main.className = 'main main--modal';

  // ── Scrollable area: YouTube + done-today ──
  const scrollArea = document.createElement('div');
  scrollArea.className = 'modal-scroll';

  if (exercise.youtubeUrl) {
    const ytSection = document.createElement('div');
    ytSection.className = 'yt-section';

    const isOnline = navigator.onLine;
    const ytToggle = document.createElement('button');
    ytToggle.className = `yt-toggle${isOnline ? '' : ' yt-toggle--offline'}`;
    ytToggle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> ${isOnline ? 'Переглянути техніку' : 'Відео недоступне офлайн'}`;
    ytToggle.disabled = !isOnline;

    let ytEmbed = null;
    let ytVisible = false;

    ytToggle.addEventListener('click', () => {
      ytVisible = !ytVisible;
      if (ytVisible && !ytEmbed) {
        const videoId = extractYtId(exercise.youtubeUrl);
        if (videoId) {
          ytEmbed = document.createElement('iframe');
          ytEmbed.className = 'yt-embed';
          ytEmbed.src = `https://www.youtube.com/embed/${videoId}?playsinline=1`;
          ytEmbed.setAttribute('allowfullscreen', '');
          ytEmbed.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
          ytSection.appendChild(ytEmbed);
        }
      }
      if (ytEmbed) ytEmbed.style.display = ytVisible ? 'block' : 'none';
      ytToggle.textContent = ytVisible ? '▲ Закрити відео' : '▶ Переглянути техніку';
    });

    ytSection.appendChild(ytToggle);
    scrollArea.appendChild(ytSection);
  }

  // Fetch logs + recent weight in parallel — both used for pre-fill
  const [logs_init, recentWeight] = await Promise.all([
    getLogsByExercise(exercise.name),
    getRecentWeightForExercise(exercise.name),
  ]);
  let logs = logs_init;

  const doneTodayWrap = document.createElement('div');

  // ── Edit mode state ──
  let editingUuid = null;

  function refreshDoneToday() {
    doneTodayWrap.innerHTML = '';
    doneTodayWrap.appendChild(
      doneTodayEl(logs, {
        selectedUuid: editingUuid,
        onSetClick: (log, index) => {
          if (editingUuid === log.uuid) {
            exitEditMode();
          } else {
            enterEditMode(log, index);
          }
        },
      })
    );
  }

  refreshDoneToday();
  scrollArea.appendChild(doneTodayWrap);
  main.appendChild(scrollArea);

  // ── Form (pinned to bottom) ──
  const formCard = document.createElement('div');
  formCard.className = 'log-form';

  // Edit mode badge
  const editBadge = document.createElement('div');
  editBadge.className = 'edit-badge';
  editBadge.style.display = 'none';
  formCard.appendChild(editBadge);

  const weightLabel = document.createElement('label');
  weightLabel.className = 'input-label';
  weightLabel.textContent = 'Вага (кг)';

  const weightInput = document.createElement('input');
  weightInput.className = 'input-number';
  weightInput.type = 'number';
  weightInput.min = '0';
  weightInput.step = '0.5';
  weightInput.inputMode = 'decimal';
  weightInput.placeholder = '0';

  const repsLabel = document.createElement('label');
  repsLabel.className = 'input-label';
  repsLabel.textContent = 'Повторення';

  const repsInput = document.createElement('input');
  repsInput.className = 'input-number';
  repsInput.type = 'number';
  repsInput.min = '1';
  repsInput.step = '1';
  repsInput.inputMode = 'numeric';

  const volumeEl = document.createElement('p');
  volumeEl.className = 'volume-display';

  function updateVolume() {
    const w = parseFloat(weightInput.value) || 0;
    const r = parseInt(repsInput.value, 10) || 0;
    volumeEl.textContent = `Об'єм: ${w * r} кг`;
    saveBtn.disabled = w <= 0;
    // Only cache add-mode values, not edit-mode values
    if (!editingUuid) {
      inputCache[exercise.name] = { weight: weightInput.value, reps: repsInput.value };
    }
  }

  weightInput.addEventListener('input', updateVolume);
  repsInput.addEventListener('input', updateVolume);

  const weightGroup = document.createElement('div');
  weightGroup.className = 'input-group';
  weightGroup.appendChild(weightLabel);
  weightGroup.appendChild(weightInput);

  const repsGroup = document.createElement('div');
  repsGroup.className = 'input-group';
  repsGroup.appendChild(repsLabel);
  repsGroup.appendChild(repsInput);

  const inputRow = document.createElement('div');
  inputRow.className = 'input-row';
  inputRow.appendChild(weightGroup);
  inputRow.appendChild(repsGroup);

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn btn--primary';
  saveBtn.textContent = 'ЗБЕРЕГТИ';
  saveBtn.disabled = true;

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn btn--ghost';
  cancelBtn.textContent = 'СКАСУВАТИ';
  cancelBtn.style.display = 'none';
  cancelBtn.addEventListener('click', exitEditMode);

  btnRow.appendChild(saveBtn);
  btnRow.appendChild(cancelBtn);

  formCard.appendChild(inputRow);
  formCard.appendChild(volumeEl);
  formCard.appendChild(btnRow);
  main.appendChild(formCard);
  app.appendChild(main);

  // ── Set initial input values ──
  // Priority: typed-this-session → logged today → recent weight pivot → plan default
  const lastLog = logs[logs.length - 1];
  const cached  = inputCache[exercise.name];
  weightInput.value = String(cached?.weight ?? lastLog?.weight ?? recentWeight?.maxWeight ?? 0);
  repsInput.value   = String(cached?.reps   ?? lastLog?.reps   ?? exercise.maxReps ?? 12);
  updateVolume();

  // "Use last result" button — visible only when recent weight data exists
  if (recentWeight?.maxWeight) {
    const lastResultBtn = document.createElement('button');
    lastResultBtn.className = 'btn btn--ghost btn--sm';
    lastResultBtn.textContent = `↩ Останній: ${recentWeight.maxWeight} кг × ${recentWeight.maxReps}`;
    lastResultBtn.addEventListener('click', () => {
      if (editingUuid) return; // don't overwrite during edit mode
      weightInput.value = String(recentWeight.maxWeight);
      repsInput.value   = String(recentWeight.maxReps);
      updateVolume();
      weightInput.focus();
    });
    formCard.insertBefore(lastResultBtn, inputRow);
  }

  weightInput.focus();

  // ── Edit mode helpers ──
  function enterEditMode(log, index) {
    editingUuid = log.uuid;
    weightInput.value = String(log.weight);
    repsInput.value   = String(log.reps);
    updateVolume();
    saveBtn.textContent = 'ОНОВИТИ';
    cancelBtn.style.display = '';
    editBadge.textContent = `✏️ Редагування · Сет ${index + 1}`;
    editBadge.style.display = '';
    formCard.classList.add('log-form--editing');
    refreshDoneToday();
    weightInput.focus();
  }

  function exitEditMode() {
    editingUuid = null;
    const c = inputCache[exercise.name];
    const ll = logs[logs.length - 1];
    weightInput.value = String(c?.weight ?? ll?.weight ?? 0);
    repsInput.value   = String(c?.reps   ?? ll?.reps   ?? exercise.maxReps ?? 12);
    updateVolume();
    saveBtn.textContent = 'ЗБЕРЕГТИ';
    cancelBtn.style.display = 'none';
    editBadge.style.display = 'none';
    formCard.classList.remove('log-form--editing');
    refreshDoneToday();
  }

  // ── Save / Update handler ──
  saveBtn.addEventListener('click', async () => {
    const weight = parseFloat(weightInput.value);
    const reps   = parseInt(repsInput.value, 10);
    if (weight <= 0 || reps <= 0) return;

    saveBtn.disabled = true;
    saveBtn.textContent = editingUuid ? 'Оновлення…' : 'Збереження…';

    if (editingUuid) {
      const uuid = editingUuid;
      await updateLog(uuid, { weight, reps });
      await enqueuePatch(uuid, { uuid, date: todayStr(), exercise: exercise.name, group: exercise.group, weight, reps });
      drainQueue();
      logs = await getLogsByExercise(exercise.name);
      exitEditMode();
    } else {
      const entry = {
        uuid: generateUuid(),
        date: todayStr(),
        exercise: exercise.name,
        group: exercise.group,
        weight,
        reps,
      };
      await saveLog(entry);
      await enqueuePost(entry);
      drainQueue();
      logs = await getLogsByExercise(exercise.name);
      refreshDoneToday();
      updateVolume();
      saveBtn.textContent = 'ЗБЕРЕГТИ';
    }
  });
}
