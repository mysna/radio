const STREAM_BASE_URL = "https://radio.bsod.kr/stream/";

export function buildStreamUrl(channel) {
  const params = new URLSearchParams();
  params.set("stn", channel.stn);

  if (channel.ch) {
    params.set("ch", channel.ch);
  }

  if (channel.city) {
    params.set("city", channel.city);
  }

  return `${STREAM_BASE_URL}?${params.toString()}`;
}

export function normalizeSelection(savedIds, channels) {
  const validIds = new Set(channels.map((channel) => channel.id));

  if (!Array.isArray(savedIds)) {
    return new Set(validIds);
  }

  return new Set(savedIds.filter((id) => validIds.has(id)));
}

export function toggleChannel(selectedIds, channelId, checked) {
  const next = new Set(selectedIds);

  if (checked) {
    next.add(channelId);
  } else {
    next.delete(channelId);
  }

  return next;
}

export function removeChannel(selectedIds, channelId) {
  const next = new Set(selectedIds);
  next.delete(channelId);
  return next;
}

export function setAllSelected(channels, checked) {
  if (!checked) {
    return new Set();
  }

  return new Set(channels.map((channel) => channel.id));
}

export function getPlaylist(channels, selectedIds) {
  return channels.filter((channel) => selectedIds.has(channel.id));
}

export function getNextIndex(currentIndex, playlistLength) {
  if (playlistLength <= 0) {
    return -1;
  }

  if (currentIndex < 0) {
    return 0;
  }

  return (currentIndex + 1) % playlistLength;
}

export function getPreviousIndex(currentIndex, playlistLength) {
  if (playlistLength <= 0) {
    return -1;
  }

  if (currentIndex < 0) {
    return playlistLength - 1;
  }

  return (currentIndex - 1 + playlistLength) % playlistLength;
}
