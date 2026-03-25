# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Single-page daily task scheduler built with vanilla HTML, CSS, and JavaScript. No frameworks, no build step, no dependencies. Open `index.html` in a browser to run.

## Architecture

Scripts load in order in `index.html`: `storage.js` → `schedule.js` → `ui.js`. Each depends on the previous.

- **js/storage.js** — localStorage CRUD for tasks, completion state, and time windows. Handles default window config with version-based migration (`WINDOWS_VERSION`). All data lives in `localStorage` under `braindump_*` keys.
- **js/schedule.js** — Core scheduling algorithm. `buildSchedule()` groups tasks by time window, sorts by priority (overdue → daily → due date → shortest duration), places them sequentially with automatic breaks. Also contains time formatting utilities.
- **js/ui.js** — Renders the day calendar, task blocks, modals, and event handlers. `render()` is the main function, called on load and every 60 seconds. All global UI functions are attached to `window.*`.

## Key Conventions

- No module system — all JS files share a global scope, loaded via `<script>` tags
- Task IDs generated via `Date.now().toString(36) + random` (see `generateId()`)
- Tasks have a `createdAt` timestamp used to prevent scheduling before creation time + 10 min
- Completion state is tracked per-day and auto-cleaned after 7 days
- CSS uses custom properties defined in `:root` for theming (dark theme)

## Version

`APP_VERSION` constant at the bottom of `js/ui.js` — bump this on every notable change.
