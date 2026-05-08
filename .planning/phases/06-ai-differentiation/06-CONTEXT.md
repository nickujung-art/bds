# Phase 6: AI·차별화 기술 - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

광고 통계 고도화(AD-01), 광고주 카피 AI 어시스트(AD-02), SGIS 인구·세대 통계 적재(DATA-06), 매물가 갭 라벨 UI(DATA-05 defer 해소), Claude API RAG 단지 상담 봇(DIFF-03), GPS L2+L3 인증(AUTH-01). V2.0 기술 차별화 자산 구축.

DATA-07(재개발 행정 데이터 자동 적재)은 출처 미확보로 이 Phase에서 제외 — Phase 7로 defer.

기존 `transactions` 대원칙(`cancel_date IS NULL AND superseded_by IS NULL`) 유지 필수.

</domain>

<decisions>
## Implementation Decisions

### 광고 통계 고도화 (AD-01)
- **D-01:** "전환" 이벤트 = 광고 클릭 후 연락처 클릭. `ad_events.event_type`에 `'conversion'` 추가. 광고 랜딩 페이지의 전화/문의 버튼 클릭 시 POST `/api/ads/events` 호출.
- **D-02:** ROI 대시보드 = 어드민 전용. `/admin/ads` 페이지에 노출·클릭·전환·ROI 테이블 추가. 광고주 별도 로그인 없음.
- **D-03:** 이상 트래픽 감지 기준 = 동일 IP(ip_hash 기준) 하루 클릭 10회 초과 시 `anomaly` 플래그. Upstash Redis 일별 sliding window 추가. 기존 분당 100회 rate limit와 병행.
- **D-04:** ROI 계산 = `(전환 수 / 클릭 수) × 100` → CTR(%). 광고 집행 비용 기입 어드민 필드 없으면 전환율만 표시.

### SGIS 통계 (DATA-06)
- **D-05:** 수집 단위 = 시군구 (창원시 구 단위 — 의창구·성산구·마산합포구·마산회원구·진해구, 김해시). 창원·김해 서비스 범위에 맞춤.
- **D-06:** 표시 위치 = 단지 상세 페이지 기존 탭 (가성비 차트 옆) 에 '지역 통계' 탭 추가. 단지가 속한 시군구의 인구·세대 수 표시.
- **D-07:** 분기 적재 = GitHub Actions 분기 cron. `src/services/sgis.ts` 어댑터 신규 생성 (기존 molit/kapt 패턴 준수).

### 광고주 AI 어시스트 (AD-02)
- **D-08:** 광고 등록 시 실시간 검토. 어드민 광고 등록/수정 UI에 카피 입력 → Claude API 호출 → 표시광고법 위반 여부 + 개선 제안 반환. 어드민에서만 사용 (광고주 전용 UI 없음).
- **D-09:** Claude API 프롬프트: 카피 텍스트를 입력 받아 (1) 표시광고법 위반 키워드 감지, (2) 과장 표현 지적, (3) 수정 제안 3가지 반환. 응답 포맷: JSON `{ violations: string[], suggestions: string[] }`.
- **D-10:** Claude API 모델: `claude-haiku-4-5-20251001` (저비용 — 광고 카피 검토는 단순 분류 작업). 응답 실패 시 등록 차단하지 않음 — 경고 표시 후 어드민이 직접 판단.

### 갭 라벨 UI (DATA-05 defer 해소)
- **D-11:** 표시 형식 = 차액 라벨. "시세보다 500만원 높음 / 낮음" 형식. `listing_prices` 테이블의 최근 `price_per_py` vs 단지 최근 실거래 평균 `price_per_py` 비교.
- **D-12:** 데이터 없을 때 = 라벨 숨김. `listing_prices` 레코드 없거나 실거래 데이터 없으면 해당 섹션 미표시.
- **D-13:** 표시 위치 = 단지 상세 페이지 가격 섹션 (거래 내역 상단). 단지 상세 ISR 페이지에서 `listing_prices` 최근값 fetch.

### Claude's Discretion
아래 영역은 사용자가 논의하지 않았으므로 Claude가 기존 패턴에 맞게 구현:

- **DIFF-03 RAG 봇 설계:**
  - 벡터 저장소: `pgvector` (Supabase Extension — 추가 인프라 없음). `complexes` 단지 정보 + `transactions` 요약 + `complex_reviews` 내용을 임베딩.
  - 임베딩 모델: Claude API `claude-haiku-4-5-20251001`의 텍스트 임베딩 (또는 `text-embedding-3-small` — 비용 최적).
  - UI 진입점: 단지 상세 페이지 내 "AI 상담" 플로팅 버튼 → 사이드 채팅 패널 (단지 컨텍스트 자동 주입).
  - 환각률 제어: 시스템 프롬프트에 "단지 DB 데이터만 참조, 추측 금지" 명시. 데이터 없으면 "정보 없음" 반환.

- **AUTH-01 GPS L2+L3 인증:**
  - L2 기준: 30일 내 3회 이상 GPS L1 인증 성공 (동일 단지 ±100m). `gps_visits` 테이블 신규 생성 `(user_id, complex_id, verified_at)`.
  - L3 기준: 우편 인증 (등본 주소 우편번호 입력) 또는 관리비 납부 확인. 서류 업로드 → 어드민 수동 승인.
  - 배지 단계: L1 = "방문인증", L2 = "거주인증", L3 = "소유자인증".

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 아키텍처 규칙
- `CLAUDE.md` — 모든 쿼리 대원칙, RLS 필수, createSupabaseAdminClient() 경유, 서비스 어댑터 격리, AI 슬롭 금지
- `.planning/STATE.md` — Vercel Hobby 한도, GitHub Actions cron 패턴, Golden Record 원칙

### 요구사항 및 로드맵
- `.planning/REQUIREMENTS.md` — DIFF-03, DATA-06, AD-01~02, AUTH-01 전체 요건 정의
- `.planning/ROADMAP.md` §Phase 6 — 목표, 성공 기준 4개

### DB 스키마 (기존)
- `supabase/migrations/20260430000007_ads.sql` — `ad_events` 스키마 (`event_type` CHECK constraint — 'conversion' 추가 필요), `ad_campaigns` 스키마
- `supabase/migrations/20260430000016_reviews.sql` — `complex_reviews.gps_verified` boolean
- `supabase/migrations/20260507000005_phase5_listing_prices.sql` — `listing_prices` 스키마 (갭 라벨 UI 데이터 소스)

### 기존 코드 패턴
- `src/app/api/ads/events/route.ts` — 광고 이벤트 기록 패턴 (전환 이벤트 추가 대상)
- `src/lib/ratelimit.ts` — Upstash Redis rate limit 패턴 (이상 트래픽 감지 확장 대상)
- `src/services/molit.ts` — 서비스 어댑터 패턴 (SGIS 어댑터 생성 시 참조)
- `src/services/kapt.ts` — 서비스 어댑터 패턴 (SGIS 어댑터 생성 시 참조)
- `src/components/complex/TransactionChart.tsx` — Recharts 단지 상세 차트 패턴
- `src/app/complexes/[id]/page.tsx` — 단지 상세 페이지 구조 (갭 라벨·통계 탭·RAG 봇 진입점 삽입 위치)
- `.github/workflows/db-backup.yml` — GitHub Actions cron 패턴 (SGIS 분기 적재 참조)

### Phase 5 CONTEXT (선행 결정)
- `.planning/phases/05-data-expansion-ops/05-CONTEXT.md` — D-08: 갭 라벨 UI Phase 6 defer 결정

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ad_events` 테이블 + `/api/ads/events` route: `event_type` CHECK 수정으로 `'conversion'` 추가 가능.
- Upstash Redis (`src/lib/ratelimit.ts`): 일별 sliding window 추가로 이상 트래픽 감지 확장 가능.
- `listing_prices` 테이블 (Phase 5 완성): 갭 라벨 UI 즉시 구현 가능.
- `complex_reviews.gps_verified` boolean + ReviewList.tsx 배지 UI: L2/L3 배지 단계 확장 기반.
- `src/services/molit.ts`, `src/services/kapt.ts`: SGIS 어댑터 생성 시 동일 패턴 적용.
- GitHub Actions cron 패턴: SGIS 분기 적재 워크플로우 바로 적용 가능.

### Established Patterns
- **Admin 패턴**: `createSupabaseAdminClient()` + `requireAdmin()` guard
- **ISR 패턴**: `createReadonlyClient()` + `export const revalidate = N` — 단지 상세 이미 적용
- **Server Action 패턴**: `'use server'` + zod 검증 + admin guard
- **서비스 어댑터 패턴**: `src/services/` — 외부 API는 반드시 이 위치에서만 호출

### Integration Points
- 갭 라벨 → `listing_prices.price_per_py` (최근값) vs `transactions` 평균 `price_per_py` (단지·최근 12개월)
- RAG 봇 → `complexes` + `transactions` + `complex_reviews` 임베딩 → pgvector 검색 → Claude API
- SGIS 통계 → 신규 `district_stats` 테이블 → 단지 상세 시군구 기준 조회
- 광고 전환 → `ad_events` `'conversion'` 이벤트 → `/admin/ads` ROI 집계 쿼리
- AD-02 AI → Claude API `claude-haiku-4-5-20251001` → 어드민 광고 등록 UI 실시간 응답
- GPS L2 → `gps_visits` 신규 테이블 → 30일 내 3회 인증 집계

</code_context>

<specifics>
## Specific Ideas

- 전환 이벤트 라벨: "시세보다 500만원 높음 / 낮음" — 정확한 표현 확정
- 이상 트래픽 임계치: IP 기준 하루 클릭 10회 초과
- AD-02 Claude 모델: `claude-haiku-4-5-20251001` (저비용)
- GPS 배지 단계: L1 = "방문인증", L2 = "거주인증", L3 = "소유자인증"
- SGIS 단위: 시군구 (창원시 5개 구 + 김해시)

</specifics>

<deferred>
## Deferred Ideas

- **DATA-07**: 재개발 행정 데이터 자동 적재 → Phase 7 (출처 미확보)
- **RAG 봇 별도 /chat 페이지** → 단지 상세 사이드 패널로 구현 (전체 페이지 필요 없음)
- **광고주 별도 로그인/대시보드** → 어드민 전용으로 결정. 광고주 셀프서비스 대시보드는 추후 수요 확인 후 고려
- **SGIS 읍면동 단위** → 시군구로 충분. 세밀도 필요 시 Phase 7 이후

</deferred>

---

*Phase: 6-AI차별화기술*
*Context gathered: 2026-05-08*
