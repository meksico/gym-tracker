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

  const isTB = !!exercise.isTimeBased;

  // ── App bar ──
  const bar = h('header', { id: 'modal-appbar', class: 'appbar', style: 'align-items:flex-start;padding:12px 16px' },
    ui.iconButton('back', { label: "Назад", onClick: () => renderHome() }),
    h('div', { style: 'flex:1;min-width:0' },
      h('div', { style: 'font:var(--weight-bold) var(--text-md)/1.15 var(--font-sans)' }, exercise.name),
      h('div', { class: 'tp7-mono', style: 'margin-top:4px;font-size:var(--text-xs);color:var(--text-secondary)' },
        `${exercise.group}${exercise.formula ? " · " + exercise.formula : ""}`)));
  app.appendChild(bar);

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

    scrollArea.appendChild(h('div', { id: 'modal-yt-section', class: 'yt-section' }, techBtn, videoPnl));
  }

  // Load data
  const [logs_init, recentWeight] = await Promise.all([
    getLogsByExercise(exercise.name),
    isTB ? Promise.resolve(null) : getRecentWeightForExercise(exercise.name),
  ]);
  let logs = logs_init;
  let editingUuid = null;
  let enterEditMode;
  let exitEditMode;

  const effectiveSets = (isTB && !exercise.sets) ? 1 : exercise.sets;

  // "Logged today" header
  const logCountEl = h('span', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:700;color:var(--text-tertiary)' });
  function updateLogCount() { logCountEl.textContent = `${logs.length}/${effectiveSets}`; }
  updateLogCount();

  scrollArea.appendChild(
    h('div', { id: 'modal-sets-header', style: 'display:flex;align-items:center;justify-content:space-between;margin:20px 2px 10px' },
      ui.eyebrow("ВИКОНАНО СЬОГОДНІ"), logCountEl));

  const doneTodayWrap = document.createElement('div');
  doneTodayWrap.id = 'modal-sets-list';

  function refreshDoneToday() {
    doneTodayWrap.replaceChildren(
      doneTodayEl(logs, {
        isTimeBased: isTB,
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

  // ── Dock ──
  const dock = document.createElement('div');
  dock.id = 'modal-dock';
  dock.className = 'log-form';

  const editBadge = document.createElement('div');
  editBadge.id = 'modal-edit-badge';
  editBadge.className = 'edit-badge';
  editBadge.style.display = 'none';
  dock.appendChild(editBadge);

  const cached = inputCache[exercise.name];
  const lastLog = logs[logs.length - 1];

  const reelWrap = h('div', { id: 'modal-reel', style: 'flex:none' });
  function updateReel() {
    reelWrap.replaceChildren(
      ui.tapeReel(effectiveSets ? Math.min(1, logs.length / effectiveSets) : 0, {
        size: 48, label: `${logs.length}/${effectiveSets}`, spinning: logs.length > 0,
      }));
  }
  updateReel();

  const saveBtn = ui.button(isTB ? "ЗАПИСАТИ" : "ЗАПИСАТИ СЕТ", {
    variant: 'critical', size: 'lg', block: true,
    startIcon: icon('record', { size: 13 }),
  });
  saveBtn.id = 'modal-save-btn';

  const cancelBtn = ui.button("СКАСУВАТИ", { variant: 'routine', block: true });
  cancelBtn.id = 'modal-cancel-btn';
  cancelBtn.style.display = 'none';
  cancelBtn.addEventListener('click', () => exitEditMode());

  if (isTB) {
    // ── Time-based branch ──
    let speed = +(cached?.speed ?? lastLog?.speed ?? 0);
    let level = +(cached?.level ?? lastLog?.level ?? 0);
    let time  = +(cached?.time  ?? lastLog?.time  ?? 0);

    dock.appendChild(
      h('div', { id: 'modal-recall-row', style: 'display:flex;align-items:center;gap:10px' }, reelWrap));

    const stepRow = h('div', { id: 'modal-step-row', style: 'display:flex;gap:10px' });
    const volNumEl = h('span', { class: 'tp7-mono', style: 'font-size:var(--text-md);font-weight:700;color:var(--text-primary)' });

    function refreshTimeSummary() {
      const parts = [];
      if (speed > 0) parts.push(`${speed} км/ч`);
      if (level > 0) parts.push(`Рів ${level}`);
      if (time  > 0) parts.push(`${time} хв`);
      volNumEl.textContent = parts.length ? parts.join(' · ') : '—';
      saveBtn.disabled = (speed === 0 && level === 0 && time === 0);
    }

    function rebuildTimeFields() {
      const inputStyle = 'width:100%;height:48px;background:var(--grey-50);border:1px solid var(--border-channel);' +
        'box-shadow:var(--shadow-inset);border-radius:var(--radius-sm);text-align:center;' +
        'font:700 var(--text-xl)/1 var(--font-mono);color:var(--text-primary);outline:none;' +
        '-webkit-appearance:none;appearance:none';

      const speedInp = h('input', {
        id: 'modal-speed-input', type: 'text', inputmode: 'decimal',
        value: speed > 0 ? String(speed) : '', placeholder: '0', style: inputStyle,
      });
      speedInp.addEventListener('input', () => {
        const v = parseFloat(speedInp.value.replace(',', '.'));
        if (!isNaN(v) && v >= 0) {
          speed = v;
          if (!editingUuid) inputCache[exercise.name] = { speed, level, time };
          refreshTimeSummary();
        }
      });

      const levelDisp = h('div', {
        id: 'modal-level-display',
        style: 'flex:1.4;display:flex;align-items:center;justify-content:center;height:48px;' +
               'font:700 var(--text-2xl)/1 var(--font-mono);color:var(--text-primary)',
      }, level > 0 ? String(level) : '—');

      function mkLevelBtn(lbl, id, delta) {
        const btn = h('button', { id, type: 'button',
          style: 'flex:1;height:48px;border:1px solid var(--border-channel);border-radius:var(--radius-sm);' +
                 'background:var(--bg-sunken);box-shadow:var(--shadow-inset);cursor:pointer;' +
                 'font:700 var(--text-lg)/1 var(--font-mono);color:var(--text-secondary)' }, lbl);
        btn.addEventListener('click', () => {
          level = Math.max(0, level + delta);
          levelDisp.textContent = level > 0 ? String(level) : '—';
          if (!editingUuid) inputCache[exercise.name] = { speed, level, time };
          refreshTimeSummary();
        });
        return btn;
      }

      const timeInp = h('input', {
        id: 'modal-time-input', type: 'text', inputmode: 'decimal',
        value: time > 0 ? String(time) : '', placeholder: '0', style: inputStyle,
      });
      timeInp.addEventListener('input', () => {
        const v = parseFloat(timeInp.value.replace(',', '.'));
        if (!isNaN(v) && v >= 0) {
          time = v;
          if (!editingUuid) inputCache[exercise.name] = { speed, level, time };
          refreshTimeSummary();
        }
      });

      const labelStyle = 'font:var(--weight-semibold) var(--text-2xs)/1 var(--font-sans);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px;text-align:center';

      stepRow.replaceChildren(
        h('div', { style: 'flex:1.5;min-width:0' },
          h('div', { style: labelStyle }, "ШВИДКІСТЬ, КМ/Г"), speedInp),
        h('div', { style: 'flex:2;min-width:0' },
          h('div', { style: labelStyle }, "РІВЕНЬ"),
          h('div', { style: 'display:flex;gap:6px;align-items:center' },
            mkLevelBtn('−', 'modal-level-dec-btn', -1),
            levelDisp,
            mkLevelBtn('+', 'modal-level-inc-btn', +1))),
        h('div', { style: 'flex:1.5;min-width:0' },
          h('div', { style: labelStyle }, "ЧАС, ХВ"), timeInp));
    }

    rebuildTimeFields();
    refreshTimeSummary();
    dock.appendChild(stepRow);
    dock.appendChild(
      h('div', { id: 'modal-volume-display', class: 'volume-display' },
        h('span', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:600;letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--text-secondary)' },
          "ПАРАМЕТРИ"),
        volNumEl));
    dock.append(saveBtn, cancelBtn);

    enterEditMode = (log, index) => {
      editingUuid = log.uuid;
      speed = log.speed ?? 0;
      level = log.level ?? 0;
      time  = log.time  ?? 0;
      rebuildTimeFields();
      refreshTimeSummary();
      saveBtn.replaceChildren(icon('record', { size: 13 }), document.createTextNode(" ОНОВИТИ"));
      cancelBtn.style.display = '';
      editBadge.textContent = `✏ Редагування · ${index + 1}`;
      editBadge.style.display = '';
      dock.classList.add('log-form--editing');
      refreshDoneToday();
    };

    exitEditMode = () => {
      editingUuid = null;
      const c  = inputCache[exercise.name];
      const ll = logs[logs.length - 1];
      speed = +(c?.speed ?? ll?.speed ?? 0);
      level = +(c?.level ?? ll?.level ?? 0);
      time  = +(c?.time  ?? ll?.time  ?? 0);
      rebuildTimeFields();
      refreshTimeSummary();
      saveBtn.replaceChildren(icon('record', { size: 13 }), document.createTextNode(" ЗАПИСАТИ"));
      cancelBtn.style.display = 'none';
      editBadge.style.display = 'none';
      dock.classList.remove('log-form--editing');
      refreshDoneToday();
    };

    saveBtn.addEventListener('click', async () => {
      if (speed === 0 && level === 0 && time === 0) return;
      saveBtn.disabled = true;
      try {
        if (editingUuid) {
          const uuid = editingUuid;
          await updateLog(uuid, { speed, level, time });
          await enqueuePatch(uuid, { uuid, date: todayStr(), exercise: exercise.name, group: exercise.group, speed, level, time });
          drainQueue();
          logs = await getLogsByExercise(exercise.name);
          updateReel(); updateLogCount(); exitEditMode();
        } else {
          const entry = { uuid: generateUuid(), ts: Date.now(), date: todayStr(), exercise: exercise.name, group: exercise.group, speed, level, time };
          await saveLog(entry);
          await enqueuePost(entry);
          drainQueue();
          logs = await getLogsByExercise(exercise.name);
          updateReel(); updateLogCount(); refreshDoneToday(); refreshTimeSummary();
          saveBtn.replaceChildren(icon('record', { size: 13 }), document.createTextNode(" ЗАПИСАТИ"));
        }
      } catch (err) {
        console.error('Save failed:', err);
        saveBtn.disabled = false;
      }
    });

  } else {
    // ── Regular (weight + reps) branch ──
    let weight = +(cached?.weight ?? lastLog?.weight ?? recentWeight?.maxWeight ?? 0);
    let reps   = +(cached?.reps   ?? lastLog?.reps   ?? exercise.maxReps ?? 12);

    const recallRow = h('div', { id: 'modal-recall-row', style: 'display:flex;align-items:center;gap:10px' });
    function buildRecallRow() {
      recallRow.replaceChildren();
      if (recentWeight?.maxWeight) {
        const recallBtn = h('button', { id: 'modal-recall-btn', type: 'button',
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

    const stepRow = h('div', { id: 'modal-step-row', style: 'display:flex;gap:12px' });
    function rebuildSteppers() {
      const weightInp = h('input', {
        id: 'modal-weight-input',
        type: 'text', inputmode: 'decimal',
        value: weight > 0 ? String(weight) : '',
        placeholder: '0',
        style: 'width:100%;height:48px;background:var(--grey-50);border:1px solid var(--border-channel);' +
               'box-shadow:var(--shadow-inset);border-radius:var(--radius-sm);text-align:center;' +
               'font:700 var(--text-2xl)/1 var(--font-mono);color:var(--text-primary);outline:none;' +
               '-webkit-appearance:none;appearance:none',
      });
      weightInp.addEventListener('input', () => {
        const v = parseFloat(weightInp.value.replace(',', '.'));
        if (!isNaN(v) && v >= 0) {
          weight = v;
          if (!editingUuid) inputCache[exercise.name] = { weight, reps };
          refreshVol();
        }
      });
      weightInp.addEventListener('blur', () => {
        if (!weightInp.value || isNaN(parseFloat(weightInp.value.replace(',', '.')))) {
          weightInp.value = weight > 0 ? String(weight) : '';
        }
      });

      stepRow.replaceChildren(
        h('div', { style: 'flex:2;min-width:0' },
          h('div', { style: 'font:var(--weight-semibold) var(--text-2xs)/1 var(--font-sans);letter-spacing:var(--tracking-label);text-transform:uppercase;color:var(--text-secondary);margin-bottom:8px;text-align:center' },
            "ВАГА (КГ)"),
          weightInp),
        h('div', { style: 'flex:2.3;min-width:0' },
          ui.stepper("ПОВТОРЕННЯ", reps, { step: 1, min: 1, onChange: (v) => {
            reps = v;
            if (!editingUuid) inputCache[exercise.name] = { weight, reps };
            refreshVol();
          }})));
    }
    rebuildSteppers();
    dock.appendChild(stepRow);

    const volNumEl = h('span', { class: 'tp7-mono', style: 'font-size:var(--text-md);font-weight:700;color:var(--text-primary)' });
    dock.appendChild(
      h('div', { id: 'modal-volume-display', class: 'volume-display' },
        h('span', { class: 'tp7-mono', style: 'font-size:var(--text-2xs);font-weight:600;letter-spacing:var(--tracking-wide);text-transform:uppercase;color:var(--text-secondary)' },
          "ОБʼЄМ"),
        volNumEl));

    function refreshVol() {
      volNumEl.textContent = `${Math.round(weight * reps)} кг`;
      saveBtn.disabled = weight <= 0;
    }
    refreshVol();

    dock.append(saveBtn, cancelBtn);

    enterEditMode = (log, index) => {
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
    };

    exitEditMode = () => {
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
    };

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
          updateReel(); updateLogCount(); exitEditMode();
        } else {
          const entry = { uuid: generateUuid(), ts: Date.now(), date: todayStr(), exercise: exercise.name, group: exercise.group, weight, reps };
          await saveLog(entry);
          await enqueuePost(entry);
          drainQueue();
          logs = await getLogsByExercise(exercise.name);
          updateReel(); updateLogCount(); refreshDoneToday(); refreshVol();
          saveBtn.replaceChildren(icon('record', { size: 13 }), document.createTextNode(" ЗАПИСАТИ СЕТ"));
        }
      } catch (err) {
        console.error('Save failed:', err);
        saveBtn.disabled = false;
      }
    });
  }

  detailWrap.appendChild(dock);
  app.appendChild(detailWrap);
}
