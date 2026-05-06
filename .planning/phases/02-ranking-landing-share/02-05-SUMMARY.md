---
phase: "02"
plan: "05"
subsystem: share-button
tags: [share, kakao, naver, clipboard, tdd, client-component]
dependency_graph:
  requires:
    - 02-01: share-button.test.ts RED 스캐폴드
  provides:
    - ShareButton 컴포넌트 (카카오톡·네이버·링크복사)
    - handleKakaoShare / handleCopyLink named exports
  affects:
    - src/app/complexes/[id]/page.tsx: ShareButton 연결
tech_stack:
  added: []
  patterns:
    - Kakao JS SDK 동적 로드 + isInitialized() 중복 초기화 방지
    - named export 핸들러 패턴 (테스트 가능한 순수 함수 분리)
    - TDD GREEN: RED 스캐폴드 → 구현 → @ts-expect-error 제거
key_files:
  created:
    - src/components/complex/ShareButton.tsx
  modified:
    - src/__tests__/share-button.test.ts
    - src/app/complexes/[id]/page.tsx
decisions:
  - handleKakaoShare/handleCopyLink를 컴포넌트 내부 메서드가 아닌 named exports로 분리 — 테스트 인터페이스가 순수 함수 호출을 요구했기 때문
  - handleKakaoShare는 동기 함수로 노출하되 내부에서 void 비동기 SDK 로드 처리 — 테스트가 expect().not.toThrow() 동기 검증을 사용
  - SDK 로드 실패 시 handleCopyLink 폴백 — UX 연속성 보장
metrics:
  duration: "20분"
  completed: "2026-05-06"
  tasks: 2
  files: 3
---

# Phase 2 Plan 05: ShareButton 컴포넌트 구현 Summary

카카오톡·네이버·링크복사 공유 드롭다운 `ShareButton` 클라이언트 컴포넌트 구현 및 단지 상세 페이지 연결 완료.

## What Was Built

### Task 1: ShareButton 컴포넌트 (TDD GREEN)

`src/components/complex/ShareButton.tsx` 신규 생성:

- `handleKakaoShare(params)` — named export. Kakao JS SDK 동적 로드 + `isInitialized()` 체크 후 `Kakao.Share.sendDefault()` 호출. SDK 로드 실패 시 `handleCopyLink` 폴백
- `handleCopyLink(params)` — named export. `navigator.clipboard.writeText(complexUrl)` 호출
- `ShareButton` — 'use client' 드롭다운 컴포넌트 (카카오톡 `#FEE500`, 네이버 `#03C75A`, 링크복사 CopyIcon)
- `window.open`에 `noopener,noreferrer` 적용 (T-02-15 mitigate)
- `share-button.test.ts` 2개 테스트 모두 PASS (GREEN)

### Task 2: 단지 상세 page.tsx 공유 버튼 교체

`src/app/complexes/[id]/page.tsx` 수정:

- `ShareButton` import 추가
- 정적 `<button aria-label="공유"><ShareIcon /></button>` 제거
- `<ShareButton complexId={id} complexName={complex.canonical_name} location={...} />` 로 교체
- 미사용 `ShareIcon` 함수 제거

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] @ts-expect-error 디렉티브가 GREEN 후 lint 오류 발생**
- **Found during:** Task 1 lint 검증
- **Issue:** `share-button.test.ts`의 `@ts-expect-error`가 모듈 구현 후 "Unused @ts-expect-error directive" TS2578 오류로 변환
- **Fix:** `@ts-expect-error` 주석 제거 (02-01 SUMMARY에서 "Wave 2 구현 완료 후 제거 예정"으로 명시됨)
- **Files modified:** `src/__tests__/share-button.test.ts`
- **Commit:** 581d9ea

**2. [Rule 1 - Bug] 플랜의 컴포넌트 메서드 패턴 vs 테스트의 named export 패턴 불일치**
- **Found during:** Task 1 TDD 분석
- **Issue:** 플랜의 `<action>`은 `handleKakaoShare`/`handleCopyLink`를 컴포넌트 내부 함수로 정의했으나, 테스트(`share-button.test.ts`)는 이들을 `import { handleKakaoShare, handleCopyLink } from '@/components/complex/ShareButton'`로 named export를 기대
- **Fix:** 테스트가 기준 (TDD 원칙). 두 함수를 컴포넌트 파일에서 named exports로 분리. `ShareButton` 컴포넌트는 내부적으로 이를 호출
- **Impact:** 테스트 가능성 향상, 코드 분리 명확화

### Pre-existing Issues (스코프 외)

- `src/__tests__/complex-search.test.ts`, `schema.integration.test.ts`: `status` 타입 불일치 — 기존 오류, 이 플랜에서 수정하지 않음
- `public/fonts/PretendardVariable.woff2` 미존재로 `npm run build` 실패 — 02-01에서 TTF만 추가했고 WOFF2는 postinstall 생성 파일. 이 워크트리 환경의 기존 상태

## TDD Gate Compliance

Task 1은 `tdd="true"`:

- RED: 02-01에서 `share-button.test.ts` 스캐폴드 커밋 (`test(02-01)` — a1d156f)
- GREEN: `feat(02-05)` — 581d9ea (2개 테스트 PASS, @ts-expect-error 제거)

RED → GREEN 게이트 순서 준수.

## Known Stubs

없음. ShareButton의 카카오톡·네이버·링크복사 기능이 모두 구현되었고, page.tsx에 실제 데이터(`complex.canonical_name`, `complex.si/gu/dong`)로 연결됨.

## Threat Flags

없음. T-02-14~17 위협 모두 플랜 threat_model에 등록됨:
- `window.open`에 `noopener,noreferrer` 적용 (T-02-15 mitigate 완료)
- Kakao JS Key는 `NEXT_PUBLIC_KAKAO_JS_KEY` 환경변수에서만 읽음 (T-02-17 accept)

## Self-Check: PASSED

- src/components/complex/ShareButton.tsx: FOUND
- src/__tests__/share-button.test.ts (@ts-expect-error 제거): FOUND
- src/app/complexes/[id]/page.tsx (ShareButton 연결): FOUND
- 커밋 581d9ea: FOUND
- 커밋 6944888: FOUND
