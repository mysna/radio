export function getPlaybackButtonState({ hasPlayableChannel, isPlaying }) {
  if (!hasPlayableChannel) {
    return {
      label: "재생",
      ariaLabel: "재생할 채널이 없습니다",
      disabled: true,
    };
  }

  const label = isPlaying ? "정지" : "재생";

  return {
    label,
    ariaLabel: label,
    disabled: false,
  };
}

export function shouldAutoplayRestoredChannel(activeChannelId, channels, selectedIds) {
  if (!activeChannelId || !selectedIds.has(activeChannelId)) {
    return false;
  }

  return channels.some((channel) => channel.id === activeChannelId);
}

export function getPlaybackFailureMessage() {
  return "재생이 시작되지 않으면 채널을 다시 선택해 주세요.";
}
