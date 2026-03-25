function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function render() {
  const tasks = loadTasks();
  const doneSet = getTodayDone();
  const today = todayStr();
  const windows = loadWindows();

  // Date label
  const d = new Date();
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dateStr = d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });
  document.getElementById('todayLabel').textContent = timeStr + '  \u2022  ' + dateStr;

  const scheduleTasks = getScheduleTasks(tasks);
  const scheduled = buildSchedule(scheduleTasks);
  const completed = scheduled.filter(t => doneSet.has(t.id));

  const cal = document.getElementById('calendar');
  const empty = document.getElementById('emptyState');
  const summaryBar = document.getElementById('summaryBar');

  // Determine hour range - always cover all time windows
  let minHour = DAY_START_HOUR;
  let maxHour = DAY_END_HOUR;
  for (const w of windows) {
    minHour = Math.min(minHour, Math.floor(timeToMinutes(w.start) / 60));
    maxHour = Math.max(maxHour, Math.ceil(timeToMinutes(w.end) / 60));
  }
  if (scheduled.length) {
    const earliestMin = Math.min(...scheduled.map(s => s._startMin));
    const latestMin = Math.max(...scheduled.map(s => s._startMin + (s.duration || 15)));
    minHour = Math.min(minHour, Math.floor(earliestMin / 60));
    maxHour = Math.max(maxHour, Math.ceil(latestMin / 60));
  }

  if (scheduled.length === 0) {
    empty.style.display = '';
    summaryBar.style.display = 'none';
    cal.innerHTML = '';
    return;
  }

  empty.style.display = 'none';
  summaryBar.style.display = '';
  const totalMins = scheduled.reduce((s, t) => s + (t.duration || 0), 0);
  const doneMins = completed.reduce((s, t) => s + (t.duration || 0), 0);
  document.getElementById('statTasks').textContent = `${completed.length}/${scheduled.length} tasks done`;
  document.getElementById('statTime').textContent = totalMins ? `${formatDuration(doneMins)} / ${formatDuration(totalMins)}` : '';

  const totalHours = maxHour - minHour;
  const hourHeight = 60;

  // Build hour grid
  let html = '';
  for (let h = minHour; h < maxHour; h++) {
    const label = minutesToTime12(h * 60);
    html += `<div class="hour-row"><div class="hour-label">${label}</div><div class="hour-slot"></div></div>`;
  }
  cal.innerHTML = html;
  cal.style.position = 'relative';

  // Draw window backgrounds
  for (const w of windows) {
    const wStart = timeToMinutes(w.start);
    const wEnd = timeToMinutes(w.end);
    const top = ((wStart - minHour * 60) / 60) * hourHeight;
    const height = ((wEnd - wStart) / 60) * hourHeight;
    if (top + height <= 0 || top >= totalHours * hourHeight) continue;
    const div = document.createElement('div');
    div.className = 'window-bg';
    div.style.top = Math.max(0, top) + 'px';
    div.style.height = Math.min(height, totalHours * hourHeight - top) + 'px';
    div.innerHTML = `<span class="window-bg-label">${esc(w.name)}</span>`;
    cal.appendChild(div);
  }

  // Draw task blocks sequentially (no overlaps — you can only do one thing at a time)
  let prevBottom = 0;
  const GAP = 4;
  for (const t of scheduled) {
    const isDone = doneSet.has(t.id);
    const timeTop = ((t._startMin - minHour * 60) / 60) * hourHeight;
    const top = Math.max(timeTop, prevBottom + GAP);
    const dur = t.duration || 15;
    const minHeight = Math.max((dur / 60) * hourHeight, 44);
    prevBottom = top + minHeight;
    const isOverdue = t.dueDate && t.dueDate < today;

    const div = document.createElement('div');
    div.className = 'cal-task' + (isDone ? ' completed' : '');
    div.style.top = top + 'px';
    div.style.minHeight = minHeight + 'px';

    let badges = '';
    if (t.daily) badges += '<span class="badge badge-daily">Daily</span>';
    if (isOverdue) badges += '<span class="badge badge-overdue">Overdue</span>';

    div.innerHTML = `
      <input type="checkbox" ${isDone ? 'checked' : ''} onchange="toggleCheck('${t.id}')">
      <div>
        <div class="cal-task-name">${esc(t.name)}${badges}</div>
        <div class="cal-task-time">${minutesToTime12(t._startMin)}${dur ? ' \u2022 ' + formatDuration(dur) : ''}</div>
      </div>
      <button class="cal-task-delete" onclick="deleteTask('${t.id}')" title="Delete">\u00d7</button>
    `;
    cal.appendChild(div);
  }

  // Now line
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  if (nowMins >= minHour * 60 && nowMins <= maxHour * 60) {
    const nowTop = ((nowMins - minHour * 60) / 60) * hourHeight;
    const line = document.createElement('div');
    line.className = 'now-line';
    line.style.top = nowTop + 'px';
    cal.appendChild(line);
  }

  populateWindowSelect();
}

function populateWindowSelect() {
  const sel = document.getElementById('timeWindow');
  const windows = loadWindows();
  const current = sel.value;
  sel.innerHTML = '<option value="">Any time</option>' +
    windows.map(w => `<option value="${w.id}">${esc(w.name)} (${formatTime24to12(w.start)}\u2013${formatTime24to12(w.end)})</option>`).join('');
  if (current) sel.value = current;
}

// Add task modal
window.openAddTask = function() {
  document.getElementById('addTaskModal').classList.add('open');
  document.getElementById('dueDate').value = todayStr();
  populateWindowSelect();
  setTimeout(() => document.getElementById('taskName').focus(), 50);
};

window.closeAddTask = function() {
  document.getElementById('addTaskModal').classList.remove('open');
};

document.getElementById('addTaskModal').addEventListener('click', function(e) {
  if (e.target === this) closeAddTask();
});

document.getElementById('taskForm').addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('taskName').value.trim();
  if (!name) return;
  const task = {
    id: generateId(),
    name,
    dueDate: document.getElementById('dueDate').value || '',
    duration: parseInt(document.getElementById('duration').value) || 0,
    daily: document.getElementById('isDaily').checked,
    window: document.getElementById('timeWindow').value || '',
    createdAt: new Date().toISOString(),
  };
  const tasks = loadTasks();
  tasks.push(task);
  saveTasks(tasks);
  e.target.reset();
  closeAddTask();
  render();
});

// Settings
window.openSettings = function() {
  document.getElementById('settingsModal').classList.add('open');
  populateTimePickers();
  renderWindowList();
};

window.closeSettings = function() {
  document.getElementById('settingsModal').classList.remove('open');
  render();
};

document.getElementById('settingsModal').addEventListener('click', function(e) {
  if (e.target === this) closeSettings();
});

function renderWindowList() {
  const windows = loadWindows();
  document.getElementById('windowList').innerHTML = windows.map(w =>
    `<li>
      <span>${esc(w.name)}</span>
      <span class="window-time-range">${formatTime24to12(w.start)} \u2013 ${formatTime24to12(w.end)}</span>
      <button class="delete-btn" onclick="removeWindow('${w.id}')" title="Remove">\u00d7</button>
    </li>`
  ).join('');
}

// Populate time picker dropdowns
function populateTimePickers() {
  const hourSels = ['newWinStartH', 'newWinEndH'];
  const minSels = ['newWinStartM', 'newWinEndM'];
  for (const id of hourSels) {
    const sel = document.getElementById(id);
    if (sel.options.length) continue;
    for (let h = 1; h <= 12; h++) {
      const opt = document.createElement('option');
      opt.value = h;
      opt.textContent = String(h).padStart(2, '0');
      sel.appendChild(opt);
    }
  }
  for (const id of minSels) {
    const sel = document.getElementById(id);
    if (sel.options.length) continue;
    for (let m = 0; m < 60; m += 15) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = String(m).padStart(2, '0');
      sel.appendChild(opt);
    }
  }
  // Defaults: start 7 AM, end 10 AM
  document.getElementById('newWinStartH').value = '7';
  document.getElementById('newWinStartM').value = '0';
  document.getElementById('newWinStartAP').value = 'AM';
  document.getElementById('newWinEndH').value = '10';
  document.getElementById('newWinEndM').value = '0';
  document.getElementById('newWinEndAP').value = 'AM';
}

function readTimePicker(prefix) {
  let h = parseInt(document.getElementById(prefix + 'H').value);
  const m = parseInt(document.getElementById(prefix + 'M').value);
  const ap = document.getElementById(prefix + 'AP').value;
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

window.addWindow = function() {
  const name = document.getElementById('newWinName').value.trim();
  const start = readTimePicker('newWinStart');
  const end = readTimePicker('newWinEnd');
  if (!name) return;
  const windows = loadWindows();
  windows.push({ id: generateId(), name, start, end });
  windows.sort((a, b) => a.start.localeCompare(b.start));
  saveWindows(windows);
  document.getElementById('newWinName').value = '';
  renderWindowList();
};

window.removeWindow = function(id) {
  saveWindows(loadWindows().filter(w => w.id !== id));
  renderWindowList();
};

window.resetWindows = function() {
  saveWindows([...DEFAULT_WINDOWS]);
  renderWindowList();
};

window.toggleCheck = function(id) { toggleDone(id); render(); };
window.deleteTask = function(id) { saveTasks(loadTasks().filter(t => t.id !== id)); render(); };

// Pin summary bar below topbar
function updateStickyOffset() {
  const topbar = document.querySelector('.topbar');
  const summary = document.getElementById('summaryBar');
  if (topbar && summary) {
    summary.style.top = topbar.offsetHeight + 'px';
  }
}
window.addEventListener('resize', updateStickyOffset);

// Version — bump this when making changes
const APP_VERSION = '1.0.0';
document.getElementById('versionBadge').textContent = 'v' + APP_VERSION;

// Update now-line every minute
setInterval(render, 60000);
render();
updateStickyOffset();
