// Netlify 서버리스 함수 (서버 전용 코드) — public/ 에 복사하지 않는다.
//
// 참고: 현재 MVP에서 노래 추천 저장/조회는 브라우저에서 Supabase anon key로
// 직접 호출하므로 이 함수는 "필수"가 아니다. 함수 폴더 구조를 갖추기 위한
// 최소 헬스체크이며, 향후 서버측 검증(스팸 차단 등, service_role 사용)을
// 넣을 자리로 둔다. service_role 등 비밀 키는 Netlify 환경변수로만 주입하고
// 절대 클라이언트/공개 폴더에 두지 않는다.

export async function handler() {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ok: true, service: "my-playlist-room", ts: Date.now() }),
  };
}
