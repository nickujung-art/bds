---
phase: 06-ai-differentiation
verified: 2026-05-08T12:00:00Z
status: human_needed
score: 19/20 must-haves verified
overrides_applied: 0
human_verification:
  - test: "단지 상담 봇 환각률 평가 (human eval 100건)"
    expected: "단지 DB 기반으로만 답변하고 환각률 ≤ 5%"
    why_human: "ROADMAP Success Criteria 1번: 'human eval 100건 기준 환각률 ≤ 5%' — 자동화 불가, 실제 운영 데이터로 테스트 필요"
  - test: "SGIS 지역통계 분기 자동 적재 확인"
    expected: "GitHub Actions sgis-stats.yml이 분기 cron으로 실행되어 district_stats에 데이터가 저장됨"
    why_human: "ROADMAP Success Criteria 2번: 마이그레이션 미적용 환경에서 실제 SGIS API 호출 불가. adm_cd ASSUMED 상태 — 첫 실행 전 stage API 검증 필요"
  - test: "광고주 대시보드 전환율·ROI 확인"
    expected: "/admin/ads 페이지에서 AdRoiTable이 실제 데이터를 표시함"
    why_human: "ROADMAP Success Criteria 3번: 실제 광고 캠페인 + 이벤트 데이터가 있어야 ROI 테이블 가시성 확인 가능"
  - test: "GPS L2 인증 배지 표시 확인"
    expected: "30일 내 3회 이상 방문한 사용자 후기에 '거주인증' pos 배지가 표시됨"
    why_human: "ROADMAP Success Criteria 4번: 실제 GPS 방문 기록(gps_visits)이 있어야 배지 승급 검증 가능"
  - test: "E2E 테스트 로컬 실행 검증"
    expected: "e2e/phase6.spec.ts와 e2e/gap-label.spec.ts가 SKIP_IN_CI=false 환경에서 통과"
    why_human: "E2E 테스트는 로컬 Supabase + 데이터 필요. CI 환경에서 SKIP_IN_CI=true로 자동 스킵됨"
---

# Phase 6: AI·차별화 기술 검증 보고서

**Phase 목표:** Claude API RAG 봇 + SGIS 통계 + 광고 고도화 + GPS L2/L3 인증. 기술 차별화 자산 구축.
**검증 일시:** 2026-05-08T12:00:00Z
**상태:** human_needed
**재검증 여부:** No — 초기 검증

---

## 목표 달성 현황

### 관찰 가능한 True 항목

| # | Truth | 상태 | 근거 |
|---|-------|------|------|
| 1 | 4개 Phase 6 마이그레이션 파일이 존재한다 | ✓ VERIFIED | 20260508000001~4 파일 4개 확인 |
| 2 | pgvector extension이 활성화되고 complex_embeddings 테이블이 1024차원 벡터 컬럼을 가진다 | ✓ VERIFIED | `extensions.vector(1024)` + `vector_cosine_ops` HNSW 인덱스 확인 |
| 3 | @anthropic-ai/sdk 패키지가 package.json에 추가된다 | ✓ VERIFIED | `"@anthropic-ai/sdk": "^0.95.1"` 확인 |
| 4 | gps_visits, gps_verification_requests, profiles.gps_badge_level이 마이그레이션에 존재한다 | ✓ VERIFIED | 20260508000004_gps_auth.sql에서 확인 |
| 5 | district_stats 테이블이 si+gu 인덱스와 RLS 정책을 갖는다 | ✓ VERIFIED | `district_stats_si_gu_idx` + 2개 RLS 정책 확인 |
| 6 | 광고 이벤트 API가 'conversion' event_type을 수락한다 | ✓ VERIFIED | `ALLOWED_EVENT_TYPES = ['impression', 'click', 'conversion']` |
| 7 | click 이벤트가 IP별 하루 10회 초과 시 is_anomaly=true로 기록된다 | ✓ VERIFIED | `adClickDailyLimit` + `is_anomaly = true` 분기 로직 확인 |
| 8 | ROI 집계 쿼리가 impressions/clicks/conversions/ctr/anomaly를 반환한다 | ✓ VERIFIED | `getAdRoiStats()` 함수가 `AdRoiRow` 인터페이스 구현 |
| 9 | SGIS 서비스 어댑터가 토큰 발급·인구·세대 세 함수를 export한다 | ✓ VERIFIED | `fetchSgisToken`, `fetchPopulation`, `fetchHouseholds` 확인 |
| 10 | 갭 라벨 쿼리가 price_per_py를 (price / (area_m2 / 3.3058))로 계산한다 | ✓ VERIFIED | `gap-label.ts` line 52: `const py = Number(r.area_m2) / 3.3058` |
| 11 | POST /api/chat/complex가 SSE 스트리밍 응답을 반환한다 | ✓ VERIFIED | Voyage AI → pgvector RPC → Claude 스트리밍 파이프라인 구현, `Content-Type: text/event-stream` |
| 12 | POST /api/admin/ad-copy-review가 관리자만 접근 가능하고 { violations, suggestions } JSON을 반환한다 | ✓ VERIFIED | admin role 2단계 guard + Claude haiku-4-5 응답 구조 확인 |
| 13 | Claude API 실패 시 광고 등록이 차단되지 않고 error:true 플래그를 반환한다 | ✓ VERIFIED | `catch (err)` → `{ violations: [], suggestions: [], error: true }` status 200 |
| 14 | embed-complexes.ts 스크립트가 complexes + transactions + reviews를 청크로 임베딩한다 | ✓ VERIFIED | `summary`, `transactions`, `reviews` 3-chunk, `voyage-4-lite` 임베딩 |
| 15 | ingest-sgis.ts 스크립트가 6개 지역을 순회하며 district_stats에 upsert한다 | ✓ VERIFIED | `DISTRICTS` 6개 지역 루프 + `supabase.from('district_stats').upsert()` |
| 16 | GitHub Actions sgis-stats.yml이 분기 cron으로 실행된다 | ✓ VERIFIED | `cron: '0 3 15 1,4,7,10 *'` 확인 |
| 17 | 단지 상세 페이지에 갭 라벨, 지역통계 탭, AI 상담 패널이 표시된다 | ✓ VERIFIED | `GapLabel`, `AnalysisSection`, `AiChatPanel` page.tsx에 연결 확인 |
| 18 | /admin/ads 페이지에서 ROI 테이블이 표시된다 | ✓ VERIFIED | `AdRoiTable` 컴포넌트가 admin/ads/page.tsx에 wired |
| 19 | GPS L1 30일 3회 이상 방문 시 profiles.gps_badge_level이 2로 업그레이드된다 | ✓ VERIFIED | `recordGpsVisitAndCheckL2` — `count >= 3` → `gps_badge_level: 2` update |
| 20 | 단지 상담 봇 환각률이 human eval 100건 기준 ≤ 5%이다 | ? UNCERTAIN | 코드 구현은 완료됨. 시스템 프롬프트로 "단지 데이터만 참조" 고정, 추측 금지. 그러나 실제 환각률은 human eval 없이 측정 불가 |

**점수: 19/20** (1개 UNCERTAIN — human eval 필요)

---

## 필수 아티팩트

| 아티팩트 | 설명 | 상태 | 세부 사항 |
|---------|------|------|----------|
| `supabase/migrations/20260508000001_district_stats.sql` | district_stats 테이블 + RLS + 인덱스 | ✓ VERIFIED | `district_stats_si_gu_idx` 포함 |
| `supabase/migrations/20260508000002_ad_events_conversion.sql` | ad_events에 conversion 이벤트 + is_anomaly 컬럼 | ✓ VERIFIED | `is_anomaly boolean` 컬럼 확인 |
| `supabase/migrations/20260508000003_pgvector.sql` | complex_embeddings + match_complex_embeddings RPC | ✓ VERIFIED | `vector(1024)`, `vector_cosine_ops` HNSW |
| `supabase/migrations/20260508000004_gps_auth.sql` | gps_visits + gps_verification_requests + gps_badge_level | ✓ VERIFIED | `gps_badge_level` 컬럼 포함 |
| `src/lib/ratelimit.ts` | adClickDailyLimit (Upstash 일별 sliding window) | ✓ VERIFIED | `slidingWindow(10, '24 h')` |
| `src/app/api/ads/events/route.ts` | 전환 이벤트 처리 + anomaly 감지 | ✓ VERIFIED | conversion 허용 + is_anomaly 필드 |
| `src/lib/data/ads.ts` | getAdRoiStats() 함수 | ✓ VERIFIED | `AdRoiRow` 인터페이스 export |
| `src/services/sgis.ts` | SGIS API 어댑터 | ✓ VERIFIED | 3개 함수 export |
| `src/lib/data/gap-label.ts` | getGapLabelData() 쿼리 함수 | ✓ VERIFIED | `GapLabelData` 타입 export |
| `src/lib/format.ts` | formatPrice(), formatGap() 공유 유틸 | ✓ VERIFIED | 두 함수 export 확인 |
| `src/app/api/chat/complex/route.ts` | RAG 채팅 스트리밍 API | ✓ VERIFIED | `voyage-4-lite` 포함 |
| `src/app/api/admin/ad-copy-review/route.ts` | 광고 카피 AI 검토 API (관리자 전용) | ✓ VERIFIED | `claude-haiku-4-5-20251001` 포함 |
| `scripts/embed-complexes.ts` | 단지 임베딩 배치 스크립트 | ✓ VERIFIED | `voyage-4-lite` 포함 |
| `scripts/ingest-sgis.ts` | SGIS 통계 적재 배치 스크립트 | ✓ VERIFIED | `district_stats` upsert |
| `.github/workflows/sgis-stats.yml` | 분기 SGIS 적재 GitHub Actions | ✓ VERIFIED | `0 3 15 1,4,7,10` cron |
| `src/components/complex/GapLabel.tsx` | 갭 라벨 배지 컴포넌트 | ✓ VERIFIED | `badge neg/pos` 클래스 |
| `src/components/complex/DistrictStatsCard.tsx` | 지역 통계 카드 컴포넌트 | ✓ VERIFIED | `district-stats` aria + role="region" |
| `src/components/complex/AiChatPanel.tsx` | AI 상담 플로팅 버튼 + 슬라이드 패널 | ✓ VERIFIED | `position: fixed`, role="dialog" |
| `src/components/admin/AdRoiTable.tsx` | 광고 ROI 집계 테이블 | ✓ VERIFIED | `AdRoiRow` import |
| `src/components/admin/AdCopyReviewer.tsx` | 광고 카피 AI 검토 컴포넌트 | ✓ VERIFIED | "AI 검토" 버튼 포함 |
| `src/lib/auth/gps-badge.ts` | GPS L1/L2 방문 기록 + L2 배지 업그레이드 Server Action | ✓ VERIFIED | `recordGpsVisitAndCheckL2` export |
| `src/components/reviews/GpsBadge.tsx` | 인증 배지 컴포넌트 (L1/L2/L3) | ✓ VERIFIED | neutral/pos/orange 배지 매핑 |
| `src/app/admin/gps-requests/page.tsx` | L3 승인 검토 어드민 페이지 | ✓ VERIFIED | `gps_verification_requests` pending 조회 |
| `src/app/api/admin/gps-approve/route.ts` | L3 승인/거절 API | ✓ VERIFIED | `gps_badge_level: 3` 업데이트 |
| `e2e/phase6.spec.ts` | Phase 6 통합 E2E 테스트 | ✓ VERIFIED | "AI 상담" 버튼/패널 테스트 포함 |
| `e2e/gap-label.spec.ts` | 갭 라벨 E2E 테스트 | ✓ VERIFIED | `SKIP_IN_CI` 패턴 적용 |

---

## Key Link 검증

| From | To | Via | 상태 | 세부 사항 |
|------|-----|------|------|----------|
| `complex_embeddings.embedding` | `match_complex_embeddings RPC` | `extensions.vector(1024) <=> operator` | ✓ WIRED | `vector_cosine_ops` HNSW 인덱스 확인 |
| `ad_events.is_anomaly` | AD-01 anomaly detection | `route.ts boolean flag` | ✓ WIRED | events route에서 `is_anomaly: true/false` INSERT 확인 |
| `src/lib/ratelimit.ts` | `src/app/api/ads/events/route.ts` | `adClickDailyLimit import` | ✓ WIRED | route.ts line 4: `import { adEventRatelimit, adClickDailyLimit }` |
| `src/lib/data/ads.ts` | `ad_campaigns + ad_events` | `createSupabaseAdminClient()` | ✓ WIRED | `getAdRoiStats` 함수 내 DB 쿼리 확인 |
| `src/app/api/chat/complex/route.ts` | `match_complex_embeddings RPC` | `createSupabaseAdminClient().rpc()` | ✓ WIRED | `.rpc('match_complex_embeddings', ...)` 확인 |
| `scripts/embed-complexes.ts` | `complex_embeddings` 테이블 | `Voyage AI → pgvector upsert` | ✓ WIRED | `supabase.from('complex_embeddings').upsert()` 확인 |
| `src/app/complexes/[id]/page.tsx` | `src/components/complex/GapLabel.tsx` | `getGapLabelData() 결과를 prop으로 전달` | ✓ WIRED | page.tsx line 370: `<GapLabel gap={gap} />` |
| `src/app/complexes/[id]/page.tsx` | `src/components/complex/DistrictStatsCard.tsx` | `district_stats 조회 결과를 AnalysisSection으로 전달` | ✓ WIRED | AnalysisSection → DistrictStatsCard 연결 확인 |
| `src/components/complex/AiChatPanel.tsx` | `/api/chat/complex` | `fetch POST with complexId + messages` | ✓ WIRED | AiChatPanel line 123: `fetch('/api/chat/complex', ...)` |
| `src/app/admin/ads/page.tsx` | `src/components/admin/AdRoiTable.tsx` | `getAdRoiStats(adminClient) 결과를 prop으로 전달` | ✓ WIRED | page.tsx line 103: `<AdRoiTable rows={roiStats} />` |
| `src/lib/auth/gps-badge.ts` | `gps_visits 테이블` | `createSupabaseAdminClient().from('gps_visits').insert()` | ✓ WIRED | `recordGpsVisitAndCheckL2` 내 INSERT 확인 |
| `src/app/api/admin/gps-approve/route.ts` | `profiles.gps_badge_level` | `adminClient.from('profiles').update({ gps_badge_level: 3 })` | ✓ WIRED | route.ts line 68: `.update({ gps_badge_level: 3 })` |

---

## 데이터 흐름 추적 (Level 4)

| 아티팩트 | 데이터 변수 | 소스 | 실제 데이터 생성 | 상태 |
|---------|------------|------|-----------------|------|
| `GapLabel.tsx` | `gap` prop | `getGapLabelData()` → `listing_prices` + `transactions` DB 쿼리 | `cancel_date IS NULL AND superseded_by IS NULL` 조건 포함 실쿼리 | ✓ FLOWING |
| `DistrictStatsCard.tsx` | `population`, `households` props | `district_stats` DB 쿼리 (page.tsx async IIFE) | 실 DB 쿼리, 데이터 없으면 null → "아직 수집 안됨" 표시 | ✓ FLOWING |
| `AiChatPanel.tsx` | `messages` state | `/api/chat/complex` SSE 스트리밍 | Voyage AI + pgvector + Claude haiku 실 파이프라인 | ✓ FLOWING |
| `AdRoiTable.tsx` | `rows` prop | `getAdRoiStats(adminClient)` | `ad_campaigns` + `ad_events` 실 DB 쿼리 | ✓ FLOWING |

---

## 행동 스팟 체크 (Step 7b)

데이터베이스 마이그레이션 미적용 환경(06-00 checkpoint 대기 상태)으로 런타임 실행 불가.

**SKIPPED** — 06-00 Wave 0는 autonomous: false (사용자 직접 실행 필요). `npm run db:push` 적용 전까지 런타임 API 실행 불가.

---

## 요구사항 커버리지

| 요구사항 | 소스 플랜 | 설명 | 상태 | 근거 |
|---------|----------|------|------|------|
| DIFF-03 | 06-02, 06-03 | Claude API + RAG 단지 상담 봇 | ✓ SATISFIED | `route.ts` RAG 파이프라인 + `AiChatPanel.tsx` UI + `embed-complexes.ts` 배치 |
| DATA-06 | 06-01, 06-02, 06-03 | SGIS 인구·세대 통계 분기 적재 | ✓ SATISFIED | `sgis.ts` 어댑터 + `ingest-sgis.ts` + `sgis-stats.yml` + `DistrictStatsCard.tsx` |
| DATA-07 | — | 재개발 행정 데이터 자동 적재 | ✓ DEFERRED | ROADMAP에 "Phase 7로 defer" 명시 |
| AD-01 | 06-01, 06-03 | 광고 통계 고도화 (전환·ROI·이상 트래픽) | ✓ SATISFIED | `conversion` 이벤트 + `is_anomaly` + `getAdRoiStats()` + `AdRoiTable.tsx` |
| AD-02 | 06-02, 06-03 | 광고주 카피 AI 어시스트 + 표시광고법 감지 | ✓ SATISFIED | `ad-copy-review/route.ts` + `AdCopyReviewer.tsx` |
| AUTH-01 | 06-04 | GPS L2+L3 인증 | ✓ SATISFIED | `gps-badge.ts` + `GpsBadge.tsx` + admin 검토 UI + gps-approve API |

---

## 발견된 안티패턴

| 파일 | 줄 | 패턴 | 심각도 | 영향 |
|------|---|------|--------|------|
| `src/lib/auth/gps-badge.ts` | ~160 | 위치 검증을 PostGIS ST_DWithin 대신 위도/경도 수치 차이로 구현 | ⚠️ Warning | 100m 근사치 계산 (0.0009°≈100m) — 경도는 위도에 따라 오차 가능. 프로덕션 PostGIS 적용 후 교체 권장 |
| `scripts/ingest-sgis.ts` | ~20 | `adm_cd` 코드 ASSUMED (48121 등) | ⚠️ Warning | 첫 실행 전 SGIS stage API로 검증 필요. 코드 및 SUMMARY에 명시됨 |

---

## 인간 검증 필요 항목

### 1. 단지 상담 봇 환각률 평가

**테스트:** 단지 데이터가 있는 실제 단지에서 100건 질문을 입력하고 답변을 평가한다  
**예상:** 환각률(단지 데이터에 없는 내용을 사실인 것처럼 답변하는 비율) ≤ 5%  
**이유:** 코드 레벨에서 시스템 프롬프트로 "단지 데이터만 참조, 추측 금지" 구현했으나, LLM 환각은 코드 스캔으로 측정 불가

### 2. SGIS 지역통계 분기 자동 적재 확인

**테스트:** `npx tsx scripts/ingest-sgis.ts` 실행 후 SGIS adm_cd 코드 검증 (SGIS stage API), district_stats 테이블 데이터 확인  
**예상:** 창원 5개 구 + 김해시 6개 지역의 인구/세대 데이터가 district_stats에 저장됨  
**이유:** 마이그레이션 미적용 환경 + adm_cd ASSUMED 상태. 첫 실행 전 코드 검증 및 실 API 호출 필요

### 3. 광고주 대시보드 전환율·ROI 확인

**테스트:** 실제 광고 캠페인 + impression/click/conversion 이벤트가 있는 상태에서 /admin/ads 접속  
**예상:** AdRoiTable에 캠페인별 impressions/clicks/conversions/ctr/anomaly가 표시됨  
**이유:** 빈 데이터(캠페인 없음)에서는 AdRoiTable이 null 반환(rows.length === 0)

### 4. GPS L2 인증 배지 표시 확인

**테스트:** 테스트 계정으로 동일 단지를 30일 내 3회 GPS 방문 인증 후 후기 작성  
**예상:** 후기에 '거주인증' (badge.pos) 배지가 표시됨  
**이유:** gps_visits 실제 INSERT + gps_badge_level 업그레이드 로직은 구현됨, 그러나 실제 GPS 좌표와 단지 위치 100m 이내 검증은 데이터 필요

### 5. E2E 테스트 로컬 실행 검증

**테스트:** 로컬 Supabase 실행 환경에서 `npx playwright test e2e/phase6.spec.ts e2e/gap-label.spec.ts` 실행  
**예상:** AI 상담 버튼 표시/패널 열기/Escape 닫기/갭 라벨 조건부 표시 테스트 통과  
**이유:** `SKIP_IN_CI=true` 패턴으로 CI에서 자동 스킵됨. 로컬 데이터가 있어야 확인 가능

---

## 갭 요약

자동화 검증에서 발견된 **블로커 갭 없음**. 19/20 must-have가 VERIFIED.

1개 UNCERTAIN 항목(환각률 ≤ 5% — ROADMAP Success Criteria 1번)은 코드 구현은 완료됐으나 human eval이 반드시 필요한 품질 기준이다. 이 항목을 포함한 5개 항목이 인간 검증을 요구하여 `human_needed` 상태로 결정됐다.

**중요 선행 조건 (runtime 동작에 필수):**
- `npm run db:push` — 06-00 Wave 0 checkpoint (autonomous: false, 사용자 직접 실행)
- `npm install @anthropic-ai/sdk` 완료 여부 및 `.env.local`에 `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY`, `SGIS_CONSUMER_KEY/SECRET` 설정
- `npx tsx scripts/embed-complexes.ts` — 초기 임베딩 실행 (RAG 봇 동작에 필요)
- SGIS adm_cd 코드 검증: `GET ${BASE}/addr/stage.json?accessToken=...&cd=48&pg_yn=1`

---

_검증 일시: 2026-05-08T12:00:00Z_  
_검증자: Claude (gsd-verifier)_
