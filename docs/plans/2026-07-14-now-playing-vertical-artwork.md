# Now Playing Vertical Artwork Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render current playback details vertically with a large, proportionally scaled program image.

**Architecture:** Reorder the existing semantic hooks in `index.html` so the display order matches the requested information hierarchy. Replace the two-column thumbnail CSS with a single-column artwork area that constrains an image's longer dimension to the card width while preserving its aspect ratio and existing hidden-state behavior.

**Tech Stack:** Static HTML, CSS, Node.js built-in test runner

---

### Task 1: Specify the vertical current-program layout

**Files:**
- Modify: `tests/uiContent.test.js`

**Step 1: Write the failing test**

Add assertions that `nowTitle`, `nowMeta`, `programArtwork`, `nowProgram`, and `programProgress` occur in that order. Assert that the artwork wrapper uses a square maximum area and the image preserves its ratio with both dimensions constrained to that area.

**Step 2: Run test to verify it fails**

Run: `node --test tests/uiContent.test.js`
Expected: FAIL because the artwork currently precedes channel copy and has a fixed 88px size.

### Task 2: Implement the vertical layout

**Files:**
- Modify: `index.html`
- Modify: `styles.css`

**Step 1: Write minimal implementation**

Move the artwork wrapper between `nowMeta` and `nowProgram`, keeping all existing IDs and classes. Make `.now-content` a single-column flow. Give the visible artwork wrapper a square maximum area based on the card width, then constrain both image dimensions to 100% with automatic intrinsic sizing and centered alignment.

**Step 2: Run test to verify it passes**

Run: `node --test tests/uiContent.test.js`
Expected: PASS

**Step 3: Run the full suite**

Run: `npm test`
Expected: PASS

**Step 4: Commit**

```bash
git add index.html styles.css tests/uiContent.test.js docs/plans/2026-07-14-now-playing-vertical-artwork-design.md docs/plans/2026-07-14-now-playing-vertical-artwork.md
git commit -m "feat: stack current program artwork vertically"
```
