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

export function getPlaybackFailureMessage(error, { isRestoredStartup }) {
  if (isRestoredStartup && error?.name === "NotAllowedError") {
    return "브라우저 자동재생 제한으로 멈춰 있습니다. 재생을 눌러 마지막 채널을 이어 들으세요.";
  }

  return "재생이 시작되지 않으면 채널을 다시 선택해 주세요.";
}
