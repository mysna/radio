export function setMediaSessionActionHandler(mediaSession, action, handler) {
  try {
    mediaSession.setActionHandler(action, handler);
  } catch {
    // Safari may expose Media Session while rejecting individual actions.
  }
}

export function registerRadioMediaSessionActions(mediaSession, handlers) {
  setMediaSessionActionHandler(mediaSession, "previoustrack", handlers.previous);
  setMediaSessionActionHandler(mediaSession, "nexttrack", handlers.next);
  setMediaSessionActionHandler(mediaSession, "seekbackward", handlers.previous);
  setMediaSessionActionHandler(mediaSession, "seekforward", handlers.next);
  setMediaSessionActionHandler(mediaSession, "play", handlers.play);
  setMediaSessionActionHandler(mediaSession, "pause", handlers.pause);
}

export function createMediaMetadata(metadata) {
  if (typeof MediaMetadata !== "function") {
    return null;
  }

  return new MediaMetadata(metadata);
}
