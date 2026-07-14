export function setMediaSessionActionHandler(mediaSession, action, handler) {
  try {
    mediaSession.setActionHandler(action, handler);
  } catch {
    // Safari may expose Media Session while rejecting individual actions.
  }
}

export function setLiveMediaSessionPosition(mediaSession) {
  if (typeof mediaSession.setPositionState !== "function") {
    return;
  }

  try {
    mediaSession.setPositionState({
      duration: Infinity,
      playbackRate: 1,
      position: 0,
    });
  } catch {
    // Safari may expose Media Session while rejecting position state updates.
  }
}

export function setProgramMediaSessionPosition(mediaSession, positionState) {
  if (typeof mediaSession.setPositionState !== "function" || !positionState) return;
  try {
    mediaSession.setPositionState(positionState);
  } catch {
    // Safari may reject position state values on some versions.
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

export function createRadioMetadata({ channelName, regionName, program }) {
  return {
    title: program?.title || channelName,
    artist: channelName,
    album: regionName,
  };
}
