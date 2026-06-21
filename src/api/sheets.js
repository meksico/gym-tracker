import { getAccessToken } from '../auth/auth.js';
import { SHEET_ID } from '../config.js';

const BASE = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`;

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

// Columns: Plan, Group, Name, Formula, Sets, Min Repeats, Max Repeats, Weight, Youtube URL
export async function getPlan() {
  const rows = await getRange('Data!A2:I');
  return rows.map((row, i) => ({
    id:         i + 1,
    day:        row[0] ?? '',
    group:      row[1] ?? '',
    name:       row[2] ?? '',
    formula:    row[3] ?? '',
    sets:       Number(row[4] ?? 0),
    minReps:    Number(row[5] ?? 0),
    maxReps:    Number(row[6] ?? 0),
    weight:     row[7] ?? '',
    youtubeUrl: row[8] ?? '',
  }));
}

// ── Recent weights ────────────────────────────────────────────────────────────

// Columns: Група м'язів, Вправа, MAX of Вага (кг), MAX of Факт. повторення
// "Recent weight" tab is a pivot maintained by Sheets formulas — read-only.
export async function getRecentWeights() {
  const rows = await getRange("Recent weight!A2:D");
  return rows
    .filter(row => (row[1] ?? '') !== '')  // column B (Вправа) must be populated
    .map(row => ({
      exercise:  row[1] ?? '',
      group:     row[0] ?? '',
      maxWeight: Number(row[2] ?? 0),
      maxReps:   Number(row[3] ?? 0),
    }));
}

// ── Logs ─────────────────────────────────────────────────────────────────────

// Columns: UUID, Date, Exercise, Weight, Reps  (A–E)
// Columns F–M are Sheets formulas — never written by the app.
export async function appendLog(entry) {
  const range = 'Logs!A2:E';
  const res = await fetch(
    `${BASE}/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method:  'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        values: [[
          entry.uuid,
          new Date().toISOString(),
          entry.exercise,
          entry.weight ?? '',
          entry.reps   ?? '',
        ]],
      }),
    },
  );
  if (!res.ok) throw new Error(`Sheets append failed (HTTP ${res.status})`);
  const result = await res.json();
  // Return the 1-based sheet row so callers can store it for future updates
  const match = result.updates?.updatedRange?.match(/!A(\d+):/);
  return match ? parseInt(match[1], 10) : null;
}

export async function updateLog(uuid, patch) {
  // Find the sheet row by scanning column A (UUIDs)
  const uuids = await getRange('Logs!A2:A');
  const idx   = uuids.findIndex(row => row[0] === uuid);
  if (idx === -1) throw new Error(`UUID not found in sheet: ${uuid}`);
  const sheetRow = idx + 2; // +1 for 0-based, +1 for header row

  const range = `Logs!D${sheetRow}:E${sheetRow}`;
  const res = await fetch(
    `${BASE}/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method:  'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ values: [[patch.weight ?? '', patch.reps ?? '']] }),
    },
  );
  if (!res.ok) throw new Error(`Sheets update failed (HTTP ${res.status})`);
}
