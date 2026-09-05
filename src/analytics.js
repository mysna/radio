import {
  ANALYTICS_API_BASE_URL,
  ANALYTICS_LISTEN_HEARTBEAT_INTERVAL_MS,
  ANALYTICS_VISIT_HEARTBEAT_INTERVAL_MS,
} from "./config.js";

const VISITOR_ID_KEY = "radio-player:visitor-id";

// 로그인이 없는 정적 사이트라 재방문을 알아보려면 이 값이 유일한 단서다. 못 읽거나
// 못 쓰는 환경(사생활 보호 모드 등)에서는 매번 새 방문자로 취급한다.
export function getVisitorId(storage = localStorage) {
  try {
    const existing = storage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    storage.setItem(VISITOR_ID_KEY, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
}

function endpoint(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function postJson(baseUrl, path, body, fetcher) {
  try {
    const response = await fetcher(endpoint(baseUrl, path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    // 분석 수집 실패가 재생 자체를 막아서는 안 된다.
    return null;
  }
}

function sendBeaconJson(baseUrl, path, body, sendBeacon) {
  if (typeof sendBeacon !== "function") return false;
  try {
    const blob = new Blob([JSON.stringify(body)], { type: "application/json" });
    return sendBeacon(endpoint(baseUrl, path), blob);
  } catch {
    return false;
  }
}

// getProgram()은 "지금 이 채널에서 재생 중인 프로그램"을 알려주는 콜백이다. 재생 도중
// 프로그램이 바뀔 수 있어서 매 하트비트마다 다시 호출해 그 시점의 값을 실어 보낸다.
function readProgram(getProgram) {
  if (typeof getProgram !== "function") {
    return { program_id: null, program_title: null };
  }
  try {
    const program = getProgram();
    return {
      program_id: program?.programId ?? null,
      program_title: program?.programTitle ?? null,
    };
  } catch {
    return { program_id: null, program_title: null };
  }
}

/**
 * 방문(탭)과 채널 청취 이벤트를 서버로 보내는 세션 하나를 만든다.
 * 모든 외부 의존성(fetch/localStorage/sendBeacon/document)은 테스트에서 대체할 수 있도록
 * 주입받는다.
 */
export function createAnalyticsSession(options = {}) {
  const {
    baseUrl = ANALYTICS_API_BASE_URL,
    fetcher = fetch,
    storage = localStorage,
    sendBeacon = typeof navigator !== "undefined" ? navigator.sendBeacon?.bind(navigator) : undefined,
    documentRef = typeof document !== "undefined" ? document : undefined,
    visitHeartbeatIntervalMs = ANALYTICS_VISIT_HEARTBEAT_INTERVAL_MS,
    listenHeartbeatIntervalMs = ANALYTICS_LISTEN_HEARTBEAT_INTERVAL_MS,
  } = options;

  const visitorId = getVisitorId(storage);
  let visitId = null;
  let visitHeartbeatTimer = null;
  let listenSessionId = null;
  let listenHeartbeatTimer = null;
  let currentGetProgram = null;

  const visitReady = (async () => {
    const result = await postJson(
      baseUrl,
      "/v1/events/visit",
      { visitor_id: visitorId, referrer: documentRef?.referrer || null },
      fetcher,
    );
    visitId = result?.visit_id ?? null;
    if (visitId) {
      // 화면이 꺼지거나 다른 앱으로 전환돼도(document.hidden) 라디오는 계속 재생되는 게
      // 정상적인 사용 방식이라, 탭이 백그라운드라는 이유만으로 하트비트를 건너뛰지 않는다.
      visitHeartbeatTimer = setInterval(() => {
        postJson(baseUrl, "/v1/events/visit/heartbeat", { visit_id: visitId }, fetcher);
      }, visitHeartbeatIntervalMs);
    }
    return visitId;
  })();

  function endVisit() {
    clearInterval(visitHeartbeatTimer);
    visitHeartbeatTimer = null;
    if (!visitId) return;
    sendBeaconJson(baseUrl, "/v1/events/visit/end", { visit_id: visitId }, sendBeacon);
    visitId = null;
  }

  function endListenSession() {
    clearInterval(listenHeartbeatTimer);
    listenHeartbeatTimer = null;
    if (!listenSessionId) return;
    sendBeaconJson(
      baseUrl,
      "/v1/events/listen/end",
      { session_id: listenSessionId, ...readProgram(currentGetProgram) },
      sendBeacon,
    );
    listenSessionId = null;
    currentGetProgram = null;
  }

  async function trackListenStart(channelId, meta = {}) {
    // 채널을 바꾸는 경우 이전 청취 구간을 먼저 닫는다.
    endListenSession();
    if (!channelId) return;

    const { channelName = null, broadcaster = null, regionId = null, getProgram = null } = meta;
    const currentVisitId = await visitReady;
    if (!currentVisitId) return;

    const result = await postJson(
      baseUrl,
      "/v1/events/listen/start",
      {
        visitor_id: visitorId,
        visit_id: currentVisitId,
        channel_id: channelId,
        channel_name: channelName,
        broadcaster,
        region_id: regionId,
        ...readProgram(getProgram),
      },
      fetcher,
    );
    if (!result?.session_id) return;

    listenSessionId = result.session_id;
    currentGetProgram = getProgram;
    listenHeartbeatTimer = setInterval(() => {
      postJson(
        baseUrl,
        "/v1/events/listen/heartbeat",
        { session_id: listenSessionId, ...readProgram(currentGetProgram) },
        fetcher,
      );
    }, listenHeartbeatIntervalMs);
  }

  return { visitorId, trackListenStart, endListenSession, endVisit };
}
