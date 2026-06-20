import { getGasUrl, getGoogleUser } from '../config.js';

function normaliseRow(row, index) {
  return {
    id: index + 1,
    day: row['Plan'] ?? row.day ?? '',
    group: row['Group'] ?? row.group ?? '',
    name: row['Name'] ?? row.name ?? '',
    formula: row['Formula'] ?? row.formula ?? '',
    sets: Number(row['Sets'] ?? row.sets ?? 0),
    minReps: Number(row['Min Repeats'] ?? row.minReps ?? 0),
    maxReps: Number(row['Max Repeats'] ?? row.maxReps ?? 0),
    weight: row['Weight'] ?? row.weight ?? '',
    youtubeUrl: row['Youtube URL'] ?? row.youtubeUrl ?? '',
  };
}

export async function getPlan() {
  const url = getGasUrl();
  if (!url) throw new Error('GAS URL not configured');

  const response = await fetch(`${url}?action=getPlan`, { mode: 'cors' });
  if (!response.ok) throw new Error(`GAS API error: ${response.status}`);

  const data = await response.json();
  return data.map(normaliseRow);
}

export async function getRecentWeights() {
  const url = getGasUrl();
  if (!url) throw new Error('GAS URL not configured');

  const response = await fetch(`${url}?action=getRecentWeights`, { mode: 'cors' });
  if (!response.ok) throw new Error(`GAS API error: ${response.status}`);

  const data = await response.json();
  return data.map((row) => ({
    exercise: row['Вправа'] ?? row.exercise ?? '',
    group: row['Група м\'язів'] ?? row.group ?? '',
    maxWeight: Number(row['MAX of Вага (кг)'] ?? row.maxWeight ?? 0),
    maxReps: Number(row['MAX of Факт. повторення'] ?? row.maxReps ?? 0),
  }));
}

export async function postLog(entry) {
  const url = getGasUrl();
  if (!url) throw new Error('GAS URL not configured');

  // text/plain avoids CORS preflight — GAS doesn't handle OPTIONS requests
  const response = await fetch(`${url}?action=postLog`, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ ...entry, userEmail: getGoogleUser()?.email || '' }),
  });
  if (!response.ok) throw new Error(`GAS API error: ${response.status}`);
  return response.json();
}

export async function patchLog(uuid, data) {
  const url = getGasUrl();
  if (!url) throw new Error('GAS URL not configured');

  const response = await fetch(`${url}?action=patchLog`, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ uuid, ...data, userEmail: getGoogleUser()?.email || '' }),
  });
  if (!response.ok) throw new Error(`GAS API error: ${response.status}`);
  return response.json();
}
