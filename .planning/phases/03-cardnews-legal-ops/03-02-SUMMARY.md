---
phase: 03-cardnews-legal-ops
plan: "02"
subsystem: auth-legal
tags:
  - legal
  - consent
  - gdpr
  - server-actions
  - rls
dependency_graph:
  requires:
    - "03-01"
  provides:
    - consent-flow
    - withdrawal-flow
    - reactivation-flow
    - legal-pages
    - footer
  affects:
    - auth/callback
    - profile-page
    - molit-trade-cron
tech_stack:
  added:
    - "src/types/server-actions.d.ts (React DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS 타입 확장)"
  patterns:
    - "TDD RED→GREEN (consent-actions.test.ts → consent-actions.ts)"
    - "RLS Pitfall 2 우회: 모든 profiles UPDATE는 createSupabaseAdminClient() 경유"
    - "Server Action form action 타입: Promise<{ error }> → React 타입 확장으로 해결"
key_files:
  created:
    - src/lib/auth/consent-actions.ts
    - src/app/consent/page.tsx
    - src/app/reactivate/page.tsx
    - src/app/legal/terms/page.tsx
    - src/app/legal/privacy/page.tsx
    - src/app/legal/ad-policy/page.tsx
    - src/components/layout/Footer.tsx
    - src/types/server-actions.d.ts
    - src/__tests__/consent-actions.test.ts
  modified:
    - src/app/auth/callback/route.ts
    - src/app/profile/page.tsx
    - src/app/api/ingest/molit-trade/route.ts
    - src/app/layout.tsx
    - src/types/database.ts
decisions:
  - "D-18: SUPPORT_EMAIL env var (NEXT_PUBLIC_ 접두사 없음 — 서버 컴포넌트 전용)"
  - "Admin client 필수: profiles UPDATE는 RLS owner-update with check role in ('user') 우회 위해 service_role 경유"
  - "Footer 전체 노출: admin 경로 포함 모든 페이지에 Footer 표시 (route group 격리는 향후)"
  - "TypeScript 타입 확장: DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS으로 Server Action 반환 타입 허용"
metrics:
  duration: "20분"
  completed: "2026-05-06T09:42:00Z"
  tasks_completed: 3
  tasks_total: 3
  files_created: 9
  files_modified: 5
---

# Phase 3 Plan 02: LEGAL-01~05 동의·탈퇴·재활성화·법적 페이지 Summary

Wave 1 법적 요건 전체 완성. TDD RED→GREEN, admin client RLS 우회 패턴, 3개 법적 페이지, Footer 공통화.

## 무엇을 구현했나

### Task 1: consent-actions.ts (TDD RED→GREEN)
3개 Server Action을 작성하고 5개 테스트 GREEN 통과.

| Action | 기능 | 핵심 |
|--------|------|------|
| `agreeToTerms(formData)` | terms_agreed_at 업데이트 | admin client RLS 우회 |
| `deleteAccount()` | deleted_at soft-delete + signOut | admin client RLS 우회 |
| `reactivateAccount()` | deleted_at NULL 복구 | admin client RLS 우회 |

**왜 admin client가 필수인가:** `profiles` 테이블의 owner update 정책에 `with check (role in ('user'))` 조건 포함. admin role 사용자는 일반 supabase client로 자신의 profile을 업데이트할 수 없음 (RESEARCH.md Pitfall 2). 모든 `profiles` UPDATE는 `createSupabaseAdminClient()` 경유 필수.

### Task 2: auth/callback + 신규 페이지

**auth/callback 분기 흐름:**
```
GET /auth/callback
  └─ exchangeCodeForSession(code)
       ├─ error → /login?error=auth
       └─ OK → profiles 체크
            ├─ deleted_at IS NOT NULL → /reactivate
            ├─ terms_agreed_at IS NULL → /consent?next=<encoded>
            └─ 정상 → next
```

**신규 페이지:**
- `/consent` — 이용약관·개인정보처리방침 체크박스 2개 + `agreeToTerms` Server Action 폼
- `/reactivate` — 탈퇴 일시 + hard delete 예정일 표시 + `reactivateAccount` / `signOut` 버튼
- `/profile` 위험 구역 — `deleteAccount` 버튼 추가

### Task 3: cron hard delete + 법적 페이지 + Footer

**cron 응답 스키마 변경:**
```json
{
  "summary": {
    "yearMonth": "...",
    "regions": 0,
    "rowsUpserted": 0,
    "failed": 0,
    "hardDeleted": 0,        // NEW: 30일 경과 hard delete 완료 수
    "hardDeleteFailed": 0    // NEW: hard delete 실패 수
  },
  "results": { ... }
}
```

**법적 페이지 섹션 수:**
- `/legal/terms`: 7개 조항 (약관규제법 + 전자상거래법)
- `/legal/privacy`: 8개 항목 (개인정보보호법 §30 전체)
- `/legal/ad-policy`: 6개 섹션 (표시광고법 준수)

**Footer 노출 정책:**
V1.0에서는 admin 경로 포함 모든 페이지에 Footer 표시. Admin 페이지는 자체 full-height 레이아웃으로 Footer가 콘텐츠 아래에 위치. 향후 `(admin)/layout.tsx` route group으로 격리 예정.

## 신규 Server Action 시그니처

```typescript
// src/lib/auth/consent-actions.ts
export async function agreeToTerms(
  formData: FormData,
): Promise<{ error: string | null }>

export async function deleteAccount(): Promise<{ error: string | null }>

export async function reactivateAccount(): Promise<{ error: string | null }>
```

## 발견된 이슈 및 편차

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript profiles 컬럼 타입 누락**
- **Found during:** Task 2 lint 실행
- **Issue:** `src/types/database.ts`에 `deleted_at`, `terms_agreed_at`, `suspended_at` 컬럼이 없어 TypeScript 오류
- **Fix:** Wave 0 마이그레이션으로 추가된 컬럼들을 `database.ts`의 `profiles` Row/Insert/Update 타입에 수동 추가
- **Files modified:** `src/types/database.ts`

**2. [Rule 3 - Blocking] Server Action form action 타입 미스매치**
- **Found during:** Task 2 lint 실행
- **Issue:** `@types/react` form `action` prop은 `(formData: FormData) => void | Promise<void>` 타입만 허용. 우리 Server Action은 `Promise<{ error: string | null }>` 반환
- **Fix:** `src/types/server-actions.d.ts`에서 `DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS` 인터페이스 확장으로 해결 (React 공식 확장점)
- **Files modified:** `src/types/server-actions.d.ts` (신규)

**3. [Rule 3 - Blocking] 워크트리 빌드 폰트 누락**
- **Found during:** Task 3 빌드 실행
- **Issue:** 워크트리 `public/fonts/` 디렉토리 누락 — `PretendardVariable.woff2` 폰트 없어 빌드 실패
- **Fix:** 메인 저장소에서 폰트 파일 복사 (워크트리 `public/fonts/`는 .gitignore로 추적 안 됨)
- **Note:** 실제 배포 시에는 메인 저장소에 폰트가 있으므로 문제 없음

**4. [Rule 1 - Bug] vitest 테스트 mock 큐 누수**
- **Found during:** Task 1 GREEN 단계
- **Issue:** `mockResolvedValueOnce`로 로그인 상태 설정 후, 체크박스 검증 조기 반환으로 mock이 소비되지 않아 후속 비로그인 테스트에서 잘못된 mock 사용
- **Fix:** `mockResolvedValue` (non-Once) + `afterEach(vi.clearAllMocks)` + 헬퍼 함수 패턴으로 리팩토링

## 검증 결과

- `npm run test -- --run src/__tests__/consent-actions.test.ts`: 5/5 PASS
- `npm run lint`: ESLint 오류 없음 (기존 TypeScript 오류는 pre-existing)
- `npm run build`: 성공 — 5개 신규 라우트 확인
  - `/consent` (동적)
  - `/reactivate` (동적)
  - `/legal/terms` (정적)
  - `/legal/privacy` (정적)
  - `/legal/ad-policy` (정적)

## Known Stubs

없음 — 모든 기능이 실제 데이터에 연결되어 있음.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: open-redirect | src/app/auth/callback/route.ts | next 파라미터를 /consent?next=...에 encodeURIComponent로 전달. Next.js redirect()는 동일 origin만 허용하므로 외부 도메인 오픈 리다이렉트 불가 (T-03-06 mitigated) |
| threat_flag: self-delete-only | src/lib/auth/consent-actions.ts | deleteAccount는 `eq('id', user.id)` 강제 — 자기 자신만 탈퇴 가능 (T-03-08 mitigated) |

## Self-Check: PASSED
