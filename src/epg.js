import { EPG_API_BASE_URL, EPG_REFRESH_INTERVAL_MS } from "./config.js";

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
    } : null);
  });
  return result;
}

export function progressAt(program, now = new Date()) {
  if (!program || !(program.startsAt instanceof Date) || !(program.endsAt instanceof Date)) return 0;
  const duration = program.endsAt - program.startsAt;
  return duration > 0 ? Math.min(100, Math.max(0, ((now - program.startsAt) / duration) * 100)) : 0;
}

export function nextRefreshDelay(program, now = new Date()) {
  if (!program?.endsAt || Number.isNaN(program.endsAt.getTime())) return EPG_REFRESH_INTERVAL_MS;
  return Math.max(1_000, Math.min(EPG_REFRESH_INTERVAL_MS, program.endsAt - now + 250));
}

export async function fetchCurrentPrograms(radioIds, fetcher = fetch, baseUrl = EPG_API_BASE_URL) {
  if (!radioIds.length) return new Map();
  const batches = [];
  for (let index = 0; index < radioIds.length; index += 100) {
    batches.push(radioIds.slice(index, index + 100));
  }
  async function fetchBatch(batch) {
    const url = new URL("/v1/now", `${baseUrl.replace(/\/$/, "")}/`);
    url.searchParams.set("radio_ids", batch.join(","));
    const response = await fetcher(url);
    if (response.ok) return normalizeNowResponse(await response.json(), baseUrl);
    // An unknown alias makes the Worker reject the whole batch. Isolate it
    // so supported channels still receive current-program data.
    if (response.status === 404 && batch.length > 1) {
      const midpoint = Math.ceil(batch.length / 2);
      const [left, right] = await Promise.all([
        fetchBatch(batch.slice(0, midpoint)),
        fetchBatch(batch.slice(midpoint)),
      ]);
      return new Map([...left, ...right]);
    }
    if (response.status === 404) return new Map();
    throw new Error(`EPG request failed: ${response.status}`);
  }
  const responses = await Promise.all(batches.map(fetchBatch));
  return new Map(responses.flatMap((response) => [...response]));
}
