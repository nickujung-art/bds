---
phase: "06"
plan: "01"
subsystem: backend-services
tags: [ratelimit, ads-events, anomaly, sgis, gap-label, roi, format]
dependency_graph:
  requires:
    - "06-00 (ad_events.is_anomaly 컬럼, DB 마이그레이션)"
  provides:
    - adClickDailyLimit (Upstash 일별 슬라이딩 윈도우)
    - /api/ads/events conversion 이벤트 + is_anomaly INSERT
    - getAdRoiStats() (캠페인 ROI 집계)
    - AdRoiRow 타입
    - fetchSgisToken / fetchPopulation / fetchHouseholds (SGIS 어댑터)
    - getGapLabelData() (갭 라벨 쿼리)
    - GapLabelData 타입
    - formatGap() (차액 포맷)
  affects:
    - src/lib/ratelimit.ts (adClickDailyLimit 추가)
    - src/app/api/ads/events/route.ts (conversion + anomaly)
    - src/lib/data/ads.ts (getAdRoiStats 추가)
    - src/lib/format.ts (formatGap 추가)
    - src/types/database.ts (ad_events.is_anomaly 컬럼 타입)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN (Vitest mock 기반)
    - molit.ts 패턴 준수 (Zod v4 + AbortSignal.timeout)
    - adClickDailyLimit: Redis 싱글턴 공유 (분당 limit과 동일 인스턴스)
key_files:
  created:
    - src/lib/data/gap-label.ts
    - src/lib/data/gap-label.test.ts
    - src/services/sgis.ts
    - .planning/phases/06-ai-differentiation/deferred-items.md
  modified:
    - src/lib/ratelimit.ts
    - src/app/api/ads/events/route.ts
    - src/app/api/ads/events/route.test.ts
    - src/lib/data/ads.ts
    - src/lib/format.ts
    - src/types/database.ts
decisions:
  - "adClickDailyLimit ip_hash 기준으로 limit (IP 원문 아닌 해시 — PII 비저장)"
  - "database.ts 수동 업데이트 (is_anomaly 컬럼) — npm run db:pull 미실행 환경"
  - "SGIS adm_cd 코드 ASSUMED 상태 — Wave 2 분기 적재 시 stage API로 검증 필요"
metrics:
  duration: "~15분"
  completed_date: "2026-05-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 4
  files_modified: 6
---

# Phase 6 Plan 01: 백엔드 서비스 레이어 Summary

Wave 1 백엔드 서비스 레이어 완료. Upstash 일별 클릭 anomaly 감지, 전환 이벤트 처리, ROI 집계 함수, SGIS API 어댑터, 갭 라벨 쿼리, formatGap 유틸 구현. 전체 229개 테스트 GREEN.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | ratelimit 확장 + AD-01 events route 수정 | ccb363b | ratelimit.ts, route.ts, route.test.ts |
| 2 | ROI 집계 함수 + SGIS 어댑터 + 갭 라벨 쿼리 | e99e4da | ads.ts, sgis.ts, gap-label.ts, gap-label.test.ts, format.ts, database.ts |

## Test Results

| 파일 | 테스트 수 | 결과 |
|------|-----------|------|
| route.test.ts | 8개 | ALL GREEN |
| gap-label.test.ts | 10개 | ALL GREEN |
| 전체 프로젝트 | 229개 | ALL GREEN |

## Artifacts

### src/lib/ratelimit.ts

- `adClickDailyLimit` 추가: `slidingWindow(10, '24 h')`, prefix `danji:ad:daily-click`
- `adEventRatelimit`과 Redis 싱글턴 공유 (메모리 절약)

### src/app/api/ads/events/route.ts

- `ALLOWED_EVENT_TYPES = ['impression', 'click', 'conversion']` — conversion 추가
- click 이벤트에서만 `adClickDailyLimit.limit(ip_hash)` 호출
- 초과 시 `is_anomaly: true`, 미초과 및 impression/conversion은 `is_anomaly: false`

### src/lib/data/ads.ts

- `getAdRoiStats()` 추가: 캠페인 루프 → impression/click/conversion 집계
- `ctr = null` when `clicks === 0` (divide-by-zero 방지)
- `AdRoiRow` 인터페이스 export

### src/services/sgis.ts

- `fetchSgisToken()`: SGIS_CONSUMER_KEY + SGIS_CONSUMER_SECRET 환경변수 필요
- `fetchPopulation(accessToken, adm_cd, year)`: 시군구 인구 조회
- `fetchHouseholds(accessToken, adm_cd, year)`: 시군구 세대 수 조회
- `CHANGWON_GU_CODES` 상수 (창원 5개 구), `GIMHAE_CODE` 상수

### src/lib/data/gap-label.ts

- `getGapLabelData(complexId, supabase)`: listing_prices + transactions 최근 12개월 조회
- `cancel_date IS NULL AND superseded_by IS NULL` 조건 포함 (CLAUDE.md 준수)
- `avgTransactionPricePerPy = price / (area_m2 / 3.3058)` 평균값

### src/lib/format.ts

- `formatGap(gapWan: number)`: 1억 이상 "N억 M만원", 미만 "N만원"

## SGIS adm_cd 코드 검증 상태

| 구 | 코드 | 상태 |
|----|------|------|
| 의창구 | 48121 | ASSUMED |
| 성산구 | 48123 | ASSUMED |
| 마산합포구 | 48125 | ASSUMED |
| 마산회원구 | 48127 | ASSUMED |
| 진해구 | 48129 | ASSUMED |
| 김해시 | 48250 | ASSUMED |

검증 방법: `GET ${BASE}/addr/stage.json?accessToken=...&cd=48&pg_yn=1` — Wave 2 분기 적재 실행 시 확인 필요.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] database.ts ad_events 타입에 is_anomaly 컬럼 미등록**

- **발견 위치:** Task 2 lint 검증 중
- **문제:** Wave 0 마이그레이션으로 `is_anomaly` 컬럼 추가됐지만 `src/types/database.ts`에 미반영
- **원인:** `npm run db:pull` 미실행 (로컬 Supabase 마이그레이션 미적용 환경)
- **수정:** `database.ts`에 `is_anomaly: boolean` 수동 추가 (Row/Insert/Update)
- **영향:** route.ts 및 ads.ts의 TypeScript 컴파일 오류 해소
- **Commit:** e99e4da

### 범위 밖 발견 항목 (deferred-items.md에 기록)

- `match_complex_embeddings` RPC 타입 미등록 → 06-03 플랜에서 처리
- `ad-copy-review/route.test.ts` TypeScript 타입 오류 → 06-02 플랜에서 처리

## Known Stubs

없음. 이 플랜은 순수 백엔드 로직 레이어로 데이터 흐름이 완전히 구현됨.

## Threat Flags

없음. 신규 네트워크 엔드포인트나 신뢰 경계 변경 없음. T-06-01-01~04 위협 모델의 mitigate 항목:
- T-06-01-01: ip_hash 기준 limit — PII 비저장
- T-06-01-02: ALLOWED_EVENT_TYPES 검증 + 400 반환
- T-06-01-04: SGIS_ 환경변수 서버 사이드 전용

## Self-Check: PASSED

- [x] `src/lib/ratelimit.ts` — `adClickDailyLimit` export 확인
- [x] `src/app/api/ads/events/route.ts` — `conversion` 허용 + `is_anomaly` INSERT 확인
- [x] `src/lib/data/ads.ts` — `getAdRoiStats`, `AdRoiRow` export 확인
- [x] `src/services/sgis.ts` — `fetchSgisToken`, `fetchPopulation`, `fetchHouseholds` export 확인
- [x] `src/lib/data/gap-label.ts` — `getGapLabelData`, `GapLabelData` export 확인
- [x] `src/lib/format.ts` — `formatGap` export 확인
- [x] Commit ccb363b — `git log` 확인
- [x] Commit e99e4da — `git log` 확인
- [x] 229개 테스트 ALL GREEN — `npm run test` 확인
