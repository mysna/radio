import { EPG_API_BASE_URL, EPG_REFRESH_INTERVAL_MS } from "./config.js";

const UNKNOWN_ID_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function imageUrl(value, baseUrl = EPG_API_BASE_URL) {
  if (!value) return "";
  return new URL(value, `${baseUrl.replace(/\/$/, "")}/`).href;
}

export function normalizeNowResponse(payload, baseUrl = EPG_API_BASE_URL) {
  const result = new Map();
  (payload?.results || []).forEach((entry) => {
    const current = entry.current;
    result.set(entry.radio_id, current ? {
      ...current,
      programImageUrl: imageUrl(current.program_image_url, baseUrl),
      startsAt: new Date(current.starts_at),
      endsAt: new Date(current.ends_at),
      nextProgram: normalizeProgram(entry.next || entry.next_program || current.next || current.next_program, baseUrl),
    } : null);
  });
  return result;
}

function normalizeProgram(program, baseUrl) {
  if (!program) return null;
  return {
    ...program,
    programImageUrl: imageUrl(program.program_image_url, baseUrl),
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

export function parseUnknownEpgIds(value, now = Date.now()) {
  try {
    const cache = JSON.parse(value);
    if (!Array.isArray(cache.ids) || now - cache.savedAt > UNKNOWN_ID_CACHE_MAX_AGE_MS) return new Set();
    return new Set(cache.ids);
  } catch {
    return new Set();
  }
}

export function serializeUnknownEpgIds(ids, savedAt = Date.now()) {
  return JSON.stringify({ savedAt, ids: [...ids] });
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
        if (entry.status === "not_found") callbacks.onUnknownId?.(entry.radio_id);
      });
      const programs = normalizeNowResponse(payload, baseUrl);
      callbacks.onUpdate?.(programs);
      return programs;
    }
    throw new Error(`EPG request failed: ${response.status}`);
  }
  const responses = await Promise.all(batches.map(fetchBatch));
  return new Map(responses.flatMap((response) => [...response]));
}
