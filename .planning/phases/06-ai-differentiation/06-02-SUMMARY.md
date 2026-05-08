---
phase: "06"
plan: "02"
subsystem: ai-backend
tags: [rag, claude-api, voyage-ai, pgvector, sgis, github-actions, tdd]
dependency_graph:
  requires:
    - "06-00 (pgvector migration, complex_embeddings 테이블, district_stats 테이블)"
    - "06-01 (src/services/sgis.ts — ingest-sgis.ts의 import 대상)"
  provides:
    - "POST /api/chat/complex (RAG SSE 스트리밍 채팅 API)"
    - "POST /api/admin/ad-copy-review (관리자 전용 광고 카피 AI 검토 API)"
    - "scripts/embed-complexes.ts (단지 임베딩 배치 스크립트)"
    - "scripts/ingest-sgis.ts (SGIS 분기 통계 적재 스크립트)"
    - ".github/workflows/sgis-stats.yml (분기 SGIS 적재 GitHub Actions)"
  affects:
    - "src/app/api/chat/complex/route.ts (신규 RAG 채팅 엔드포인트)"
    - "src/app/api/admin/ad-copy-review/route.ts (신규 관리자 전용 엔드포인트)"
tech_stack:
  added:
    - "@anthropic-ai/sdk 0.95.1 (Wave 0에서 설치됨, 이 플랜에서 적극 사용)"
    - "Voyage AI HTTP API (voyage-4-lite, 1024dim) — 쿼리 임베딩"
  patterns:
    - "Anthropic SDK messages.stream() + toReadableStream() → SSE 반환"
    - "Voyage AI fetch 직접 호출 (voyageai npm 패키지 대신)"
    - "pgvector RPC unknown cast (DB 타입 재생성 전 임시)"
    - "관리자 auth guard: auth.getUser() + profiles.role 2단계 검증"
    - "Claude API 실패 허용 패턴: error:true + status 200 (등록 차단 안 함)"
key_files:
  created:
    - src/app/api/chat/complex/route.ts
    - src/app/api/chat/complex/route.test.ts
    - src/app/api/admin/ad-copy-review/route.ts
    - src/app/api/admin/ad-copy-review/route.test.ts
    - scripts/embed-complexes.ts
    - scripts/ingest-sgis.ts
    - .github/workflows/sgis-stats.yml
  modified: []
decisions:
  - "pgvector RPC unknown cast 사용 — DB 타입 재생성 전 임시 조치. 마이그레이션 적용 + supabase gen types 후 제거 가능"
  - "ingest-sgis.ts에서 상대 경로 import (../src/services/sgis) — tsx에서 tsconfig paths 인식 보장"
  - "SGIS adm_cd 코드 ASSUMED (48121 등) — 첫 실행 전 stage API 검증 필수"
  - "Claude API 실패 시 error:true + 200 반환 — 광고 등록 차단 안 함 (D-10)"
metrics:
  duration: "~20분"
  completed_date: "2026-05-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 0
---

# Phase 6 Plan 02: RAG 백엔드 + AD-02 카피 검토 + 배치 스크립트 Summary

Voyage AI voyage-4-lite 임베딩 + pgvector RPC + Claude haiku 스트리밍 파이프라인으로 RAG 채팅 API 구현. 관리자 전용 광고 카피 표시광고법 검토 API (Claude API 실패 시 등록 차단 안 함). SGIS 분기 통계 적재 배치 스크립트 + GitHub Actions 분기 cron 설정.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | RAG 채팅 API + AD-02 카피 검토 API (TDD) | e90de36 | route.ts × 2, route.test.ts × 2 |
| 2 | 임베딩 스크립트 + SGIS 적재 스크립트 + GitHub Actions | 98a6def | scripts × 2, workflow × 1, route.ts 수정 |

## TDD Gate Compliance

- RED: route 파일 미존재로 2개 테스트 파일 모두 FAIL 확인
- GREEN: route 구현 후 22개 테스트 모두 PASS 확인
- RED→GREEN 게이트 준수됨

## API Implementations

### POST /api/chat/complex (RAG 채팅)

```
complexId + messages → Voyage AI voyage-4-lite 임베딩 → match_complex_embeddings RPC → Claude haiku 스트리밍
```

- 인증 불필요 (단지 정보 공개)
- SSE Content-Type: text/event-stream
- 시스템 프롬프트: "단지 데이터만 참조, 추측 금지" (T-06-02-01 prompt injection 방어)
- Voyage API timeout: AbortSignal.timeout(8_000)

### POST /api/admin/ad-copy-review (광고 카피 AI 검토)

```
관리자 auth guard → copy 검증 (500자 제한) → Claude haiku → { violations, suggestions }
```

- 비인증: 401, 비관리자: 403, copy 없음/초과: 400
- Claude API 실패 시: error:true + 200 (광고 등록 차단 안 함, D-10)
- 마크다운 코드블록 제거 후 JSON 파싱 시도

## Batch Scripts

### scripts/embed-complexes.ts

- `complexes.status = 'active'` 단지만 처리
- 단지별 3개 chunk: summary, transactions (24개월), reviews (20건)
- Voyage AI `voyage-4-lite` document 임베딩
- 20단지 배치 처리, 배치 간 1초 대기 (rate limit 방어)
- `complex_embeddings` 테이블 upsert (onConflict: complex_id,chunk_type)
- 거래 쿼리: `cancel_date IS NULL AND superseded_by IS NULL` 준수

### scripts/ingest-sgis.ts

- `../src/services/sgis` 상대경로 import (06-01 의존)
- 6개 지역 순회: 창원시 5구 + 김해시
- `district_stats` 테이블 upsert (onConflict: adm_cd,data_year,data_quarter)
- 지역별 실패 시 스킵 (전체 중단 안 함)
- adm_cd 코드 ASSUMED: 48121~48129 (창원), 48250 (김해)

### .github/workflows/sgis-stats.yml

- cron: `0 3 15 1,4,7,10 *` (1·4·7·10월 15일 03:00 UTC)
- workflow_dispatch 수동 실행 지원
- timeout-minutes: 10

## Test Results

```
Test Files: 3 passed (3)
Tests:      22 passed (22)
Duration:   ~2.3s
```

| 테스트 파일 | 케이스 수 | 결과 |
|------------|----------|------|
| route.test.ts (chat/complex) | 6 | 전체 PASS |
| route.test.ts (ad-copy-review) | 7 | 전체 PASS |
| route.test.ts (ads/events) | 9 | 전체 PASS (기존) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Anthropic Mock 타입 캐스팅 오류**
- **Found during:** Task 1 (TypeScript 컴파일 검사)
- **Issue:** `typeof Anthropic`을 `Mock`으로 직접 캐스팅 시 타입 겹침 없음 오류
- **Fix:** `as unknown as Mock` 이중 캐스팅으로 수정
- **Files modified:** `src/app/api/admin/ad-copy-review/route.test.ts`
- **Commit:** 98a6def

**2. [Rule 1 - Bug] pgvector RPC 타입 미존재**
- **Found during:** Task 2 (TypeScript 컴파일 검사)
- **Issue:** `match_complex_embeddings` RPC가 06-00 마이그레이션 미적용으로 DB 타입에 없음
- **Fix:** `supabase as unknown as { rpc: ... }` 명시적 타입 캐스팅. 마이그레이션 적용 + `supabase gen types` 후 제거 가능
- **Files modified:** `src/app/api/chat/complex/route.ts`
- **Commit:** 98a6def

## Known Stubs

없음. API route 구현은 실제 외부 API(Voyage AI, Claude API)를 호출하는 실제 구현. DB 마이그레이션 미적용 상태이므로 런타임 실행 전 06-00 checkpoint 완료 필요.

## Threat Flags

없음. 계획된 위협 모델(T-06-02-01~05)이 모두 구현에 반영됨:
- T-06-02-01: 시스템 프롬프트로 역할 고정 (prompt injection 방어)
- T-06-02-04: 2단계 관리자 검증 (auth.getUser + profiles.role)
- T-06-02-05: adm_cd ASSUMED 위험 코드 및 workflow에 주의사항 문서화

## Pre-Execution Requirements

이 플랜의 실행 결과물이 런타임에서 동작하려면:

1. **06-00 checkpoint 완료**: `npm run db:push` 로 마이그레이션 적용 필요
2. **06-01 완료**: `src/services/sgis.ts` 존재해야 `ingest-sgis.ts` 실행 가능
3. **환경변수 설정**: `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` (`.env.local`)
4. **초기 임베딩**: `npx tsx scripts/embed-complexes.ts` 1회 실행
5. **SGIS adm_cd 검증**: 첫 실행 전 stage API로 코드 확인

## Self-Check: PASSED

- [x] `src/app/api/chat/complex/route.ts` — 생성됨
- [x] `src/app/api/chat/complex/route.test.ts` — 생성됨
- [x] `src/app/api/admin/ad-copy-review/route.ts` — 생성됨
- [x] `src/app/api/admin/ad-copy-review/route.test.ts` — 생성됨
- [x] `scripts/embed-complexes.ts` — 생성됨
- [x] `scripts/ingest-sgis.ts` — 생성됨
- [x] `.github/workflows/sgis-stats.yml` — 생성됨
- [x] Commit e90de36 — git log로 확인됨 (Task 1)
- [x] Commit 98a6def — git log로 확인됨 (Task 2)
