# Radio Player Design

## Goal

Build a simple responsive Korean radio player that uses fixed stream URLs from `https://radio.bsod.kr/stream/`, lets users manage a saved playlist from the full regional channel list, and exposes channel metadata to iOS/car Bluetooth media displays through the Media Session API.

## Approach

Use a static web app: `index.html`, `styles.css`, and JavaScript modules under `src/`. Keep the channel catalog in code so the page does not depend on runtime scraping. Generate fixed stream URLs from each channel's `stn`, optional `ch`, and optional `city` values.

The player uses one `<audio controls>` element. The visible playlist is derived from checked channels in the full list and stored in `localStorage`. Previous/next UI buttons and Media Session `previoustrack`/`nexttrack` handlers move through the current playlist order.

## UI

The layout has a compact player header, native audio controls, a current-channel panel, and two tabs:

- `재생 목록`: selected channels only, tap any channel to play it.
- `전체 채널`: region-filtered full list with checkboxes, select-all, and clear-all controls.

The page is responsive for desktop and iPhone widths. Controls stay large enough for touch, and lists use stable row heights with clear active and selected states.

## Media Metadata

When playback changes, set `navigator.mediaSession.metadata` with:

- `title`: channel name
- `artist`: region name
- `album`: `Radio`

This is the browser-standard way to surface channel metadata to iOS lock screen, Control Center, Bluetooth controls, and compatible car displays. Actual car display behavior still depends on iOS Safari and the vehicle head unit.

## Testing

Use Node's built-in test runner for pure playlist logic:

- fixed URL generation
- saved selection normalization
- select all / clear all
- playlist derivation
- previous/next wrapping

