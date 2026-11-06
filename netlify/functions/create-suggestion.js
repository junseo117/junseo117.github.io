// POST /api/create-suggestion
// 브라우저가 보낸 노래 추천을 "서버에서 다시 검사"한 뒤 Supabase에 저장한다.
// 서버 전용 코드: Supabase REST를 secret key로 호출한다. (브라우저에 키 노출 안 함)
//
// 보안/검증 책임:
// - secret key 는 RLS 를 우회하므로, 허용값/빈값/길이 검사는 전적으로 이 서버 코드가 책임진다.
// - 클라이언트 검사는 편의일 뿐, 신뢰하지 않고 여기서 다시 검사한다.

const ALLOWED_EMOTIONS = [
  "excited", "happy", "calm", "sad",
  "longing", "energetic", "focus", "angry",
];
const MAX_TITLE = 80;
const MAX_ARTIST = 80;
const MAX_NOTE = 100;

function env() {
  return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SECRET_KEY };
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  // 1) 본문 파싱
  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "invalid_json" });
  }

  // 2) 서버측 입력 검사 (환경설정과 무관하게 먼저 수행 → 잘못된 입력은 즉시 거부)
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const artist = typeof payload.artist === "string" ? payload.artist.trim() : "";
  let emotion = typeof payload.emotion === "string" ? payload.emotion.trim() : "";
  let note = typeof payload.note === "string" ? payload.note.trim() : "";

  if (!title || !artist) {
    return json(400, { error: "missing_required", field: !title ? "title" : "artist" });
  }
  if (title.length > MAX_TITLE || artist.length > MAX_ARTIST) {
    return json(400, { error: "too_long" });
  }
  if (emotion && !ALLOWED_EMOTIONS.includes(emotion)) {
    return json(400, { error: "invalid_emotion" });
  }
  if (note.length > MAX_NOTE) {
    return json(400, { error: "note_too_long" });
  }

  // 3) 입력이 유효하면, 저장을 위해 서버 설정(환경변수) 확인
  const { url, key } = env();
  if (!url || !key) {
    return json(500, { error: "server_not_configured" });
  }

  // 빈 선택값은 null 로 저장
  const row = {
    title,
    artist,
    emotion: emotion || null,
    note: note || null,
  };

  // 3) Supabase REST insert
  const endpoint = `${url.replace(/\/+$/, "")}/rest/v1/song_requests`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      return json(502, { error: "upstream_error" });
    }
    const inserted = await res.json();
    return json(201, { ok: true, item: Array.isArray(inserted) ? inserted[0] : inserted });
  } catch {
    return json(502, { error: "fetch_failed" });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
