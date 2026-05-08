---
phase: "06"
plan: "04"
subsystem: gps-auth
tags: [gps-badge, gps-l2, gps-l3, admin-review, e2e-tests]
dependency_graph:
  requires:
    - "06-00 (gps_visits, gps_verification_requests, gps_badge_level 마이그레이션)"
  provides:
    - "recordGpsVisitAndCheckL2 (GPS L1/L2 Server Action)"
    - "submitL3VerificationRequest (L3 신청 Server Action)"
    - "uploadL3Document (Storage 업로드 Server Action)"
    - "GpsBadge (배지 컴포넌트 L1/L2/L3)"
    - "GpsVerifyL3Upload (L3 서류 업로드 클라이언트 컴포넌트)"
    - "/admin/gps-requests (어드민 L3 검토 페이지)"
    - "POST /api/admin/gps-approve (L3 승인/거절 API)"
    - "e2e/phase6.spec.ts (Phase 6 통합 E2E)"
    - "e2e/gap-label.spec.ts (갭 라벨 E2E)"
  affects:
    - "src/types/database.ts (gps_visits, gps_verification_requests 타입 추가, profiles.gps_badge_level 추가)"
tech_stack:
  added: []
  patterns:
    - "Server Action — Storage 업로드 (CLAUDE.md: client-side Supabase 금지 준수)"
    - "Admin guard 패턴 (auth.getUser + profiles.role 2단계)"
    - "formData + JSON 이중 파싱 (HTML form submit + JSON API 양방향)"
    - "E2E SKIP_IN_CI 패턴 (로컬 Supabase 전용 테스트)"
key_files:
  created:
    - src/lib/auth/gps-badge.ts
    - src/components/reviews/GpsBadge.tsx
    - src/components/community/GpsVerifyL3Upload.tsx
    - src/app/admin/gps-requests/page.tsx
    - src/app/api/admin/gps-approve/route.ts
    - e2e/phase6.spec.ts
    - e2e/gap-label.spec.ts
  modified:
    - src/types/database.ts
decisions:
  - "위치 검증을 PostGIS ST_DWithin 대신 위도/경도 차이 비교로 구현 — 로컬 PostGIS RPC 미설정 환경 대응. 위도 0.0009°≈100m, 경도 0.0013°≈100m (한국 위도 35° 기준)"
  - "GpsVerifyL3Upload에서 파일 선택 시 React state로 fileName 관리 — fileRef.current?.files?.[0]를 렌더링에 직접 사용하면 리렌더 안 됨"
  - "uploadL3Document를 별도 Server Action으로 분리 — CLAUDE.md 'Storage는 server-side에서만' 원칙 준수"
  - "E2E 테스트 plan의 tests/e2e/ 경로를 프로젝트 실제 e2e/ 디렉토리로 조정 (편차: Rule 1 자동수정)"
metrics:
  duration: "~25분"
  completed_date: "2026-05-08"
  tasks_completed: 2
  tasks_total: 2
  files_created: 7
  files_modified: 1
---

# Phase 6 Plan 04: GPS L2/L3 인증 + 어드민 검토 UI + E2E 테스트 Summary

Wave 3 완료. GPS 배지 레벨 시스템(L1 방문인증·L2 거주인증·L3 소유자인증) Server Action 구현, L3 서류 업로드 클라이언트 컴포넌트, 어드민 검토 페이지 + 승인/거절 API, Phase 6 통합 E2E 테스트 2개 파일 추가.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | GPS L2 Server Action + L3 upload + 배지 컴포넌트 + 어드민 UI | 859e054 | gps-badge.ts, GpsBadge.tsx, GpsVerifyL3Upload.tsx, admin/gps-requests/page.tsx, api/admin/gps-approve/route.ts, database.ts |
| 2 | Phase 6 E2E 테스트 | 48f1557 | e2e/phase6.spec.ts, e2e/gap-label.spec.ts |

## Artifacts

### src/lib/auth/gps-badge.ts

- `recordGpsVisitAndCheckL2(complexId, lat, lng)`: 위치 ±100m 검증 → gps_visits INSERT → 30일 3회 이상 방문 시 gps_badge_level 2 자동 업그레이드. 최초 방문 시 0→1
- `submitL3VerificationRequest(complexId, docType, storagePath)`: gps_verification_requests INSERT, status='pending'
- `uploadL3Document(complexId, docType, formData)`: Storage 버킷 'gps-docs'에 `{userId}/{complexId}/{docType}-{timestamp}.{ext}` 경로로 업로드

### src/components/reviews/GpsBadge.tsx

- `level 0` → null (미렌더)
- `level 1` → `.badge.neutral` "방문인증"
- `level 2` → `.badge.pos` "거주인증"
- `level 3` → `.badge.orange` "소유자인증"
- `aria-label="GPS 인증 배지: {label}"` 접근성

### src/components/community/GpsVerifyL3Upload.tsx

- `'use client'` — 파일 선택·업로드 상태 관리
- 문서 종류 선택: 등본 / 관리비 chip 버튼
- 파일 검증: ALLOWED_TYPES (JPG/PNG/PDF), MAX_SIZE (5MB)
- Server Action 순서: `uploadL3Document` → `submitL3VerificationRequest`
- 성공 시: "관리자 검토 후 배지가 업그레이드됩니다." 안내 (1~3 영업일)

### src/app/admin/gps-requests/page.tsx

- Admin guard: auth.getUser + profiles.role in ('admin','superadmin')
- `gps_verification_requests` WHERE status='pending' 조회 (profiles join, complexes join)
- 테이블: 회원닉네임·단지명·서류종류·파일보기링크·신청일·승인/거절 form
- 승인/거절: `POST /api/admin/gps-approve` form action

### src/app/api/admin/gps-approve/route.ts

- Admin guard (auth + role 2단계)
- formData (HTML form) 또는 JSON 양방향 파싱
- approve → `gps_verification_requests.status='approved'` + `profiles.gps_badge_level=3`
- reject → `gps_verification_requests.status='rejected'`
- form submit 시 `/admin/gps-requests` redirect

### src/types/database.ts 수정

- `gps_visits` 테이블 Row/Insert/Update 타입 추가
- `gps_verification_requests` 테이블 Row/Insert/Update 타입 추가
- `profiles.gps_badge_level: number` 컬럼 추가

### e2e/phase6.spec.ts

- AI 상담 버튼 표시 확인
- AI 상담 패널 열기 + 면책 고지 확인
- 닫기 버튼으로 패널 닫힘
- Escape 키로 패널 닫힘
- 어드민 ROI 현황 페이지 DOM 확인
- SGIS 지역통계 카드 조건부 DOM 확인
- 전체 테스트 `SKIP_IN_CI=true` 적용

### e2e/gap-label.spec.ts

- 갭 라벨 조건부 표시 (listing_prices 데이터 있을 때만)
- neg 배지 `.badge.neg` + "높음" 텍스트 검증
- pos 배지 `.badge.pos` + "낮음" 텍스트 검증
- aria-label="매물 시세 비교" 확인
- `SKIP_IN_CI=true` 적용

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] E2E 테스트 경로 조정 (tests/e2e/ → e2e/)**

- **발견 위치:** Task 2 파일 생성 전 디렉토리 확인
- **문제:** 플랜이 `tests/e2e/` 경로를 지정했으나 프로젝트의 실제 E2E 테스트 디렉토리는 `e2e/`
- **수정:** `e2e/phase6.spec.ts`, `e2e/gap-label.spec.ts` 로 생성
- **영향:** Playwright config 기존 설정과 일치

**2. [Rule 2 - 누락 기능] GpsVerifyL3Upload 파일명 state 추가**

- **발견 위치:** Task 1 컴포넌트 작성 중
- **문제:** 플랜 코드의 `{fileRef.current?.files?.[0]?.name}` 렌더링은 리렌더를 트리거하지 않음
- **수정:** `useState<string | null>('fileName')` 추가, `onChange` 이벤트에서 `setFileName()` 호출
- **영향:** 파일 선택 후 파일명이 즉시 UI에 표시됨

**3. [Rule 2 - 누락 기능] gps_visits/gps_verification_requests TypeScript 타입 추가**

- **발견 위치:** Task 1 gps-badge.ts 작성 후 lint 확인 전
- **문제:** 06-00 마이그레이션에서 추가된 테이블들이 database.ts에 타입 없음
- **수정:** `gps_visits`, `gps_verification_requests` Row/Insert/Update 타입 추가, `profiles.gps_badge_level` 컬럼 추가
- **영향:** TypeScript strict 모드 컴파일 통과

## Phase 6 전체 완료 현황

| 기능 | 상태 | 관련 Plan |
|------|------|----------|
| 갭 라벨 UI 표시 | 완료 (listing_prices 데이터 전제) | 06-01, 06-03 |
| SGIS 지역통계 카드 | 완료 (ingest-sgis.ts 실행 전제) | 06-01, 06-03 |
| AI 상담 버튼 + 패널 | 완료 | 06-02, 06-03 |
| 광고 ROI 현황 | 완료 | 06-01, 06-03 |
| 광고 카피 AI 검토 | 완료 | 06-02, 06-03 |
| GPS L1 방문인증 | 완료 | 06-04 |
| GPS L2 거주인증 | 완료 | 06-04 |
| GPS L3 서류 업로드 + 어드민 승인 | 완료 | 06-04 |
| embed-complexes.ts 실행 | 운영 실행 필요 (스크립트 준비됨) | 06-01 |
| ingest-sgis.ts 실행 | 운영 실행 필요 (스크립트 준비됨) | 06-01 |
| GitHub Actions sgis-stats.yml | 등록 완료 (데이터 연동 후 활성화) | 06-00 |

## Known Stubs

없음. 모든 구현체는 실제 DB/API에 연결됨:
- `recordGpsVisitAndCheckL2` → `gps_visits` 실제 INSERT
- `submitL3VerificationRequest` → `gps_verification_requests` 실제 INSERT
- `uploadL3Document` → Supabase Storage `gps-docs` 실제 업로드
- `/api/admin/gps-approve` → `profiles.gps_badge_level` 실제 업데이트

단, 런타임 동작은 06-00 DB 마이그레이션 + Storage 버킷 생성 완료 후 가능.

## Threat Flags

없음. 계획된 위협 모델(T-06-04-01~06) 구현 확인:
- T-06-04-01: 위치 검증 ±100m (PostGIS 대체: 위도/경도 차이 계산)
- T-06-04-02: gps_visits RLS "auth insert" — user_id = auth.uid() 제약
- T-06-04-03: Storage policy — foldername[1] = auth.uid()::text
- T-06-04-04: /api/admin/gps-approve — admin/superadmin role 2단계 guard
- T-06-04-05: GpsVerifyL3Upload — ALLOWED_TYPES + MAX_SIZE 클라이언트 검증
- T-06-04-06: gps_verification_requests RLS "owner read" — user_id = auth.uid()

## Self-Check: PASSED

- [x] `src/lib/auth/gps-badge.ts` — 생성됨, recordGpsVisitAndCheckL2 + submitL3VerificationRequest + uploadL3Document export
- [x] `src/components/reviews/GpsBadge.tsx` — 생성됨, level 0→null, 1→neutral, 2→pos, 3→orange
- [x] `src/components/community/GpsVerifyL3Upload.tsx` — 생성됨, 파일 검증 + Server Action 경유
- [x] `src/app/admin/gps-requests/page.tsx` — 생성됨, pending 목록 + 승인/거절 form
- [x] `src/app/api/admin/gps-approve/route.ts` — 생성됨, approve→badge_level=3, reject→status=rejected
- [x] `e2e/phase6.spec.ts` — 생성됨, AI 상담/어드민/SGIS 테스트
- [x] `e2e/gap-label.spec.ts` — 생성됨, 갭 라벨 neg/pos 클래스 검증
- [x] `src/types/database.ts` — gps_visits, gps_verification_requests, profiles.gps_badge_level 추가
- [x] Commit 859e054 — git log 확인됨 (Task 1)
- [x] Commit 48f1557 — git log 확인됨 (Task 2)
- [x] `npm run lint` — 오류 없음
- [x] `npm run build` — ✓ Compiled successfully
