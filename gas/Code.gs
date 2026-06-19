// ─────────────────────────────────────────────────────────────────────────────
// Gym Tracker — Google Apps Script Web App
//
// Deploy as:
//   Extensions → Apps Script → Deploy → New deployment
//   Type: Web app
//   Execute as: Me
//   Who has access: Anyone
//
// Copy the Web App URL and paste it into the app's Settings screen.
// ─────────────────────────────────────────────────────────────────────────────

const SS = SpreadsheetApp.getActiveSpreadsheet();

// ── GET handler ───────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getPlan')          return jsonResponse(getPlan());
    if (action === 'getRecentWeights') return jsonResponse(getRecentWeights());
    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────
// Body is JSON sent as text/plain (avoids CORS preflight with GAS).
function doPost(e) {
  try {
    const action = e.parameter.action;
    const data   = JSON.parse(e.postData.contents);
    if (action === 'postLog')  return jsonResponse(postLog(data));
    if (action === 'patchLog') return jsonResponse(patchLog(data));
    return jsonResponse({ error: 'Unknown action: ' + action });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToObjects(sheetName) {
  const sheet = SS.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  const [headers, ...rows] = sheet.getDataRange().getValues();
  return rows
    .filter(row => row[0] !== '' && row[0] !== null)
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[String(h)] = row[i]; });
      return obj;
    });
}

// ── Actions ───────────────────────────────────────────────────────────────────

// Returns all rows from the Data sheet as objects keyed by header name.
// Expected columns: Plan, Group, Name, Formula, Sets, Min Repeats, Max Repeats, Weight, Youtube URL
function getPlan() {
  return sheetToObjects('Data');
}

// Returns all rows from the Recent weight pivot sheet as objects.
// Column A (Група м'язів) is blank for non-first rows in each group (pivot behaviour),
// so we filter by column B (Вправа) which is always populated for data rows.
function getRecentWeights() {
  const sheet = SS.getSheetByName('Recent weight'); // note: lowercase 'w'
  if (!sheet) throw new Error('Sheet not found: Recent weight');
  const [headers, ...rows] = sheet.getDataRange().getValues();
  return rows
    .filter(row => row[1] !== '' && row[1] !== null) // column B = Вправа
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[String(h)] = row[i]; });
      return obj;
    });
}

// Appends one new log row to the Logs sheet (columns A–E only).
// Columns F–M are calculated by Sheets formulas — do NOT write them here.
// B uses server-side new Date() so Sheets recognises it as a datetime value
// and the existing formulas in F–M continue to work correctly.
// Expected payload: { uuid, exercise, weight, reps }
function postLog(data) {
  const sheet = SS.getSheetByName('Logs');
  if (!sheet) throw new Error('Sheet not found: Logs');
  sheet.appendRow([
    data.uuid,      // A: UUID
    new Date(),     // B: Дата — server timestamp, matches existing format
    data.exercise,  // C: Вправа
    data.weight,    // D: Вага (кг)
    data.reps,      // E: Факт. повторення
  ]);
  return { ok: true };
}

// Finds a row in Logs by UUID (column A) and updates weight + reps (D + E).
// Expected payload: { uuid, weight, reps }
function patchLog(data) {
  const sheet = SS.getSheetByName('Logs');
  if (!sheet) throw new Error('Sheet not found: Logs');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('No log rows found');

  const uuids = sheet.getRange(2, 1, lastRow - 1, 1).getValues(); // column A, skip header
  const idx   = uuids.findIndex(row => row[0] === data.uuid);
  if (idx === -1) throw new Error('UUID not found: ' + data.uuid);

  const sheetRow = idx + 2; // 1-indexed + header row
  sheet.getRange(sheetRow, 4).setValue(data.weight); // D
  sheet.getRange(sheetRow, 5).setValue(data.reps);   // E

  return { ok: true };
}
