# Tasks

A single-page daily task scheduler. Brain dump everything you need to do, and it automatically builds a prioritized schedule for your day.

## Features

- **Day calendar view** — tasks displayed as blocks on a vertical timeline from 7 AM to 10 PM
- **Time windows** — configurable periods (Morning, Midday, Afternoon, Evening) that tasks can be assigned to
- **Smart scheduling** — automatic priority sorting (overdue → daily → earliest due date → shortest duration) with built-in breaks
- **Break logic** — 5 min between tasks, 15 min after long tasks (60+ min), 20 min focus reset after 90 min of cumulative work
- **Daily recurring tasks** — mark tasks as daily so they appear every day
- **Checklist** — check off tasks as you complete them; progress shown in the summary bar
- **Now line** — red line showing the current time on the calendar
- **localStorage persistence** — all tasks, completion state, and settings saved locally

## Usage

Open `index.html` in a browser. No build step or server required.

1. Click **+ Add Task** to create a task with a name, due date, duration, time window, and optional daily recurrence
2. Tasks are automatically scheduled into the calendar based on priority and time windows
3. Check off tasks as you complete them
4. Click the gear icon to configure time windows in Settings

## File Structure

```
index.html          — main HTML page
css/style.css       — all styling
js/storage.js       — localStorage helpers, default windows, migration
js/schedule.js      — scheduling algorithm, sorting, break calculation
js/ui.js            — rendering, modals, event handlers
```
