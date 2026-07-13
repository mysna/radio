# EPG 현재 재생 정보 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add batched EPG program data to the player UI, playlist, progress indicator, and iPhone Media Session metadata.

**Architecture:** Keep the static app architecture. Add pure EPG parsing/timing helpers, a configurable API client, and a small in-memory refresh coordinator integrated into `src/app.js`.

**Tech Stack:** Static HTML/CSS/ES modules, browser Fetch API, Media Session API, Node test runner.

---

### Task 1: Add EPG configuration and pure helpers

**Files:** Create `src/config.js`, `src/epg.js`, `tests/epg.test.js`.

1. Test API URL joining, response normalization, progress clamping, and next-refresh delay.
2. Implement helpers for `/v1/now`, relative image URLs, UTC timestamps, and 30-second safety refresh.
3. Run `node --test tests/epg.test.js`.

### Task 2: Extend current-playing markup and styles

**Files:** Modify `index.html`, `styles.css`, `tests/uiContent.test.js`.

1. Add image, program title, time labels, and progress bar with accessible labels.
2. Add playlist program metadata hooks.
3. Test the new visible structure and responsive styles.

### Task 3: Integrate batched EPG refresh

**Files:** Modify `src/app.js`.

1. Fetch all selected playlist radio IDs in one request and retain results by ID.
2. Render current program details in the player and playlist.
3. Schedule progress-only ticks and refresh at event end/max 30 seconds.
4. Refresh on channel changes, visibility changes, and online events; ignore stale requests.

### Task 4: Integrate Media Session artwork and program metadata

**Files:** Modify `src/app.js`, `src/mediaSession.js`, `tests/mediaSession.test.js`.

1. Add artwork only when an image URL exists.
2. Use program title as title and channel as artist, with channel fallback.
3. Preserve live stream position behavior and test metadata construction.

### Task 5: Verify and commit

1. Run `npm test` and `node --check src/app.js`.
2. Inspect the diff and commit touched files with `feat: show current radio programs`.
