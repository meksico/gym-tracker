const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LOOKUP = new Map(DAY_ORDER.map(d => [d.toLowerCase(), d]));

// Maps a raw sheet value to its canonical weekday name regardless of case/whitespace
// (e.g. "TUESDAY ", " tuesday" -> "Tuesday"). Non-weekday values (custom day labels)
// are returned trimmed, unchanged.
export function normalizeDay(raw) {
  const trimmed = (raw ?? '').trim();
  return DAY_LOOKUP.get(trimmed.toLowerCase()) ?? trimmed;
}

// Returns today's day name if it's in trainingDays, otherwise the nearest upcoming one.
export function getDefaultDay(trainingDays) {
  const today = DAY_ORDER[new Date().getDay()];
  if (trainingDays.includes(today)) return today;
  const idx = DAY_ORDER.indexOf(today);
  for (let i = 1; i <= 7; i++) {
    const candidate = DAY_ORDER[(idx + i) % 7];
    if (trainingDays.includes(candidate)) return candidate;
  }
  return trainingDays[0] ?? 'Monday';
}
