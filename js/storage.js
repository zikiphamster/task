const STORAGE_KEY = 'braindump_tasks';
const DONE_KEY = 'braindump_done';
const WINDOWS_KEY = 'braindump_windows';

const DEFAULT_WINDOWS = [
  { id: 'morning', name: 'Morning', start: '07:00', end: '10:00' },
  { id: 'midday',  name: 'Midday',  start: '10:00', end: '15:00' },
  { id: 'afternoon', name: 'Afternoon', start: '15:00', end: '19:00' },
  { id: 'evening', name: 'Evening', start: '19:00', end: '22:00' },
];

const WINDOWS_VERSION = 2;

function loadWindows() {
  try {
    const ver = localStorage.getItem(WINDOWS_KEY + '_v');
    if (!ver || parseInt(ver) < WINDOWS_VERSION) {
      // Migrate to new defaults
      localStorage.setItem(WINDOWS_KEY + '_v', String(WINDOWS_VERSION));
      saveWindows([...DEFAULT_WINDOWS]);
      return [...DEFAULT_WINDOWS];
    }
    const w = JSON.parse(localStorage.getItem(WINDOWS_KEY));
    return w && w.length ? w : [...DEFAULT_WINDOWS];
  } catch { return [...DEFAULT_WINDOWS]; }
}

function saveWindows(w) {
  localStorage.setItem(WINDOWS_KEY, JSON.stringify(w));
}

function loadTasks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveTasks(t) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

function loadDone() {
  try { return JSON.parse(localStorage.getItem(DONE_KEY)) || {}; }
  catch { return {}; }
}

function saveDone(d) {
  localStorage.setItem(DONE_KEY, JSON.stringify(d));
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function getTodayDone() {
  const done = loadDone();
  return new Set(done[todayStr()] || []);
}

function toggleDone(id) {
  const done = loadDone();
  const today = todayStr();
  if (!done[today]) done[today] = [];
  const idx = done[today].indexOf(id);
  if (idx === -1) done[today].push(id);
  else done[today].splice(idx, 1);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  for (const d of Object.keys(done)) {
    if (d < cutoff.toISOString().slice(0, 10)) delete done[d];
  }
  saveDone(done);
}
