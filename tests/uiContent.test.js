import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const stylesCss = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const appJs = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

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
});

test("compact lists keep remove actions on the right and avoid repeated section headings", () => {
  assert.doesNotMatch(stylesCss, /max-width: 560px\)[\s\S]*?\.station-row\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/);
  assert.match(stylesCss, /\.station-row\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
  assert.doesNotMatch(indexHtml, /<p class="label">Saved Playlist<\/p>[\s\S]*?<h3>재생 목록<\/h3>/);
  assert.doesNotMatch(indexHtml, /<p class="label">Channel Library<\/p>[\s\S]*?<h3>전체 채널<\/h3>/);
});

test("channel tools stay in one row with icon buttons", () => {
  assert.match(indexHtml, /class="channel-controls"[\s\S]*id="selectAllButton"[\s\S]*<svg[\s\S]*<span class="button-label">전체 체크<\/span>[\s\S]*id="clearAllButton"[\s\S]*<svg[\s\S]*<span class="button-label">전체 해제<\/span>[\s\S]*id="regionSelect"/);
  assert.match(stylesCss, /\.channel-controls\s*{[\s\S]*display:\s*flex;[\s\S]*flex-wrap:\s*nowrap;/);
  assert.match(stylesCss, /\.bulk-actions \.text-button\s*{[\s\S]*min-width:\s*112px;/);
  assert.doesNotMatch(stylesCss, /max-width: 560px\)[\s\S]*?\.channel-controls\s*{[\s\S]*flex-direction:\s*column/);
});

test("playlist remove button is rendered as an icon button", () => {
  assert.match(appJs, /removeButton\.innerHTML\s*=\s*`[\s\S]*<svg[\s\S]*sr-only[\s\S]*제거/);
  assert.match(stylesCss, /\.remove-button svg\s*{/);
});
