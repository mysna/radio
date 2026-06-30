import { CHANNELS, REGIONS, getRegionName } from "./channels.js";
import { createMediaMetadata, registerRadioMediaSessionActions } from "./mediaSession.js";
import {
  getPlaybackButtonState,
  getPlaybackFailureMessage,
  shouldAutoplayRestoredChannel,
} from "./playbackUi.js";
import {
  buildStreamUrl,
  getNextIndex,
  getPlaylist,
  getPreviousIndex,
  normalizeSelection,
  removeChannel,
  setAllSelected,
  toggleChannel,
} from "./playerState.js";

const STORAGE_KEY = "radio-player:selected-channel-ids";
const ACTIVE_KEY = "radio-player:active-channel-id";

const audio = document.querySelector("#audioPlayer");
const nowTitle = document.querySelector("#nowTitle");
const nowMeta = document.querySelector("#nowMeta");
const statusLine = document.querySelector("#statusLine");
const playlistList = document.querySelector("#playlistList");
const channelList = document.querySelector("#channelList");
const regionSelect = document.querySelector("#regionSelect");
const previousButton = document.querySelector("#previousButton");
const playbackButton = document.querySelector("#playbackButton");
const nextButton = document.querySelector("#nextButton");
const selectAllButton = document.querySelector("#selectAllButton");
const clearAllButton = document.querySelector("#clearAllButton");
const playlistTab = document.querySelector("#playlistTab");
const allTab = document.querySelector("#allTab");
const playlistPane = document.querySelector("#playlistPane");
const allPane = document.querySelector("#allPane");

let selectedIds = normalizeSelection(loadJson(STORAGE_KEY), CHANNELS);
let activeChannelId = localStorage.getItem(ACTIVE_KEY) || "";
let activeTab = "playlist";

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

function saveSelection() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedIds]));
}

function saveActiveChannel() {
  if (activeChannelId) {
    localStorage.setItem(ACTIVE_KEY, activeChannelId);
  } else {
    localStorage.removeItem(ACTIVE_KEY);
  }
}

function getActiveChannel() {
  return CHANNELS.find((channel) => channel.id === activeChannelId);
}

function createStationText(channel) {
  const regionName = getRegionName(channel.regionId);
  const details = [regionName, channel.stn.toUpperCase()];

  if (channel.city) {
    details.push(channel.city);
  }

  return {
    regionName,
    meta: details.join(" · "),
  };
}

function render() {
  const playlist = getPlaylist(CHANNELS, selectedIds);
  const activeChannel = getActiveChannel();

  playlistTab.textContent = `재생 목록 (${playlist.length})`;
  allTab.textContent = `전체 채널 (${CHANNELS.length})`;
  previousButton.disabled = playlist.length === 0;
  nextButton.disabled = playlist.length === 0;
  renderPlaybackButton(playlist);

  renderPlaylist(playlist);
  renderChannelList();
  renderNowPlaying(activeChannel);
}

function renderPlaybackButton(playlist) {
  const state = getPlaybackButtonState({
    hasPlayableChannel: playlist.length > 0,
    isPlaying: !audio.paused,
  });

  playbackButton.textContent = state.label;
  playbackButton.disabled = state.disabled;
  playbackButton.setAttribute("aria-label", state.ariaLabel);
}

function renderPlaylist(playlist) {
  playlistList.textContent = "";

  if (playlist.length === 0) {
    playlistList.append(createEmptyState("전체 채널에서 들을 채널을 체크해 주세요."));
    return;
  }

  const fragment = document.createDocumentFragment();

  playlist.forEach((channel) => {
    const { meta } = createStationText(channel);
    const row = document.createElement("div");
    row.className = "station-row playlist-row";
    row.dataset.channelId = channel.id;

    if (channel.id === activeChannelId) {
      row.classList.add("is-active");
    }

    const playButton = document.createElement("button");
    playButton.type = "button";
    playButton.className = "station-main";
    playButton.innerHTML = `
      <span class="station-copy">
        <span class="station-title"></span>
        <span class="station-meta"></span>
      </span>
    `;
    playButton.querySelector(".station-title").textContent = channel.name;
    playButton.querySelector(".station-meta").textContent = meta;
    playButton.addEventListener("click", () => playChannel(channel.id, true));

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.textContent = "제거";
    removeButton.setAttribute("aria-label", `${channel.name} 제거`);
    removeButton.addEventListener("click", () => removePlaylistChannel(channel.id));

    row.append(playButton, removeButton);
    fragment.append(row);
  });

  playlistList.append(fragment);
}

function renderChannelList() {
  const currentRegionId = regionSelect.value || REGIONS[0].id;
  const channels = CHANNELS.filter((channel) => channel.regionId === currentRegionId);
  const fragment = document.createDocumentFragment();

  channelList.textContent = "";

  channels.forEach((channel) => {
    const { meta } = createStationText(channel);
    const label = document.createElement("label");
    label.className = "check-row";
    label.innerHTML = `
      <input type="checkbox" />
      <span>
        <span class="station-title"></span>
        <span class="station-meta"></span>
      </span>
    `;

    const input = label.querySelector("input");
    input.checked = selectedIds.has(channel.id);
    input.addEventListener("change", () => {
      selectedIds = toggleChannel(selectedIds, channel.id, input.checked);
      saveSelection();
      keepActiveChannelInPlaylist();
      render();
    });

    label.querySelector(".station-title").textContent = channel.name;
    label.querySelector(".station-meta").textContent = meta;
    fragment.append(label);
  });

  channelList.append(fragment);
}

function renderNowPlaying(channel) {
  if (!channel) {
    nowTitle.textContent = "채널을 선택해 주세요";
    nowMeta.textContent = "재생 목록에서 채널을 선택하면 재생됩니다.";
    return;
  }

  const { meta } = createStationText(channel);
  nowTitle.textContent = channel.name;
  nowMeta.textContent = meta;
}

function createEmptyState(message) {
  const element = document.createElement("div");
  element.className = "empty-state";
  element.textContent = message;
  return element;
}

function keepActiveChannelInPlaylist() {
  const playlist = getPlaylist(CHANNELS, selectedIds);

  if (activeChannelId && !playlist.some((channel) => channel.id === activeChannelId)) {
    activeChannelId = "";
    saveActiveChannel();
    updateAudioSource(false);
  }
}

function removePlaylistChannel(channelId) {
  selectedIds = removeChannel(selectedIds, channelId);
  saveSelection();
  keepActiveChannelInPlaylist();
  render();
}

function playChannel(channelId, autoplay) {
  activeChannelId = channelId;
  saveActiveChannel();
  updateAudioSource(autoplay);
  render();
}

function togglePlayback() {
  const playlist = getPlaylist(CHANNELS, selectedIds);

  if (playlist.length === 0) {
    return;
  }

  if (!audio.paused) {
    audio.pause();
    return;
  }

  if (!getActiveChannel()) {
    activeChannelId = playlist[0].id;
    saveActiveChannel();
  }

  updateAudioSource(true);
  render();
}

function updateAudioSource(autoplay, options = {}) {
  const channel = getActiveChannel();

  if (!channel) {
    audio.removeAttribute("src");
    updateMediaSession(null);
    return;
  }

  const streamUrl = buildStreamUrl(channel);

  if (audio.src !== streamUrl) {
    audio.src = streamUrl;
  }

  updateMediaSession(channel);

  if (autoplay) {
    audio.play().then(() => {
      statusLine.textContent = "";
    }).catch((error) => {
      statusLine.textContent = getPlaybackFailureMessage(error, {
        isRestoredStartup: options.isRestoredStartup === true,
      });
      renderPlaybackButton(getPlaylist(CHANNELS, selectedIds));
    });
  }
}

function playRelative(direction) {
  const playlist = getPlaylist(CHANNELS, selectedIds);

  if (playlist.length === 0) {
    return;
  }

  const currentIndex = playlist.findIndex((channel) => channel.id === activeChannelId);
  const nextIndex = direction === "next"
    ? getNextIndex(currentIndex, playlist.length)
    : getPreviousIndex(currentIndex, playlist.length);

  playChannel(playlist[nextIndex].id, true);
}

function updateMediaSession(channel) {
  if (!("mediaSession" in navigator)) {
    return;
  }

  if (!channel) {
    navigator.mediaSession.metadata = null;
    return;
  }

  navigator.mediaSession.metadata = createMediaMetadata({
    title: channel.name,
    artist: getRegionName(channel.regionId),
    album: "Radio",
  });
  navigator.mediaSession.playbackState = audio.paused ? "paused" : "playing";
}

function setupMediaSessionActions() {
  if (!("mediaSession" in navigator)) {
    return;
  }

  registerRadioMediaSessionActions(navigator.mediaSession, {
    previous: () => playRelative("previous"),
    next: () => playRelative("next"),
    play: () => audio.play(),
    pause: () => audio.pause(),
  });
}

function switchTab(tab) {
  activeTab = tab;
  const showPlaylist = activeTab === "playlist";

  playlistTab.classList.toggle("is-active", showPlaylist);
  allTab.classList.toggle("is-active", !showPlaylist);
  playlistTab.setAttribute("aria-selected", String(showPlaylist));
  allTab.setAttribute("aria-selected", String(!showPlaylist));
  playlistPane.hidden = !showPlaylist;
  allPane.hidden = showPlaylist;
  playlistPane.classList.toggle("is-active", showPlaylist);
  allPane.classList.toggle("is-active", !showPlaylist);
}

function setupRegions() {
  REGIONS.forEach((region) => {
    const option = document.createElement("option");
    option.value = region.id;
    option.textContent = region.name;
    regionSelect.append(option);
  });
}

setupRegions();
setupMediaSessionActions();

previousButton.addEventListener("click", () => playRelative("previous"));
playbackButton.addEventListener("click", togglePlayback);
nextButton.addEventListener("click", () => playRelative("next"));
selectAllButton.addEventListener("click", () => {
  selectedIds = setAllSelected(CHANNELS, true);
  saveSelection();
  keepActiveChannelInPlaylist();
  render();
});
clearAllButton.addEventListener("click", () => {
  selectedIds = setAllSelected(CHANNELS, false);
  saveSelection();
  keepActiveChannelInPlaylist();
  render();
});
regionSelect.addEventListener("change", render);
playlistTab.addEventListener("click", () => switchTab("playlist"));
allTab.addEventListener("click", () => switchTab("all"));
audio.addEventListener("play", () => {
  if (getActiveChannel()) {
    updateMediaSession(getActiveChannel());
  }
  renderPlaybackButton(getPlaylist(CHANNELS, selectedIds));
});
audio.addEventListener("pause", () => {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "paused";
  }
  renderPlaybackButton(getPlaylist(CHANNELS, selectedIds));
});
audio.addEventListener("ended", () => playRelative("next"));

keepActiveChannelInPlaylist();
updateAudioSource(shouldAutoplayRestoredChannel(activeChannelId, CHANNELS, selectedIds), {
  isRestoredStartup: true,
});
render();
