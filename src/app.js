import { CHANNELS, REGIONS, getRegionName } from "./channels.js";
import { createMediaMetadata, registerRadioMediaSessionActions } from "./mediaSession.js";
import {
  buildStreamUrl,
  getNextIndex,
  getPlaylist,
  getPreviousIndex,
  normalizeSelection,
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

  renderPlaylist(playlist);
  renderChannelList();
  renderNowPlaying(activeChannel);
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
    const button = document.createElement("button");
    button.type = "button";
    button.className = "station-row";
    button.dataset.channelId = channel.id;

    if (channel.id === activeChannelId) {
      button.classList.add("is-active");
    }

    button.innerHTML = `
      <span>
        <span class="station-title"></span>
        <span class="station-meta"></span>
      </span>
      <span class="station-badge">재생</span>
    `;
    button.querySelector(".station-title").textContent = channel.name;
    button.querySelector(".station-meta").textContent = meta;
    button.addEventListener("click", () => playChannel(channel.id, true));
    fragment.append(button);
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

function playChannel(channelId, autoplay) {
  activeChannelId = channelId;
  saveActiveChannel();
  updateAudioSource(autoplay);
  render();
}

function updateAudioSource(autoplay) {
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
    }).catch(() => {
      statusLine.textContent = "재생이 시작되지 않으면 채널을 다시 선택해 주세요.";
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
});
audio.addEventListener("pause", () => {
  if ("mediaSession" in navigator) {
    navigator.mediaSession.playbackState = "paused";
  }
});
audio.addEventListener("ended", () => playRelative("next"));

keepActiveChannelInPlaylist();
updateAudioSource(false);
render();
