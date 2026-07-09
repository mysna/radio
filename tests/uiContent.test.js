import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const stylesCss = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const appJs = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const deployWorkflow = readFileSync(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");

test("player panel uses the Korean service title without the old heading", () => {
  assert.match(indexHtml, />대한민국 라디오</);
  assert.doesNotMatch(indexHtml, />라디오 플레이어</);
});

test("layout uses semantic music-player regions with responsive utility classes", () => {
  assert.match(indexHtml, /<aside[^>]+aria-label="현재 재생"/);
  assert.match(indexHtml, /<section[^>]+aria-labelledby="library-title"/);
  assert.match(indexHtml, /class="[^"]*app-shell[^"]*"/);
  assert.doesNotMatch(indexHtml, /(?:^|\s)(sm|md|lg|xl):/);
});

test("page keeps styling local without a third-party runtime script", () => {
  assert.doesNotMatch(indexHtml, /cdn\.tailwindcss\.com/);
  assert.doesNotMatch(indexHtml, /<script[^>]+src="https?:\/\//);
});

test("home screen installs have a PNG touch icon", () => {
  assert.match(indexHtml, /<link rel="icon" type="image\/png" sizes="64x64" href="\.\/favicon\.png" \/>/);
  assert.doesNotMatch(indexHtml, /<link rel="icon" type="image\/svg\+xml"/);
  assert.match(indexHtml, /<link rel="apple-touch-icon" sizes="180x180" href="\.\/apple-touch-icon\.png" \/>/);
  assert.match(indexHtml, /<link rel="manifest" href="\.\/site\.webmanifest" \/>/);
  assert.ok(existsSync(new URL("../favicon.png", import.meta.url)));
  assert.ok(existsSync(new URL("../apple-touch-icon.png", import.meta.url)));
  assert.ok(existsSync(new URL("../site.webmanifest", import.meta.url)));
  assert.match(deployWorkflow, /cp index\.html styles\.css favicon\.png apple-touch-icon\.png site\.webmanifest _site\//);
});

test("GitHub Pages workflow uses Node 24-compatible actions", () => {
  assert.match(deployWorkflow, /uses: actions\/configure-pages@v6/);
  assert.match(deployWorkflow, /uses: actions\/upload-pages-artifact@v5/);
  assert.match(deployWorkflow, /uses: actions\/deploy-pages@v5/);
});

test("vanilla CSS defines a clear responsive design system", () => {
  assert.match(stylesCss, /--color-bg:/);
  assert.match(stylesCss, /--font-size-display:/);
  assert.match(stylesCss, /@media \(max-width: 900px\)/);
  assert.doesNotMatch(stylesCss, /@import "tailwindcss"/);
});

test("current channel panel does not include the decorative Clear Signal block", () => {
  assert.doesNotMatch(indexHtml, /Clear<br\s*\/?>Signal/);
  assert.doesNotMatch(indexHtml, /class="signal-art/);
});

test("transport controls are icon buttons that stay in one row", () => {
  assert.match(indexHtml, /id="previousButton"[\s\S]*?<svg/);
  assert.match(indexHtml, /id="playbackButton"[\s\S]*?<svg/);
  assert.match(indexHtml, /id="nextButton"[\s\S]*?<svg/);
  assert.match(stylesCss, /\.transport\s*{[\s\S]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(stylesCss, /\.transport\s*{[\s\S]*margin-top:\s*18px;/);
});

test("now playing panel omits the audio visualizer", () => {
  assert.doesNotMatch(indexHtml, />현재 채널</);
  assert.match(indexHtml, /<section class="now-panel" aria-label="현재 재생 채널">/);
  assert.doesNotMatch(indexHtml, /audioVisualizer/);
  assert.doesNotMatch(indexHtml, /audio-visualizer/);
  assert.doesNotMatch(stylesCss, /\.audio-visualizer/);
  assert.match(stylesCss, /\.status-line:empty\s*{[\s\S]*display:\s*none;/);
});

test("app does not import or start an audio visualizer", () => {
  assert.match(indexHtml, /<audio id="audioPlayer" preload="none" crossorigin="anonymous"><\/audio>/);
  assert.doesNotMatch(appJs, /audioVisualizer/);
  assert.doesNotMatch(appJs, /createAudioVisualizer/);
  assert.doesNotMatch(appJs, /visualizer\./);
  assert.doesNotMatch(appJs, /beginUserPlayback/);
});

test("compact lists keep remove actions on the right and avoid repeated section headings", () => {
  assert.doesNotMatch(stylesCss, /max-width: 560px\)[\s\S]*?\.station-row\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/);
  assert.match(stylesCss, /\.station-row\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.doesNotMatch(indexHtml, /<p class="label">Saved Playlist<\/p>[\s\S]*?<h3>재생 목록<\/h3>/);
  assert.doesNotMatch(indexHtml, /<p class="label">Channel Library<\/p>[\s\S]*?<h3>전체 채널<\/h3>/);
});

test("channel tools stay in one row with icon buttons", () => {
  assert.match(indexHtml, /class="channel-controls"[\s\S]*id="selectAllButton"[\s\S]*<svg[\s\S]*<span class="sr-only">전체 체크<\/span>[\s\S]*id="clearAllButton"[\s\S]*<svg[\s\S]*<span class="sr-only">전체 해제<\/span>[\s\S]*id="regionSelect"/);
  assert.doesNotMatch(indexHtml, /class="button-label"/);
  assert.match(stylesCss, /\.channel-controls\s*{[\s\S]*display:\s*flex;[\s\S]*flex-wrap:\s*nowrap;/);
  assert.match(stylesCss, /\.bulk-actions\s*{[\s\S]*margin-right:\s*auto;/);
  assert.match(stylesCss, /\.channel-controls select\s*{[\s\S]*margin-left:\s*auto;/);
  assert.match(stylesCss, /\.bulk-actions \.text-button\s*{[\s\S]*width:\s*40px;[\s\S]*min-width:\s*40px;[\s\S]*height:\s*40px;[\s\S]*min-height:\s*40px;/);
  assert.doesNotMatch(stylesCss, /max-width: 560px\)[\s\S]*?\.channel-controls\s*{[\s\S]*flex-direction:\s*column/);
});

test("playlist remove button is rendered as an icon button", () => {
  assert.match(appJs, /removeButton\.innerHTML\s*=\s*`[\s\S]*<svg[\s\S]*sr-only[\s\S]*제거/);
  assert.match(stylesCss, /\.remove-button svg\s*{/);
});

test("channel lists use headerless table rows with subtle metadata", () => {
  assert.match(appJs, /<span class="station-title"><\/span>[\s\S]*<span class="station-meta"><\/span>/);
  assert.doesNotMatch(appJs, /class="station-line"/);
  assert.match(stylesCss, /\.list\s*{[\s\S]*gap:\s*0;[\s\S]*overflow:\s*hidden;/);
  assert.match(stylesCss, /\.station-row:not\(:last-child\),\s*\.check-row:not\(:last-child\)\s*{[\s\S]*border-bottom:/);
  assert.match(stylesCss, /\.station-meta\s*{[\s\S]*color:\s*var\(--color-muted\);[\s\S]*font-size:\s*var\(--font-size-caption\);/);
});

test("channel checkboxes use rounded custom borders", () => {
  assert.match(stylesCss, /\.check-row input\s*{[\s\S]*appearance:\s*none;[\s\S]*border-radius:\s*7px;/);
  assert.match(stylesCss, /\.check-row input:checked\s*{[\s\S]*background-color:\s*var\(--color-accent\);/);
});
