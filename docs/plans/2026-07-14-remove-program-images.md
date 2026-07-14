# Remove Program Images Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove program artwork from both the visible player and lock-screen media metadata.

**Architecture:** Delete the image presentation hooks from HTML, CSS, and the now-playing renderer. Stop normalizing EPG image URLs and stop emitting Media Session artwork while preserving all text and progress metadata.

**Tech Stack:** Static HTML, CSS, JavaScript, Node.js built-in test runner

---

### Task 1: Specify image-free playback metadata

**Files:**
- Modify: `tests/uiContent.test.js`
- Modify: `tests/epg.test.js`
- Modify: `tests/mediaSession.test.js`

**Step 1: Write failing tests**

Assert that the UI and application contain no program-artwork hooks, normalized programs contain no `programImageUrl`, and radio metadata contains no `artwork` even when the input includes an image URL.

**Step 2: Verify RED**

Run: `node --test tests/uiContent.test.js tests/epg.test.js tests/mediaSession.test.js`
Expected: FAIL because image hooks and metadata are still present.

### Task 2: Remove program images

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/app.js`
- Modify: `src/epg.js`
- Modify: `src/mediaSession.js`

**Step 1: Implement the minimal removal**

Delete the artwork DOM and CSS, renderer selectors and assignments, image URL helper and normalized property, and Media Session `artwork` assignment.

**Step 2: Verify GREEN**

Run: `node --test tests/uiContent.test.js tests/epg.test.js tests/mediaSession.test.js`
Expected: PASS

**Step 3: Run the full suite**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add index.html styles.css src/app.js src/epg.js src/mediaSession.js tests/uiContent.test.js tests/epg.test.js tests/mediaSession.test.js docs/plans/2026-07-14-remove-program-images-design.md docs/plans/2026-07-14-remove-program-images.md
git commit -m "refactor: remove program images"
```
