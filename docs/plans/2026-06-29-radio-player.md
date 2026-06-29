# Radio Player Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a static, responsive radio player with saved playlist management, regional channels, media previous/next support, and iOS/car Bluetooth metadata.

**Architecture:** Keep channel data in `src/channels.js`, pure playlist helpers in `src/playerState.js`, and DOM/audio integration in `src/app.js`. The page derives stream URLs from fixed `https://radio.bsod.kr/stream/` query parameters and persists selected channel IDs in `localStorage`.

**Tech Stack:** Static HTML, CSS, ES modules, browser `HTMLAudioElement`, browser `Media Session API`, Node built-in test runner.

---

### Task 1: Core Playlist Logic

**Files:**
- Create: `package.json`
- Create: `tests/playerState.test.js`
- Create: `src/playerState.js`

**Step 1: Write the failing test**

Test fixed URL generation, default selection, select all / clear all, playlist filtering, and previous/next wrapping in `tests/playerState.test.js`.

**Step 2: Run test to verify it fails**

Run: `npm test`

Expected: FAIL because `src/playerState.js` does not exist yet.

**Step 3: Write minimal implementation**

Implement pure helpers in `src/playerState.js`.

**Step 4: Run test to verify it passes**

Run: `npm test`

Expected: PASS.

### Task 2: Channel Catalog

**Files:**
- Create: `src/channels.js`

**Step 1: Add all regional channel data**

Create `REGIONS` and `CHANNELS` from the fixed identifiers listed on `radio.bsod.kr`.

**Step 2: Verify import shape**

Run: `node --input-type=module -e "import('./src/channels.js').then(m => console.log(m.CHANNELS.length, m.REGIONS.length))"`

Expected: prints positive channel and region counts.

### Task 3: Static UI and Audio Integration

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `src/app.js`

**Step 1: Build the responsive page**

Add native audio controls, previous/next buttons, current channel display, playlist/full-list tabs, region selector, and checkbox lists.

**Step 2: Wire app behavior**

Load selected IDs from `localStorage`, render playlist/full list, play selected channel URLs, update Media Session metadata, and register previous/next action handlers.

**Step 3: Verify tests**

Run: `npm test`

Expected: PASS.

**Step 4: Serve locally**

Run: `python3 -m http.server 8000`

Expected: page available at `http://localhost:8000/`.

