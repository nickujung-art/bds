---
phase: "08"
plan: "04"
subsystem: cafe-nlp-pipeline
tags: [daum-cafe, gemini-ner, nlp, cron, complex-matching, diff-02]
dependency_graph:
  requires:
    - supabase/migrations/20260512000003_phase8_cafe_posts.sql (08-00)
    - src/lib/data/complex-matching.ts (기존 3축 파이프라인)
  provides:
    - src/services/daum-cafe.ts
    - src/lib/data/cafe-posts.ts
    - src/app/api/worker/cafe-ingest/route.ts
    - .github/workflows/cafe-ingest.yml
    - src/components/complex/CafePostsList.tsx
  affects:
    - src/app/complexes/[id]/page.tsx (카페 글 목록 섹션 추가)
tech_stack:
  added: []
  patterns:
    - Daum Search API (/v2/search/cafe) — KakaoAK 헤더 인증
    - Gemini NER — [텍스트]...[텍스트 끝] 구분자 프롬프트 인젝션 방지 (T-8-03)
    - matchComplex() 3축 파이프라인 재사용 — sgg_code + 이름 복합 매칭
    - GitHub Actions 일 1회 cron (05:00 KST = 20:00 UTC)
    - CRON_SECRET 헤더 인증 (기존 notify-worker와 동일 패턴)
key_files:
  created:
    - src/services/daum-cafe.ts
    - src/lib/data/cafe-posts.ts
    - src/app/api/worker/cafe-ingest/route.ts
    - .github/workflows/cafe-ingest.yml
    - src/components/complex/CafePostsList.tsx
  modified:
    - src/app/complexes/[id]/page.tsx (getCafePostsByComplex 호출 + CafePostsList 렌더)
    - src/__tests__/daum-cafe.test.ts (vi.resetModules() 추가 — Rule 1)
decisions:
  - "matchComplex() 반환값이 string | null (complexId 직접 반환) — PLAN pseudo-code의 matchResult?.complexId 패턴과 달리 수정 적용"
  - "confidence는 matchComplex 성공 시 0.9 고정, 실패 시 null — 내부 AUTO_THRESHOLD 반영"
  - "vi.resetModules() 추가로 extractComplexNames 테스트 모킹 이슈 해결 (Rule 1)"
  - "SupabaseClient<any> 타입 사용 — cafe_posts 테이블이 database.ts 타입에 미포함 (Phase 8 마이그레이션 미반영)"
metrics:
  duration: "~40분"
  completed_date: "2026-05-13"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 8 Plan 04: Daum 카페 NLP 단지 매칭 파이프라인 Summary

**One-liner:** Daum Search API + Gemini NER 파이프라인으로 카페 글을 수집하고 matchComplex() 3축 매칭으로 단지에 연결, 단지 상세 페이지에 카페 이야기 섹션 표시

---

## What Was Built

### Task 1: daum-cafe.ts 서비스 어댑터 (commit: 7a1cf6b)

**`src/services/daum-cafe.ts`**
- `searchCafePosts(query, size)`: Daum Search API `/v2/search/cafe` 호출 → `CafePost[]` 반환
  - `KakaoAK ${KAKAO_REST_API_KEY}` 헤더 인증
  - HTTP 오류 시 `Error("Daum cafe search HTTP {status}")` throw
  - `AbortSignal.timeout(10_000)` 타임아웃
- `extractComplexNames(text)`: Gemini 2.0 Flash NER → `string[]` (단지명 배열)
  - **T-8-03**: `[텍스트]...[텍스트 끝]` 구분자로 프롬프트 인젝션 방지
  - `text.slice(0, 500)` 길이 제한
  - GEMINI_API_KEY 없으면 빈 배열 반환 (안전 fallback)
- `import 'server-only'` 마크 (T-8-02)

### Task 2: 수집 파이프라인 + 단지 페이지 연동 (commits: cf86852, df8ec40)

**`src/lib/data/cafe-posts.ts`**
- `getCafePostsByComplex(complexId, supabase, limit)`: cafe_posts 테이블에서 is_verified=true 글 조회
- `ingestCafePost(post, complexName, sggCode, supabase)`:
  - **matchComplex() 경유 필수** — sgg_code + 이름 복합 매칭 (CLAUDE.md CRITICAL 규칙)
  - 매칭 성공 → confidence=0.9, is_verified=true
  - 매칭 실패 → complex_id=null, confidence=null, is_verified=false (운영자 검수 큐)
  - `url` UNIQUE 기준 upsert

**`src/app/api/worker/cafe-ingest/route.ts`**
- POST 엔드포인트: `x-cron-secret` 헤더 검증 (없음/틀림 → 401)
- 7개 창원·김해 검색 쿼리로 Daum 검색
- 각 글마다 Gemini NER → matchComplex → upsert 파이프라인
- ingested/failed 카운트 반환

**`.github/workflows/cafe-ingest.yml`**
- 매일 05:00 KST (20:00 UTC) GitHub Actions cron
- `x-cron-secret` 헤더로 인증
- HTTP 상태 비 200 시 exit 1 (실패 알림)

**`src/components/complex/CafePostsList.tsx`**
- 서버 컴포넌트 (`'use client'` 없음)
- posts 0건이면 null 반환
- 제목 외부 링크 (`target="_blank" rel="noopener noreferrer"`)
- 카페명 + 작성일 표시
- AI 슬롭 없음 (Powered by AI 배지, gradient 없음)
- 주석: "AI로 단지 연관 글을 수집합니다. 정확도 검증 중인 글은 표시되지 않아요."

**`src/app/complexes/[id]/page.tsx`** 수정
- `getCafePostsByComplex` import + Promise.all에 병렬 fetch 추가
- 동네 의견 섹션 하단에 `<CafePostsList posts={cafePosts} />` 추가

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] vi.resetModules() 추가 — daum-cafe.test.ts 모킹 이슈**
- **Found during:** Task 1 테스트 실행
- **Issue:** `extractComplexNames` 테스트에서 `vi.doMock('@google/generative-ai', ...)` 이후 import해도 캐시된 모듈이 반환됨 — 모킹이 적용되지 않아 빈 배열 반환
- **Fix:** `vi.resetModules()` + `vi.doMock('server-only', () => ({}))` 추가
- **Files modified:** `src/__tests__/daum-cafe.test.ts`
- **Commit:** 7a1cf6b

**2. [Rule 3 - Blocking] merge conflict 해결 — kakao-channel.ts**
- **Found during:** Task 2 빌드 실행
- **Issue:** 08-04와 08-05 에이전트가 동시에 `kakao-channel.ts`를 생성하여 conflict markers 발생
- **Fix:** 두 버전을 통합한 최종 버전 작성 (T-8-04 주석 + disableSms: false 유지)
- **Files modified:** `src/services/kakao-channel.ts`, `src/lib/notifications/deliver.ts`

**3. [Rule 1 - Bug] matchComplex() 반환값 타입 수정**
- **Found during:** Task 2 구현
- **Issue:** PLAN pseudo-code에서 `matchResult?.complexId`를 참조하지만 실제 `matchComplex()`는 `string | null` (complexId)을 직접 반환
- **Fix:** `ingestCafePost`에서 반환값을 `complexId`로 직접 사용, confidence는 0.9 고정
- **Files modified:** `src/lib/data/cafe-posts.ts`

**4. [Rule 3 - Blocking] SupabaseClient 타입 우회 — cafe_posts 미포함**
- **Found during:** Task 2 빌드
- **Issue:** `database.ts`에 Phase 8 마이그레이션 테이블(`cafe_posts`)이 미포함 → 타입 오류
- **Fix:** `SupabaseClient<any>` 타입 별칭 사용 (기존 member-tier.ts 등과 동일 패턴)
- **Files modified:** `src/lib/data/cafe-posts.ts`

---

## Known Stubs

없음 — `getCafePostsByComplex`는 실제 DB에서 데이터를 fetch. 초기에는 cafe_posts 테이블이 비어있어 CafePostsList가 null을 반환하지만, 이것은 정상 동작입니다. 카페 글 수집은 cron 워커가 실행된 후 표시됩니다.

---

## Threat Flags

없음 — T-8-02(KAKAO_REST_API_KEY 서버 전용), T-8-03([텍스트] 구분자 인젝션 방지) 모두 구현됨.

---

## Self-Check

**파일 존재 확인:**
- src/services/daum-cafe.ts: FOUND
- src/lib/data/cafe-posts.ts: FOUND
- src/app/api/worker/cafe-ingest/route.ts: FOUND
- .github/workflows/cafe-ingest.yml: FOUND
- src/components/complex/CafePostsList.tsx: FOUND

**커밋 존재 확인:**
- 7a1cf6b: Task 1 — FOUND
- cf86852: Task 2 파이프라인 파일들 — FOUND
- df8ec40: Task 2 단지 상세 페이지 연동 — FOUND

**수락 기준 확인:**
- daum-cafe.test.ts 모든 테스트 PASS: YES (3/3)
- server-only 마크: YES (grep -c >= 1)
- KAKAO_REST_API_KEY 참조: YES (grep -c >= 2)
- [텍스트] 구분자: YES (grep -c >= 3)
- console.log 없음: YES (grep -c = 0)
- slice(0, 500): YES (grep -c >= 1)
- matchComplex 참조 >= 1: YES (grep -c = 5)
- CRON_SECRET 참조 >= 2: YES
- cron 참조 >= 1 (yml): YES
- 'use client' 없음: YES
- Powered by AI/gradient 없음: YES

## Self-Check: PASSED
