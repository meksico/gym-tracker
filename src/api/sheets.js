import { getAccessToken } from '../auth/auth.js';
import { SHEET_ID } from '../config.js';
import { logger } from '../lib/logger.js';
import { normalizeDay } from '../lib/day.js';

const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`;

// Produces "M/D/YYYY H:MM:SS" matching the existing GAS server-side new Date() format
function formatSheetDate(d) {
  const M  = d.getMonth() + 1;
  const D  = d.getDate();
  const Y  = d.getFullYear();
  const h  = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${M}/${D}/${Y} ${h}:${mm}:${ss}`;
}

// Produces "MM/DD/YYYY" matching the BodyWeight sheet's existing date column format
export function formatBodyWeightDate(d) {
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  const Y = d.getFullYear();
  return `${M}/${D}/${Y}`;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${getAccessToken()}`,
    'Content-Type': 'application/json',
  };
}

async function getRange(range) {
  const res = await fetch(`${BASE}/${encodeURIComponent(range)}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`Sheets read failed (HTTP ${res.status})`);
  const { values = [] } = await res.json();
  return values;
}

// ── Plan ─────────────────────────────────────────────────────────────────────

// Columns: Plan, Group, Name, Formula, Sets, Min Repeats, Max Repeats, Weight, Youtube URL, Set, IsTimeBased
export async function getPlan() {
  const rows = await getRange('Data!A2:K');
  return rows.map((row, i) => ({
    id:          i + 1,
    day:         normalizeDay(row[0]),
    group:       row[1]  ?? '',
    name:        row[2]  ?? '',
    formula:     row[3]  ?? '',
    sets:        Number(row[4] ?? 0),
    minReps:     Number(row[5] ?? 0),
    maxReps:     Number(row[6] ?? 0),
    weight:      row[7]  ?? '',
    youtubeUrl:  row[8]  ?? '',
    isTimeBased: row[10] === 'TRUE',
  }));
}

// ── Recent weights ────────────────────────────────────────────────────────────

// Columns: Група м'язів, Вправа, MAX of Вага (кг), MAX of Факт. повторення, MAX of Швидкість, MAX of Рівень, MAX of Час хв
// "Recent weight" tab is a pivot maintained by Sheets formulas — read-only.
export async function getRecentWeights() {
  const rows = await getRange("Recent weight!A2:G");
  return rows
    .filter(row => (row[1] ?? '') !== '')  // column B (Вправа) must be populated
    .map(row => ({
      exercise:  row[1] ?? '',
      group:     row[0] ?? '',
      maxWeight: Number(row[2] ?? 0),
      maxReps:   Number(row[3] ?? 0),
      maxSpeed:  Number(row[4] ?? 0),
      maxLevel:  Number(row[5] ?? 0),
      maxTime:   Number(row[6] ?? 0),
    }));
}

// ── Body weight ────────────────────────────────────────────────────────────────

// Columns: Date (MM/DD/YYYY), Weight (kg)  (A–B)
export async function getBodyWeights() {
  const rows = await getRange('BodyWeight!A2:B');
  return rows
    .filter(row => (row[1] ?? '') !== '')
    .map(row => ({
      date:   row[0] ?? '',
      weight: Number(row[1] ?? 0),
    }));
}

export async function appendBodyWeight(weight) {
  logger.debug('sheets', 'appendBodyWeight', { weight });
  const range = 'BodyWeight!A2:B';
  const res = await fetch(
    `${BASE}/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method:  'POST',
      headers: authHeaders(),
      body: JSON.stringify({ values: [[formatBodyWeightDate(new Date()), weight]] }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error('sheets', 'appendBodyWeight failed', { status: res.status });
    throw new Error(`Sheets append failed (HTTP ${res.status}): ${body}`);
  }
  logger.info('sheets', 'appendBodyWeight ok', { weight });
}

// ── Logs ─────────────────────────────────────────────────────────────────────

// Columns: UUID, Date, Exercise, Weight, Reps, Speed, Level, Time  (A–H)
// Columns I–M are Sheets formulas — never written by the app.
export async function appendLog(entry) {
  logger.debug('sheets', 'appendLog', { uuid: entry.uuid, exercise: entry.exercise });
  const range = 'Logs!A2:H';
  const res = await fetch(
    `${BASE}/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method:  'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        values: [[
          entry.uuid,
          formatSheetDate(new Date()),
          entry.exercise,
          entry.weight ?? '',
          entry.reps   ?? '',
          entry.speed  ?? '',
          entry.level  ?? '',
          entry.time   ?? '',
        ]],
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error('sheets', 'appendLog failed', { status: res.status, uuid: entry.uuid });
    throw new Error(`Sheets append failed (HTTP ${res.status}): ${body}`);
  }
  const result = await res.json();
  // Return the 1-based sheet row so callers can store it for future updates
  const match = result.updates?.updatedRange?.match(/!A(\d+):/);
  const row = match ? parseInt(match[1], 10) : null;
  logger.info('sheets', 'appendLog ok', { uuid: entry.uuid, row });
  return row;
}

export async function updateLog(uuid, patch) {
  logger.debug('sheets', 'updateLog', { uuid });
  // Find the sheet row by scanning column A (UUIDs)
  const uuids = await getRange('Logs!A2:A');
  const idx   = uuids.findIndex(row => row[0] === uuid);
  if (idx === -1) {
    logger.error('sheets', 'UUID not found in sheet', { uuid });
    throw new Error(`UUID not found in sheet: ${uuid}`);
  }
  const sheetRow = idx + 2; // +1 for 0-based, +1 for header row

  const range = `Logs!D${sheetRow}:H${sheetRow}`;
  const res = await fetch(
    `${BASE}/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method:  'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ values: [[
        patch.weight ?? '',
        patch.reps   ?? '',
        patch.speed  ?? '',
        patch.level  ?? '',
        patch.time   ?? '',
      ]] }),
    },
  );
  if (!res.ok) {
    logger.error('sheets', 'updateLog failed', { uuid, sheetRow, status: res.status });
    throw new Error(`Sheets update failed (HTTP ${res.status})`);
  }
  logger.info('sheets', 'updateLog ok', { uuid, sheetRow });
}
