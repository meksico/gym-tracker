import { h, icon, ui } from './tp7-ui.js';
import { getLogsByExercise, saveLog, updateLog } from '../store/logStore.js';
import { enqueuePost, enqueuePatch } from '../store/queueStore.js';
import { getRecentWeightForExercise } from '../store/recentWeightStore.js';
import { drainQueue } from '../sync/syncEngine.js';
import { doneTodayEl } from './doneToday.js';
import { generateUuid } from '../lib/uuid.js';

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

  // ── App bar ──
  const bar = h('header', { class: 'appbar', style: 'align-items:flex-start;padding:12px 16px' },
    ui.iconButton('back', { label: "Назад", onClick: () => renderHome() }),
    h('div', { style: 'flex:1;min-width:0' },
      h('div', { style: 'font:var(--weight-bold) var(--text-md)/1.15 var(--font-sans)' }, exercise.name),
      h('div', { class: 'tp7-mono', style: 'margin-top:4px;font-size:var(--text-xs);color:var(--text-secondary)' },
        `${exercise.group}${exercise.formula ? " · " + exercise.formula : ""}`)));
  app.appendChild(bar);

  // ── Detail layout: scroll + pinned dock ──
  const detailWrap = document.createElement('div');
  detailWrap.className = 'main--modal';

  const scrollArea = document.createElement('div');
  scrollArea.className = 'modal-scroll';

  // YouTube technique button
  if (exercise.youtubeUrl) {
    const isOnline = navigator.onLine;
    let videoOpen = false;
    const videoPnl = h('div', {
      style: 'display:none;margin-top:10px;aspect-ratio:16/9;border-radius:var(--radius-md);overflow:hidden;background:#000',
    });

    const techBtn = ui.button(isOnline ? "ТЕХНІКА" : "ВІДЕО НЕДОСТУПНЕ ОФЛАЙН", {
      size: 'lg', block: true,
      startIcon: icon('play', { size: 13 }),
    });
    techBtn.style.justifyContent = 'flex-start';
    techBtn.disabled = !isOnline;

    if (isOnline) {
      techBtn.addEventListener('click', () => {
        videoOpen = !videoOpen;
        if (videoOpen && !videoPnl.firstChild) {
          const videoId = extractYtId(exercise.youtubeUrl);
          if (videoId) {
            const iframe = document.createElement('iframe');
            iframe.className = 'yt-embed';
            iframe.src = `https://www.youtube.com/embed/${videoId}?playsinline=1`;
            iframe.setAttribute('allowfullscreen', '');
            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
            videoPnl.appendChild(iframe);
          }
        }
        videoPnl.style.display = videoOpen ? 'block' : 'none';
        techBtn.replaceChildren(
          icon(videoOpen ? 'stop' : 'play', { size: 13 }),
          document.createTextNode(videoOpen ? " ЗГОРНУТИ" : " ТЕХНІКА"));
      });
    }

    scrollArea.appendChild(h('div', { class: 'yt-section' }, techBtn, videoPnl));
  }

  // Load data
  const [logs_init, recentWeight] = await Promise.all([
    getLogsByExercise(exercise.name),
    getRecentWeightForExercise(exercise.name),
  ]);
  let logs = logs_init;
  let editingUuid = null;

  // "Logged today" header row
  const logCountEl = h('span', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:700;color:var(--text-tertiary)' });
  function updateLogCount() {
    logCountEl.textContent = `${logs.length}/${exercise.sets}`;
  }
  updateLogCount();

  scrollArea.appendChild(
    h('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin:20px 2px 10px' },
      ui.eyebrow("ВИКОНАНО СЬОГОДНІ"), logCountEl));

  const doneTodayWrap = document.createElement('div');

  function refreshDoneToday() {
    doneTodayWrap.replaceChildren(
      doneTodayEl(logs, {
        selectedUuid: editingUuid,
        onSetClick: (log, index) => {
          if (editingUuid === log.uuid) exitEditMode();
          else enterEditMode(log, index);
        },
      }));
  }
  refreshDoneToday();
  scrollArea.appendChild(doneTodayWrap);
  detailWrap.appendChild(scrollArea);

  // ── Dock (pinned bottom) ──
  const dock = document.createElement('div');
  dock.className = 'log-form';

  // Edit mode indicator
  const editBadge = document.createElement('div');
  editBadge.className = 'edit-badge';
  editBadge.style.display = 'none';
  dock.appendChild(editBadge);

  // Initial weight/reps from cache → today's last log → recent weight → plan default
  const cached = inputCache[exercise.name];
  const lastLog = logs[logs.length - 1];
  let weight = +(cached?.weight ?? lastLog?.weight ?? recentWeight?.maxWeight ?? 0);
  let reps   = +(cached?.reps   ?? lastLog?.reps   ?? exercise.maxReps ?? 12);

  // Tape reel (progress indicator)
  const reelWrap = h('div', { style: 'flex:none' });
  function updateReel() {
    reelWrap.replaceChildren(
      ui.tapeReel(exercise.sets ? Math.min(1, logs.length / exercise.sets) : 0, {
        size: 48, label: `${logs.length}/${exercise.sets}`, spinning: logs.length > 0,
      }));
  }
  updateReel();

  // Recall button + reel row
  const recallRow = h('div', { style: 'display:flex;align-items:center;gap:10px' });
  function buildRecallRow() {
    recallRow.replaceChildren();
    if (recentWeight?.maxWeight) {
      const recallBtn = h('button', { type: 'button',
        style: 'appearance:none;flex:1;display:flex;align-items:center;justify-content:center;gap:8px;height:34px;cursor:pointer;' +
               'background:var(--bg-sunken);border:1px solid var(--border-channel);box-shadow:var(--shadow-inset);' +
               'border-radius:var(--radius-sm);font:var(--weight-medium) var(--text-xs)/1 var(--font-mono);color:var(--text-secondary)' },
        icon('ret', { size: 14 }),
        h('b', { style: 'text-transform:uppercase;letter-spacing:var(--tracking-wide)' }, "ОСТАННІЙ: "),
        document.createTextNode(`${recentWeight.maxWeight} кг × ${recentWeight.maxReps}`));
      recallBtn.addEventListener('click', () => {
        if (editingUuid) return;
        weight = recentWeight.maxWeight;
        reps   = recentWeight.maxReps;
        inputCache[exercise.name] = { weight, reps };
        rebuildSteppers();
        refreshVol();
      });
      recallRow.append(recallBtn, reelWrap);
    } else {
      recallRow.appendChild(reelWrap);
    }
  }
  buildRecallRow();
  dock.appendChild(recallRow);

  // Steppers row
  const stepRow = h('div', { style: 'display:flex;gap:12px' });
  function rebuildSteppers() {
    stepRow.replaceChildren(
      ui.stepper("ВАГА (КГ)", weight, { step: 2.5, min: 0, onChange: (v) => {
        weight = v;
        if (!editingUuid) inputCache[exercise.name] = { weight, reps };
        refreshVol();
      }}),
      ui.stepper("ПОВТОРЕННЯ", reps, { step: 1, min: 1, onChange: (v) => {
        reps = v;
        if (!editingUuid) inputCache[exercise.name] = { weight, reps };
        refreshVol();
      }}));
  }
  rebuildSteppers();
  dock.appendChild(stepRow);

  // Volume readout
  const volNumEl = h('span', { class: 'tp7-mono', style: 'font-size:var(--text-md);font-weight:700;color:var(--text-primary)' });
  dock.appendChild(
    h('div', { class: 'volume-display' },
      h('span', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:600;letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--text-secondary)' },
        "ОБʼЄМ"),
      volNumEl));

  function refreshVol() {
    volNumEl.textContent = `${Math.round(weight * reps)} кг`;
    saveBtn.disabled = weight <= 0;
  }
  refreshVol();

  // Record key (THE orange action — one per view)
  const saveBtn = ui.button("ЗАПИСАТИ СЕТ", {
    variant: 'critical', size: 'lg', block: true,
    startIcon: icon('record', { size: 13 }),
  });

  // Cancel button (edit mode only)
  const cancelBtn = ui.button("СКАСУВАТИ", { variant: 'routine', block: true });
  cancelBtn.style.display = 'none';
  cancelBtn.addEventListener('click', exitEditMode);

  dock.append(saveBtn, cancelBtn);
  detailWrap.appendChild(dock);
  app.appendChild(detailWrap);

  // ── Edit mode helpers ──
  function enterEditMode(log, index) {
    editingUuid = log.uuid;
    weight = log.weight;
    reps   = log.reps;
    rebuildSteppers();
    refreshVol();
    saveBtn.replaceChildren(icon('record', { size: 13 }), document.createTextNode(" ОНОВИТИ"));
    cancelBtn.style.display = '';
    editBadge.textContent = `✏ Редагування · Сет ${index + 1}`;
    editBadge.style.display = '';
    dock.classList.add('log-form--editing');
    refreshDoneToday();
  }

  function exitEditMode() {
    editingUuid = null;
    const c  = inputCache[exercise.name];
    const ll = logs[logs.length - 1];
    weight = +(c?.weight ?? ll?.weight ?? 0);
    reps   = +(c?.reps   ?? ll?.reps   ?? exercise.maxReps ?? 12);
    rebuildSteppers();
    refreshVol();
    saveBtn.replaceChildren(icon('record', { size: 13 }), document.createTextNode(" ЗАПИСАТИ СЕТ"));
    cancelBtn.style.display = 'none';
    editBadge.style.display = 'none';
    dock.classList.remove('log-form--editing');
    refreshDoneToday();
  }

  // ── Save / Update handler ──
  saveBtn.addEventListener('click', async () => {
    if (weight <= 0 || reps <= 0) return;
    saveBtn.disabled = true;

    try {
      if (editingUuid) {
        const uuid = editingUuid;
        await updateLog(uuid, { weight, reps });
        await enqueuePatch(uuid, { uuid, date: todayStr(), exercise: exercise.name, group: exercise.group, weight, reps });
        drainQueue();
        logs = await getLogsByExercise(exercise.name);
        updateReel();
        updateLogCount();
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
        updateReel();
        updateLogCount();
        refreshDoneToday();
        refreshVol();
        saveBtn.replaceChildren(icon('record', { size: 13 }), document.createTextNode(" ЗАПИСАТИ СЕТ"));
      }
    } catch (err) {
      console.error('Save failed:', err);
      saveBtn.disabled = false;
    }
  });
}
