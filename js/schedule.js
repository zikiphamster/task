const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;

// Break rules:
// - 5 min break between tasks by default
// - 15 min break after a task >= 60 min
// - 20 min break after every 90 min of cumulative work (focus reset)
const BREAK_SHORT = 5;
const BREAK_LONG = 15;
const BREAK_FOCUS = 20;
const FOCUS_THRESHOLD = 90; // cumulative minutes before a focus break

function getScheduleTasks(tasks) {
  const today = todayStr();
  return tasks.filter(t => {
    if (t.daily) return true;
    if (!t.dueDate) return true;
    return t.dueDate <= today;
  });
}

function sortByPriority(tasks) {
  const today = todayStr();
  return [...tasks].sort((a, b) => {
    const aOv = a.dueDate && a.dueDate < today ? 1 : 0;
    const bOv = b.dueDate && b.dueDate < today ? 1 : 0;
    if (bOv !== aOv) return bOv - aOv;
    if (a.daily !== b.daily) return a.daily ? -1 : 1;
    const aD = a.dueDate || '9999', bD = b.dueDate || '9999';
    if (aD !== bD) return aD < bD ? -1 : 1;
    return (a.duration || 999) - (b.duration || 999);
  });
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime12(mins) {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  const ap = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')} ${ap}` : `${h12} ${ap}`;
}

function formatTime24to12(t) {
  return minutesToTime12(timeToMinutes(t));
}

function formatDuration(mins) {
  if (!mins) return '';
  if (mins < 60) return mins + 'min';
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function calcBreak(taskDur, cumulativeWork) {
  // Focus break if we've been working too long
  if (cumulativeWork >= FOCUS_THRESHOLD) {
    return { breakMin: BREAK_FOCUS, resetWork: true };
  }
  // Long break after a long task
  if (taskDur >= 60) {
    return { breakMin: BREAK_LONG, resetWork: false };
  }
  // Short break between normal tasks
  return { breakMin: BREAK_SHORT, resetWork: false };
}

function buildSchedule(tasks) {
  const windows = loadWindows();
  const windowMap = {};
  for (const w of windows) windowMap[w.id] = [];
  windowMap['_unassigned'] = [];

  for (const t of tasks) {
    if (t.window && windowMap[t.window]) windowMap[t.window].push(t);
    else windowMap['_unassigned'].push(t);
  }

  // For each task, the earliest it can start is 10 min after it was created
  function taskEarliest(t) {
    if (t.createdAt) {
      const d = new Date(t.createdAt);
      return d.getHours() * 60 + d.getMinutes() + 10;
    }
    return 0;
  }

  const scheduled = [];

  for (const w of windows) {
    const wTasks = sortByPriority(windowMap[w.id]);
    let cursor = timeToMinutes(w.start);
    let cumulativeWork = 0;
    let isFirst = true;

    for (const t of wTasks) {
      const dur = t.duration || 15;
      cursor = Math.max(cursor, taskEarliest(t));

      // Add break before this task (not before the first one)
      if (!isFirst) {
        const brk = calcBreak(dur, cumulativeWork);
        cursor += brk.breakMin;
        if (brk.resetWork) cumulativeWork = 0;
      }
      isFirst = false;

      scheduled.push({ ...t, _startMin: cursor, _window: w });
      cursor += dur;
      cumulativeWork += dur;
    }
  }

  const unassigned = sortByPriority(windowMap['_unassigned']);
  if (unassigned.length) {
    const lastWin = windows[windows.length - 1];
    let cursor = timeToMinutes(lastWin ? lastWin.end : '22:00');
    let cumulativeWork = 0;
    let isFirst = true;

    const lastWinTasks = scheduled.filter(s => s._window && lastWin && s._window.id === lastWin.id);
    if (lastWinTasks.length) {
      const last = lastWinTasks[lastWinTasks.length - 1];
      cursor = Math.max(cursor, last._startMin + (last.duration || 15));
      isFirst = false;
    }

    for (const t of unassigned) {
      const dur = t.duration || 15;
      cursor = Math.max(cursor, taskEarliest(t));

      if (!isFirst) {
        const brk = calcBreak(dur, cumulativeWork);
        cursor += brk.breakMin;
        if (brk.resetWork) cumulativeWork = 0;
      }
      isFirst = false;

      scheduled.push({ ...t, _startMin: cursor, _window: null });
      cursor += dur;
      cumulativeWork += dur;
    }
  }

  return scheduled;
}
