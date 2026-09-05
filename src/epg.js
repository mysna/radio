import { EPG_API_BASE_URL, EPG_REFRESH_INTERVAL_MS } from "./config.js";

// 알려지지 않은 채널을 30초마다 다시 조회하지 않도록 쉬어가는 간격이다. 하루로 두면
// 배포 직후처럼 DB가 잠깐 비어 있던 순간에 전체 채널이 한꺼번에 "모르는 채널"로
// 캐싱된 뒤, 백엔드가 몇 분 만에 복구돼도 다음 날까지 다시 확인하지 않는다.
const UNKNOWN_RECHECK_INTERVAL_MS = 60 * 60 * 1000;

export function normalizeNowResponse(payload) {
  const result = new Map();
  (payload?.results || []).forEach((entry) => {
    const current = entry.current;
    result.set(entry.radio_id, current ? {
      ...current,
      startsAt: new Date(current.starts_at),
      endsAt: new Date(current.ends_at),
      nextProgram: normalizeProgram(entry.next || entry.next_program || current.next || current.next_program),
    } : null);
  });
  return result;
}

function normalizeProgram(program) {
  if (!program) return null;
  return {
    ...program,
    startsAt: new Date(program.starts_at),
    endsAt: new Date(program.ends_at),
  };
}

export function progressAt(program, now = new Date()) {
  if (!program || !(program.startsAt instanceof Date) || !(program.endsAt instanceof Date)) return 0;
  const duration = program.endsAt - program.startsAt;
  return duration > 0 ? Math.min(100, Math.max(0, ((now - program.startsAt) / duration) * 100)) : 0;
}

export function formatProgramTime(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const koreaTime = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  return `${String(koreaTime.getUTCHours()).padStart(2, "0")}:${String(koreaTime.getUTCMinutes()).padStart(2, "0")}`;
}

export function programPositionState(program, now = new Date()) {
  if (!program?.startsAt || !program?.endsAt) return null;
  const duration = (program.endsAt - program.startsAt) / 1000;
  if (!Number.isFinite(duration) || duration <= 0) return null;
  return {
    duration,
    playbackRate: 1,
    position: Math.min(duration, Math.max(0, (now - program.startsAt) / 1000)),
  };
}

export function nextRefreshDelay(program, now = new Date()) {
  if (!program?.endsAt || Number.isNaN(program.endsAt.getTime())) return EPG_REFRESH_INTERVAL_MS;
  return Math.max(1_000, Math.min(EPG_REFRESH_INTERVAL_MS, program.endsAt - now + 250));
}

export function prioritizeRadioIds(radioIds, activeId) {
  const priority = activeId && radioIds.includes(activeId) ? [activeId] : [];
  return {
    priority,
    background: radioIds.filter((id) => id !== activeId),
  };
}

/** 채널별로 "모르는 채널로 표시된 시각"을 담은 Map을 저장값에서 복원한다. */
export function parseUnknownEpgIds(value) {
  try {
    const cache = JSON.parse(value);
    if (!cache || typeof cache.ids !== "object" || cache.ids === null) return new Map();
    return new Map(
      Object.entries(cache.ids).filter(([id, markedAt]) => typeof id === "string" && typeof markedAt === "number"),
    );
  } catch {
    return new Map();
  }
}

export function serializeUnknownEpgIds(unknownIds) {
  return JSON.stringify({ ids: Object.fromEntries(unknownIds) });
}

/** 채널이 재확인 간격 안에 이미 "모르는 채널"로 표시됐는지 판단한다. */
export function isRecentlyUnknown(unknownIds, id, now = Date.now()) {
  const markedAt = unknownIds.get(id);
  return typeof markedAt === "number" && now - markedAt < UNKNOWN_RECHECK_INTERVAL_MS;
}

export async function fetchCurrentPrograms(radioIds, fetcher = fetch, baseUrl = EPG_API_BASE_URL, callbacks = {}) {
  if (!radioIds.length) return new Map();
  const batches = [];
  for (let index = 0; index < radioIds.length; index += 100) {
    batches.push(radioIds.slice(index, index + 100));
  }
  async function fetchBatch(batch) {
    const url = new URL("/v1/now", `${baseUrl.replace(/\/$/, "")}/`);
    url.searchParams.set("radio_ids", batch.join(","));
    const response = await fetcher(url);
    if (response.ok) {
      const payload = await response.json();
      (payload?.results || []).forEach((entry) => {
        if (entry.status === "not_found") {
          callbacks.onUnknownId?.(entry.radio_id);
        } else {
          callbacks.onKnownId?.(entry.radio_id);
        }
      });
      const programs = normalizeNowResponse(payload);
      callbacks.onUpdate?.(programs);
      return programs;
    }
    throw new Error(`EPG request failed: ${response.status}`);
  }
  const responses = await Promise.all(batches.map(fetchBatch));
  return new Map(responses.flatMap((response) => [...response]));
}
