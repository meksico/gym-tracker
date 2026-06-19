export const TRAINING_DAYS = ['Monday', 'Wednesday', 'Friday'];

// Maps JS getDay() (0=Sun) to nearest upcoming training day
const JS_DAY_TO_TRAINING = {
  0: 'Monday',    // Sunday    → next is Monday
  1: 'Monday',    // Monday    ✓
  2: 'Wednesday', // Tuesday   → next is Wednesday
  3: 'Wednesday', // Wednesday ✓
  4: 'Friday',    // Thursday  → next is Friday
  5: 'Friday',    // Friday    ✓
  6: 'Monday',    // Saturday  → next is Monday
};

export function getCurrentDay() {
  return JS_DAY_TO_TRAINING[new Date().getDay()];
}

export function getTrainingDays() {
  return [...TRAINING_DAYS];
}
