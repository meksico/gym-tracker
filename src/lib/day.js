const DAY_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
