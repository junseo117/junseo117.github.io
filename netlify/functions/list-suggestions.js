// GET /api/list-suggestions
// 노래 추천 목록(최신순)과 전체 건수를 돌려준다.
// 서버 전용 코드: Supabase REST를 secret key로 호출한다. (브라우저에 키 노출 안 함)
//
// 집계 누락 방지:
// - 전체 건수는 Supabase가 Content-Range 헤더로 알려주는 정확한 total 을 사용한다.
//   (목록 조회의 배열 길이로 세지 않는다 → limit 때문에 실제 총계가 누락되는 문제 방지)

const LIST_LIMIT = 50; // 화면에 보여줄 최근 목록 개수(목록만 제한, 총계는 별도)

function env() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  return { url, key };
}

exports.handler = async function () {
  const { url, key } = env();
  if (!url || !key) {
    return json(500, { error: "server_not_configured" });
  }

  const endpoint =
    `${url.replace(/\/+$/, "")}/rest/v1/song_requests` +
    `?select=id,title,artist,emotion,note,created_at` +
    `&order=created_at.desc&limit=${LIST_LIMIT}`;

  try {
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        // count=exact + Range 0개 요청이 아니라, 목록을 받으면서 전체 total 도 함께 받는다.
        Prefer: "count=exact",
        Range: `0-${LIST_LIMIT - 1}`,
      },
    });

    if (!res.ok) {
      return json(502, { error: "upstream_error" });
    }

    const rows = await res.json();

    // Content-Range 예: "0-19/134"  → 슬래시 뒤가 전체 건수
    let total = Array.isArray(rows) ? rows.length : 0;
    const cr = res.headers.get("content-range");
    if (cr && cr.includes("/")) {
      const t = parseInt(cr.split("/")[1], 10);
      if (!Number.isNaN(t)) total = t;
    }

    return json(200, { total, items: rows });
  } catch (e) {
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
