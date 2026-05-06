# Phase 3: 카드뉴스·법적·운영 - Research

**Researched:** 2026-05-06
**Domain:** Next.js 15 ImageResponse / Supabase Auth hard delete / Server Action 동의 흐름 / @axe-core/playwright / 한국 법령 법적 페이지
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**카드뉴스 (SHARE-03~04)**
- D-01: 데이터 소스 — 주간 신고가 TOP5 (complex_rankings, rank_type='high_price', limit=5)
- D-02: 이미지 크기 — 1080×1080 정사각형 PNG
- D-03: 배포 방식 — 브라우저 PNG 다운로드 (`<a download>`). Supabase Storage 불필요.
- D-04: 어드민 1-click — `/admin/cardnews` 페이지에서 "생성 + 다운로드" 버튼. API: `/api/cardnews/generate`.
- D-05: 카드뉴스 라우트 — `src/app/api/cardnews/generate/route.ts`, `runtime='nodejs'`, `ImageResponse` (next/og)

**탈퇴 플로우 (LEGAL-04)**
- D-06: Grace 기간 로그인 차단 + 30일 이내 재활성화 가능. 로그인 시 `deleted_at IS NOT NULL`이면 재활성화 안내 페이지 리다이렉트.
- D-07: Hard delete — 기존 Vercel cron (04:00 KST)에서 `supabase.auth.admin.deleteUser()` 호출.
- D-08: `complex_reviews.user_id FK → ON DELETE SET NULL` (이미 마이그레이션됨 — 20260430000016_reviews.sql 확인됨)
- D-09: `profiles.deleted_at timestamptz` 컬럼 추가 마이그레이션 필요.

**가입 동의 흐름 (LEGAL-01)**
- D-10: `/auth/callback`에서 `terms_agreed_at IS NULL`이면 `/consent`로 리다이렉트.
- D-11: 기존 회원 소급 — 배포 후 첫 로그인 시 동일 리다이렉트. 별도 마이그레이션 불필요.
- D-12: `profiles.terms_agreed_at timestamptz` 컬럼 추가 마이그레이션 필요.
- D-13: 동의 항목 — 이용약관(필수) + 개인정보처리방침(필수). 광고 수신 동의 옵셔널 미처리.

**어드민 시스템 모니터링 (ADMIN-04)**
- D-14: `/admin/status` 3개 섹션: DB 현황(COUNT) / Cron 이력(ingest_runs 최근 10건) / 대기 항목(신고 미인·광고 pending·약관 미동의).
- D-15: `revalidate = 0`.

**법적 페이지 (LEGAL-02~03, LEGAL-05)**
- D-16: 정적 마크다운 콘텐츠, `src/app/legal/` 하위. CMS 불필요.
- D-17: Footer에 법적 페이지 링크 추가.
- D-18: `SUPPORT_EMAIL` env var + mailto 링크.

**접근성 (A11Y-01~03)**
- D-19: `@axe-core/playwright` CI 추가. critical 0건 조건.
- D-20: aria-label, role, tabIndex 보완. 새 컴포넌트는 시맨틱 HTML 우선.

### Claude's Discretion
- 카드뉴스 시각 레이아웃 세부 구성 (순위 막대, 텍스트 배치 등) — 기존 OG 이미지 스타일(흰 배경, 오렌지 #ea580c) 일관성 유지
- 신고(reports) 테이블 스키마 설계 — 아래 Research에서 권장 스키마 제시
- `/consent` 페이지 UI 세부 구성
- Footer 컴포넌트 신규 추가 방식

### Deferred Ideas (OUT OF SCOPE)
- 광고 수신 동의 (마케팅 이메일) — Phase 4
- 탈퇴 후 익명 후기 UI — V1.0 후
- 카드뉴스 다중 템플릿 — Phase 4 이후

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SHARE-03 | 카드뉴스 자동 생성 (Recharts SSR + next/og) | ImageResponse + nodejs runtime + getRankingsByType(supabase, 'high_price', 5) 패턴 확인 |
| SHARE-04 | 어드민 카드뉴스 1-click 발행 UI | `/admin/cardnews` → `fetch('/api/cardnews/generate')` → Blob → `<a download>` 패턴 |
| LEGAL-01 | 이용약관 + 가입 동의 흐름 | auth/callback redirect 삽입점 확인 + Server Action `terms_agreed_at` 업데이트 패턴 |
| LEGAL-02 | 개인정보처리방침 | 개인정보보호법 최소 요건 확인, 정적 마크다운 방식 |
| LEGAL-03 | 광고 정책 + 표시광고법 고지 | 표시광고법 요건 확인, 정적 마크다운 방식 |
| LEGAL-04 | 탈퇴 플로우 (30일 grace + hard delete cron) | deleteUser API 확인 + cron 패턴 확인 + profiles 마이그레이션 |
| LEGAL-05 | 이메일 지원 채널 설정 | SUPPORT_EMAIL env var + mailto 링크 |
| ADMIN-01 | 회원 관리 (닉네임·계정 정지) | profiles 테이블 구조 확인, 정지 = suspended_at 컬럼 or role 변경 설계 필요 |
| ADMIN-02 | 광고 검수 상태 머신 | ad_campaigns 테이블 + AdminCampaignActions 패턴 확인 (이미 status 머신 존재) |
| ADMIN-03 | 신고 큐 운영자 처리 UI | reports 테이블 신규 생성 필요 |
| ADMIN-04 | 시스템 상태 모니터링 메뉴 | ingest_runs 테이블 + profiles/ad_campaigns COUNT 쿼리 |
| A11Y-01 | axe-core CI (critical 0건) | @axe-core/playwright 4.11.3 설치 + AxeBuilder 패턴 확인 |
| A11Y-02 | 키보드 탐색 검증 | 기존 E2E 스펙에 keyboard navigation assertion 추가 |
| A11Y-03 | 스크린리더 라벨 검증 | aria-label gap 분석 — 기존 컴포넌트 조사 필요 |

</phase_requirements>

---

## Summary

Phase 3는 V1.0 정식 출시 게이트를 통과하기 위한 4개 기능 블록으로 구성된다. 코드베이스 조사 결과 주요 인프라(ImageResponse 패턴, Server Action 패턴, admin 접근 제어 패턴, cron 패턴)는 이전 Phase에서 이미 확립되어 있어 이를 그대로 재사용한다. 단, **신고(reports) 테이블이 아직 존재하지 않아** ADMIN-03 구현 전에 마이그레이션으로 신규 생성이 필요하다. `complex_reviews.user_id`의 `ON DELETE SET NULL`은 이미 `20260430000016_reviews.sql`에서 설정되어 있으므로 D-08의 마이그레이션은 불필요하다(플래너에게 중요한 발견).

**Primary recommendation:** 기존 `opengraph-image.tsx`의 ImageResponse 패턴을 1080×1080 Route Handler로 포팅하고, auth/callback에 terms_agreed_at 리다이렉트를 삽입하며, reports 테이블 마이그레이션을 Wave 0로 선행한다.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 카드뉴스 PNG 생성 | API / Backend (Route Handler) | — | Node.js TTF 파일 로드 + ImageResponse 렌더링은 서버 사이드 필수 |
| 카드뉴스 다운로드 UI | Frontend (Client Component) | — | fetch → Blob → `<a download>` 는 브라우저 전용 |
| 동의 흐름 리다이렉트 | API / Backend (auth/callback route) | — | 서버 사이드 redirect 패턴 |
| 동의 저장 Server Action | API / Backend | Database | `terms_agreed_at` UPDATE + revalidatePath |
| 탈퇴 요청 Server Action | API / Backend | Database | `deleted_at` UPDATE |
| Hard delete cron | API / Backend (cron route) | Database | `deleteUser()` admin API — 서버 사이드 전용 |
| 어드민 페이지 접근 제어 | Frontend Server (RSC) | API / Backend | profiles.role 체크 → redirect() |
| 신고 큐 처리 Server Action | API / Backend | Database | 어드민 accept/reject → reports 테이블 UPDATE |
| 시스템 모니터링 대시보드 | Frontend Server (RSC) | Database | COUNT 쿼리 + revalidate=0, 캐시 없음 |
| axe-core 접근성 검증 | 테스트 인프라 | — | Playwright E2E 레이어 |
| 법적 페이지 콘텐츠 | Frontend (Static RSC) | — | 정적 마크다운, 서버 쿼리 없음 |

---

## Standard Stack

### Core (이미 설치됨)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next/og | Next.js 15.3.1 내장 | ImageResponse PNG 생성 | Satori 기반, TTF 폰트 지원 |
| @supabase/supabase-js | 2.105.3 | `auth.admin.deleteUser()` | 기존 admin client 패턴 경유 |
| @supabase/ssr | 0.10.2 | Server Component auth | 기존 패턴 |
| next/cache (revalidatePath) | Next.js 15.3.1 내장 | Server Action 후 캐시 무효화 | 기존 Server Action 패턴 |

[VERIFIED: package.json 직접 확인]

### 신규 설치 필요
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @axe-core/playwright | 4.11.3 | 접근성 자동 검사 CI | Playwright 공식 권장 라이브러리 |

[VERIFIED: npm view @axe-core/playwright version = 4.11.3]

**Installation:**
```bash
npm install --save-dev @axe-core/playwright
```

**Version verification (수행 완료):**
- next: 16.2.4 (registry) — 프로젝트는 ^15.3.1 사용
- @axe-core/playwright: 4.11.3 [VERIFIED]
- @supabase/supabase-js: 2.105.3 [VERIFIED]

---

## Architecture Patterns

### System Architecture Diagram

```
[어드민 /admin/cardnews]
  └─ "생성+다운로드" 버튼 클릭
       └─ Client: fetch('/api/cardnews/generate') → Blob → <a download>
            └─ [Route Handler: /api/cardnews/generate]
                 ├─ createReadonlyClient() → getRankingsByType('high_price', 5)
                 ├─ readFileSync(PretendardSubset.ttf)
                 └─ new ImageResponse(JSX, { width:1080, height:1080, fonts:[...] })
                      └─ PNG binary response

[사용자 로그인 → /auth/callback]
  └─ exchangeCodeForSession()
       ├─ profiles.terms_agreed_at IS NULL?
       │    └─ YES → redirect('/consent?next=...')
       ├─ profiles.deleted_at IS NOT NULL?
       │    └─ YES → redirect('/reactivate')
       └─ NO → redirect(next)

[/consent 페이지]
  └─ Server Action: agreeToTerms()
       └─ UPDATE profiles SET terms_agreed_at=now() WHERE id=auth.uid()
            └─ revalidatePath('/consent') → redirect(next)

[Vercel Cron 04:00 KST / /api/ingest/molit-trade]
  └─ 기존 MOLIT 처리 후 추가:
       └─ SELECT id FROM profiles WHERE deleted_at < now() - interval '30 days'
            └─ supabase.auth.admin.deleteUser(id)  ← cascade ON DELETE CASCADE → profiles 삭제

[어드민 /admin/members] (ADMIN-01)
  └─ profiles 조회: id, nickname, cafe_nickname, role, created_at, suspended_at
       └─ Server Action: suspendMember(id) / reactivateMember(id)
            └─ UPDATE profiles SET suspended_at=now()/NULL

[어드민 /admin/reports] (ADMIN-03)
  └─ reports 테이블 조회 (status='pending')
       └─ Server Action: resolveReport(id, 'accepted'/'rejected')
            └─ UPDATE reports SET status=..., resolved_by=..., resolved_at=now()

[어드민 /admin/status] (ADMIN-04)
  └─ 병렬 COUNT 쿼리:
       ├─ profiles 총 회원 수
       ├─ complexes 단지 수
       ├─ transactions 거래 수
       ├─ ad_campaigns (status='approved') 수
       ├─ ingest_runs 최근 10건
       ├─ reports (status='pending') 수
       ├─ ad_campaigns (status='pending') 수
       └─ profiles (terms_agreed_at IS NULL) 수
```

### Recommended Project Structure
```
src/
├── app/
│   ├── api/
│   │   └── cardnews/
│   │       └── generate/
│   │           └── route.ts          # ImageResponse, runtime='nodejs'
│   ├── admin/
│   │   ├── ads/page.tsx              # 기존
│   │   ├── cardnews/page.tsx         # SHARE-04: 1-click 다운로드
│   │   ├── members/page.tsx          # ADMIN-01
│   │   ├── reports/page.tsx          # ADMIN-03
│   │   └── status/page.tsx           # ADMIN-04
│   ├── consent/
│   │   └── page.tsx                  # LEGAL-01 동의 페이지
│   ├── legal/
│   │   ├── terms/page.tsx            # LEGAL-01,02
│   │   ├── privacy/page.tsx          # LEGAL-02
│   │   └── ad-policy/page.tsx        # LEGAL-03
│   └── reactivate/
│       └── page.tsx                  # 탈퇴 30일 grace 재활성화 안내
├── components/
│   └── layout/
│       └── Footer.tsx                # 법적 링크 추가 (공통 footer)
├── lib/
│   └── auth/
│       ├── consent-actions.ts        # 'use server' — agreeToTerms(), deleteAccount()
│       └── admin-actions.ts          # 'use server' — suspendMember(), resolveReport() 등
└── supabase/migrations/
    ├── 20260506000001_profiles_consent_delete.sql  # deleted_at, terms_agreed_at, suspended_at
    └── 20260506000002_reports.sql                   # reports 테이블 + RLS
```

### Pattern 1: 카드뉴스 Route Handler (ImageResponse 1080×1080)
**What:** `next/og` ImageResponse를 Route Handler에서 PNG 스트림으로 반환
**When to use:** 어드민 1-click 다운로드, 정사각형 SNS 카드뉴스
**Example:**
```typescript
// src/app/api/cardnews/generate/route.ts
// Source: 기존 src/app/complexes/[id]/opengraph-image.tsx 패턴
import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getRankingsByType } from '@/lib/data/rankings'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  // CRON_SECRET 또는 admin role 체크 필요
  const fontData = readFileSync(join(process.cwd(), 'public/fonts/PretendardSubset.ttf'))
  const supabase = createReadonlyClient()
  const rankings = await getRankingsByType(supabase, 'high_price', 5)

  const img = new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#ffffff', padding: '60px', fontFamily: 'Pretendard' }}>
        {/* 브랜드 헤더 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 48 }}>
          <span style={{ color: '#ea580c', fontSize: 28, fontWeight: 700 }}>단지온도</span>
          <span style={{ color: '#6b7280', fontSize: 20, fontWeight: 500 }}>주간 신고가 TOP5</span>
        </div>
        {/* 랭킹 CSS flex 바 차트 */}
        {rankings.map((r, i) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{ width: 28, fontSize: 18, fontWeight: 700, color: '#ea580c' }}>{i + 1}</span>
            <span style={{ flex: 1, fontSize: 18, fontWeight: 600 }}>{r.canonical_name}</span>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{Math.round(r.score / 10000)}억</span>
          </div>
        ))}
      </div>
    ),
    {
      width: 1080, height: 1080,
      fonts: [{ name: 'Pretendard', data: fontData, style: 'normal', weight: 700 }],
    }
  )

  // Content-Disposition: attachment로 다운로드 유도
  const headers = new Headers(img.headers)
  headers.set('Content-Disposition', 'attachment; filename="cardnews.png"')
  return new Response(img.body, { status: img.status, headers })
}
```
[VERIFIED: 기존 opengraph-image.tsx 코드 직접 확인]

### Pattern 2: auth/callback에 동의·탈퇴 리다이렉트 삽입
**What:** exchangeCodeForSession 성공 후 profiles 상태 체크
**When to use:** 첫 로그인 동의 흐름 + 탈퇴 grace 기간 차단
**Example:**
```typescript
// src/app/auth/callback/route.ts — 기존 코드 + 삽입
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request): Promise<never> {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) redirect('/login')

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) redirect('/login?error=auth')

  // 삽입: 로그인 후 profiles 상태 확인
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('terms_agreed_at, deleted_at')
      .eq('id', user.id)
      .single()

    if (profile?.deleted_at) {
      redirect('/reactivate')
    }
    if (!profile?.terms_agreed_at) {
      redirect(`/consent?next=${encodeURIComponent(next)}`)
    }
  }

  redirect(next)
}
```
[VERIFIED: 기존 auth/callback/route.ts 코드 직접 확인]

### Pattern 3: 동의 Server Action
**What:** `terms_agreed_at` 업데이트 Server Action
**When to use:** `/consent` 페이지 폼 submit
**Example:**
```typescript
// src/lib/auth/consent-actions.ts
'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function agreeToTerms(
  formData: FormData,
): Promise<{ error: string | null }> {
  const next = (formData.get('next') as string | null) ?? '/'
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('profiles')
    .update({ terms_agreed_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }
  redirect(next)
}

export async function deleteAccount(): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return { error: error.message }
  // 세션 종료 + 홈 리다이렉트
  await supabase.auth.signOut()
  redirect('/')
}
```
[VERIFIED: 기존 review-actions.ts / auth/actions.ts 패턴 직접 확인]

### Pattern 4: Hard Delete Cron (기존 MOLIT cron에 추가)
**What:** `deleted_at < now() - 30 days` 조건 계정 hard delete
**When to use:** Vercel Cron 일배치 04:00 KST
**Example:**
```typescript
// src/app/api/ingest/molit-trade/route.ts 에 추가 (기존 MOLIT 처리 후)
const adminClient = createSupabaseAdminClient()

// 30일 경과 탈퇴 계정 hard delete
const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString()
const { data: expiredProfiles } = await adminClient
  .from('profiles')
  .select('id')
  .not('deleted_at', 'is', null)
  .lt('deleted_at', thirtyDaysAgo)

for (const { id } of expiredProfiles ?? []) {
  const { error } = await adminClient.auth.admin.deleteUser(id)
  if (error) console.error(`deleteUser failed for ${id}:`, error.message)
  // auth.users ON DELETE CASCADE → profiles 자동 삭제
}
```
[VERIFIED: createSupabaseAdminClient() 구현 직접 확인 + Supabase admin API 알려진 패턴]
[ASSUMED: auth.users ON DELETE CASCADE → profiles 삭제 동작 — 20260430000005_users.sql `references auth.users(id) on delete cascade` 확인됨]

### Pattern 5: @axe-core/playwright 접근성 CI
**What:** Playwright E2E에 axe 분석 추가, critical 위반 0건 강제
**When to use:** A11Y-01 CI 체크
**Example:**
```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const PAGES_TO_CHECK = ['/', '/map', '/legal/terms', '/legal/privacy', '/login', '/consent']

for (const path of PAGES_TO_CHECK) {
  test(`접근성: ${path} — critical 위반 0건`, async ({ page }) => {
    await page.goto(path)
    await page.waitForLoadState('domcontentloaded')

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical, `Critical violations on ${path}: ${JSON.stringify(critical.map(v => v.id))}`).toHaveLength(0)
  })
}
```
[VERIFIED: @axe-core/playwright 4.11.3 npm registry + playwright.dev 공식 문서]

### Pattern 6: 어드민 신고 큐 Server Action
**What:** reports 테이블 신고 accept/reject 처리
**When to use:** ADMIN-03 신고 큐
**Example:**
```typescript
// src/lib/auth/admin-actions.ts
'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role)) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function resolveReport(
  reportId: string,
  action: 'accepted' | 'rejected',
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const adminUser = await verifyAdmin(supabase).catch(e => { throw e })

  const adminClient = createSupabaseAdminClient()
  const { error } = await adminClient
    .from('reports')
    .update({ status: action, resolved_by: adminUser.id, resolved_at: new Date().toISOString() })
    .eq('id', reportId)

  if (error) return { error: error.message }
  revalidatePath('/admin/reports')
  return { error: null }
}
```

### Anti-Patterns to Avoid
- **Satori에서 Recharts 사용:** Recharts는 DOM 의존성으로 Satori 렌더러에서 실행 불가. 순수 CSS flex 레이아웃으로 바 차트 구현.
- **Edge runtime에서 ImageResponse + TTF 4MB:** Edge runtime은 1MB 번들 한도. `runtime='nodejs'` 필수.
- **Client Component에서 Supabase 직접 쿼리:** CLAUDE.md Critical 규칙 위반. 반드시 Server Component 또는 API Route 경유.
- **RLS 없는 reports 테이블:** reports INSERT는 인증 사용자만, SELECT/UPDATE는 admin만.
- **`supabase.auth.admin.deleteUser()` 전 profiles 조회 생략:** auth.users 삭제 시 cascade로 profiles도 삭제되므로 profiles 직접 삭제 불필요. 단, deleteUser 전에 id 목록을 profiles에서 조회해야 함.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PNG 이미지 생성 | Canvas API 서버 사이드 구현 | `next/og` ImageResponse | Satori 기반 JSX 렌더, 폰트 서브셋 지원 |
| 접근성 검사 | 커스텀 DOM 파서 | `@axe-core/playwright` | axe-core 규칙 엔진 — 500+ 규칙 |
| 인증 상태 관리 | 직접 JWT 파싱 | `@supabase/ssr` createSupabaseServerClient() | 쿠키 기반 세션 자동 처리 |
| hard delete 스케줄 | 별도 외부 cron 서비스 | 기존 Vercel cron + 04:00 KST | 이미 동작 중인 MOLIT cron 재사용 |
| 서버 사이드 HTML→PNG | Puppeteer/playwright screenshot | `next/og` ImageResponse | 경량, 서버리스 호환 |

**Key insight:** ImageResponse는 Satori(React JSX → SVG → PNG)를 사용하므로 React 트리의 CSS 지원이 제한된다. `display: flex` 레이아웃만 사용하고, grid/absolute positioning은 제한적으로 사용해야 한다.

---

## DB Schema — 신규 마이그레이션

### 발견: complex_reviews.user_id FK ON DELETE SET NULL 이미 완료
`20260430000016_reviews.sql` 라인 4 직접 확인:
```sql
user_id uuid references public.profiles(id) on delete set null,
```
D-08의 마이그레이션은 불필요하다. 플래너는 이 마이그레이션을 태스크 목록에서 제외해야 한다.

[VERIFIED: 20260430000016_reviews.sql 직접 확인]

### Migration 1: profiles 컬럼 추가 (D-09, D-12 + ADMIN-01)
```sql
-- supabase/migrations/20260506000001_profiles_consent_delete.sql
alter table public.profiles
  add column if not exists deleted_at    timestamptz,
  add column if not exists terms_agreed_at timestamptz,
  add column if not exists suspended_at  timestamptz;  -- ADMIN-01: 계정 정지

create index profiles_deleted_at_idx
  on public.profiles(deleted_at)
  where deleted_at is not null;

create index profiles_terms_not_agreed_idx
  on public.profiles(id)
  where terms_agreed_at is null;

-- profiles owner update RLS 정책 수정:
-- 기존: role in ('user') 만 허용 → role + deleted_at + terms_agreed_at 허용
-- (role 상승 금지는 유지, deleted_at/terms_agreed_at은 Server Action에서 admin client 또는 owner update)
-- NOTE: deleted_at, terms_agreed_at 업데이트는 Server Action에서 createSupabaseServerClient()
-- 경유 owner update 가능 (RLS: auth.uid() = id 조건 충족)
-- suspended_at 업데이트는 createSupabaseAdminClient() 경유 (admin 전용)
```

### Migration 2: reports 테이블 신규 생성 (ADMIN-03)
신고 테이블이 코드베이스 어디에도 존재하지 않는다. 신규 생성 필요.

```sql
-- supabase/migrations/20260506000002_reports.sql
create type public.report_target_type as enum ('review', 'user', 'ad');
create type public.report_status as enum ('pending', 'accepted', 'rejected');

create table public.reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid references public.profiles(id) on delete set null,
  target_type    public.report_target_type not null,
  target_id      uuid not null,
  reason         text not null check (char_length(reason) between 5 and 200),
  status         public.report_status not null default 'pending',
  resolved_by    uuid references public.profiles(id) on delete set null,
  resolved_at    timestamptz,
  created_at     timestamptz not null default now()
);

create index reports_status_created_idx on public.reports(status, created_at desc)
  where status = 'pending';

alter table public.reports enable row level security;

-- 인증 사용자만 신고 생성
create policy "reports: auth insert"
  on public.reports for insert
  with check (auth.uid() is not null and reporter_id = auth.uid());

-- admin만 읽기·수정
create policy "reports: admin read"
  on public.reports for select
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  ));

create policy "reports: admin update"
  on public.reports for update
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  ));
```
[ASSUMED: report_target_type enum 구성('review', 'user', 'ad') — Phase 3 범위 내 신고 대상 추정]

---

## Common Pitfalls

### Pitfall 1: Satori CSS 제한 — Recharts/외부 차트 라이브러리 미지원
**What goes wrong:** `import Recharts from 'recharts'` 후 ImageResponse JSX에 사용하면 빌드 오류 또는 런타임 오류
**Why it happens:** Satori는 DOM API가 없는 환경에서 JSX를 SVG로 변환. Recharts는 document/window 의존
**How to avoid:** CSS flex로 바 차트 직접 구현 (`width: score/maxScore * 100%`). 기존 opengraph-image.tsx의 순수 JSX 패턴 참조
**Warning signs:** `ReferenceError: document is not defined` in ImageResponse 컨텍스트

### Pitfall 2: RLS owner update — terms_agreed_at / deleted_at 업데이트 불가
**What goes wrong:** 기존 `profiles: owner update` RLS는 `with check (auth.uid() = id and role in ('user'))` — role 필드만 체크
**Why it happens:** RLS `with check` 절이 UPDATE 후 행이 정책을 만족하는지 확인. `role in ('user')`는 다른 role 사용자에게 실패
**How to avoid:** 두 가지 옵션:
  1. Server Action에서 `createSupabaseAdminClient()` 경유로 UPDATE (RLS 우회) — 가장 간단
  2. RLS 정책을 분리 (role 체크 제거, 별도 정책) — 복잡도 증가
  **권장: Option 1** — consent-actions.ts, 탈퇴 actions에서 admin client 사용
**Warning signs:** `new row violates row-level security policy for table "profiles"` 오류

### Pitfall 3: Next.js 15 params는 Promise — `/api/cardnews/generate` searchParams
**What goes wrong:** Route Handler에서 `request.nextUrl.searchParams` 대신 `await params` 미사용
**Why it happens:** Next.js 15 App Router에서 params는 Promise로 변경됨
**How to avoid:** Route Handler는 `request: Request` → `new URL(request.url).searchParams`로 접근. Page의 params만 Promise.
**Warning signs:** TypeScript 타입 오류 또는 런타임 undefined

### Pitfall 4: supabase.auth.admin.deleteUser 실패 시 orphan profile
**What goes wrong:** auth.users 삭제 실패 시 profiles는 남고 auth.users는 반삭제 상태 가능
**Why it happens:** Supabase admin API 네트워크 오류
**How to avoid:** 각 deleteUser 호출을 개별 try-catch로 감싸고, 오류 발생 시 ingest_run error_message에 기록. 다음 cron 실행에서 재시도됨 (deleted_at < 30일 조건 유지).
**Warning signs:** profiles.deleted_at 있지만 auth.users 존재 — 매일 cron에서 재시도됨

### Pitfall 5: Footer 공통 컴포넌트 부재
**What goes wrong:** 법적 링크를 각 페이지(landing, map, profile 등)에 개별 추가하면 유지보수 어려움
**Why it happens:** 현재 `src/app/layout.tsx`에 공통 Footer 없음
**How to avoid:** `src/components/layout/Footer.tsx` 신규 생성 → `src/app/layout.tsx`의 `<body>`에 삽입
**Warning signs:** 법적 링크가 일부 페이지에만 표시됨

### Pitfall 6: @axe-core/playwright 버전 불일치
**What goes wrong:** axe-core 버전이 @axe-core/playwright 버전과 불일치 시 일부 규칙 오동작
**Why it happens:** axe-core는 peer dependency
**How to avoid:** `npm install --save-dev @axe-core/playwright` 설치 시 최신 axe-core(4.11.4)가 peer dep으로 설치됨. 명시적 axe-core 설치 불필요.
**Warning signs:** npm peer dependency warning

---

## 법적 요건 분석 (LEGAL-02, LEGAL-03)

[ASSUMED: 아래 법률 요건은 훈련 지식 기반. 실제 법무 검토 권장]

### 개인정보처리방침 (개인정보보호법 §30)
한국 개인정보보호법 제30조 기준 필수 항목:
1. 개인정보의 처리 목적
2. 처리하는 개인정보 항목
3. 개인정보의 처리 및 보유 기간
4. 개인정보의 제3자 제공 (없으면 "없음" 명시)
5. 개인정보 처리의 위탁 (Supabase, Vercel, Resend 등 열거)
6. 정보주체의 권리·의무 및 행사 방법
7. 개인정보 보호 책임자 (서비스 운영자 명시)
8. 처리방침 시행일 및 변경 이력

### 이용약관 (전자상거래법, 약관규제법)
필수 항목:
1. 서비스 목적 및 운영 주체
2. 이용 신청 및 승낙
3. 서비스 이용 제한 (게시물 규정 포함)
4. 저작권 및 지적재산권
5. 면책 조항 (부동산 정보는 참고용, 투자 판단 책임 사용자)
6. 분쟁 해결 (서울중앙지방법원 관할 또는 운영자 주소지)

### 광고 정책 (표시광고법)
필수 고지:
1. 광고 표시 방법 (지면 위치, "광고" 라벨 표시)
2. 광고주 신원 정보 제공 기준
3. 허위·과장 광고 금지 기준
4. 광고 심사 절차 및 기준 (`draft→pending→approved` 상태 머신 설명)
5. 광고 중단 및 거절 기준

---

## Runtime State Inventory

이 Phase는 신규 기능 추가로 코드/스키마 변경이 주를 이룬다. Rename/refactor 아님.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | Supabase profiles 테이블 — deleted_at, terms_agreed_at, suspended_at 컬럼 없음 | ALTER TABLE 마이그레이션 |
| Stored data | reports 테이블 없음 | CREATE TABLE 마이그레이션 |
| Stored data | complex_reviews.user_id FK ON DELETE SET NULL — 이미 완료 | 불필요 |
| Live service config | Vercel Cron `/api/ingest/molit-trade` — 04:00 KST 이미 등록 | 기존 route에 hard delete 로직 추가만 필요 |
| OS-registered state | 없음 | 없음 |
| Secrets/env vars | SUPPORT_EMAIL env var 없음 | Vercel env에 추가 필요 |
| Build artifacts | 없음 | 없음 |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | route handler, readFileSync | ✓ | v24.14.0 | — |
| @axe-core/playwright | A11Y-01 CI | ✗ (미설치) | 4.11.3 (registry) | 없음 — 설치 필수 |
| public/fonts/PretendardSubset.ttf | 카드뉴스 ImageResponse | ✓ | — | — |
| SUPPORT_EMAIL env var | LEGAL-05 | ✗ | — | 없으면 빌드 경고만, 기능은 하드코딩 fallback |

**Missing dependencies with no fallback:**
- `@axe-core/playwright` — Wave 0에서 `npm install --save-dev @axe-core/playwright` 필수

**Missing dependencies with fallback:**
- `SUPPORT_EMAIL` env — 없으면 `support@danjiondo.com` 플레이스홀더 사용 가능 (실제 배포 전 설정 필요)

---

## Validation Architecture

nyquist_validation: true (config.json 확인)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 (unit) + Playwright 1.49.0 (E2E) |
| Config file | vitest.config.ts (확인 필요) / playwright.config.ts |
| Quick run command | `npm run test` (Vitest) |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHARE-03 | `/api/cardnews/generate` → 200, Content-Type: image/png | unit (fetch mock) | `npm run test` | ❌ Wave 0 |
| SHARE-04 | 어드민 /admin/cardnews 렌더 (role 체크) | unit | `npm run test` | ❌ Wave 0 |
| LEGAL-01 | /consent 렌더 + agreeToTerms 성공 | unit | `npm run test` | ❌ Wave 0 |
| LEGAL-04 | deleteAccount → profiles.deleted_at 설정 | unit | `npm run test` | ❌ Wave 0 |
| ADMIN-01 | suspendMember Server Action 성공 | unit | `npm run test` | ❌ Wave 0 |
| ADMIN-02 | ad status 변경 Server Action (draft→pending) | unit | `npm run test` | ❌ Wave 0 |
| ADMIN-03 | resolveReport Server Action 성공 | unit | `npm run test` | ❌ Wave 0 |
| ADMIN-04 | /admin/status COUNT 쿼리 정상 | unit | `npm run test` | ❌ Wave 0 |
| A11Y-01 | axe-core critical 0건 — 주요 6개 페이지 | E2E | `npm run test:e2e` | ❌ Wave 0 |
| A11Y-02 | 키보드 Tab 순서 — 랜딩 헤더 nav | E2E | `npm run test:e2e` | ❌ Wave 0 |
| A11Y-03 | aria-label 존재 확인 — 주요 버튼/링크 | E2E | `npm run test:e2e` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test` (Vitest unit)
- **Per wave merge:** `npm run test && npm run test:e2e`
- **Phase gate:** `npm run lint && npm run build && npm run test && npm run test:e2e` 전부 green

### Wave 0 Gaps
- [ ] `src/__tests__/cardnews.test.ts` — SHARE-03, SHARE-04 커버
- [ ] `src/__tests__/consent-actions.test.ts` — LEGAL-01, LEGAL-04 커버
- [ ] `src/__tests__/admin-actions.test.ts` — ADMIN-01, ADMIN-02, ADMIN-03 커버
- [ ] `src/__tests__/admin-status.test.ts` — ADMIN-04 커버
- [ ] `e2e/accessibility.spec.ts` — A11Y-01, A11Y-02, A11Y-03 커버
- [ ] `@axe-core/playwright` 패키지 설치: `npm install --save-dev @axe-core/playwright`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (@supabase/ssr) — 기존 패턴 |
| V3 Session Management | yes | deleted_at 체크로 탈퇴 계정 세션 무효화 |
| V4 Access Control | yes | profiles.role 체크 → admin pages |
| V5 Input Validation | yes | consent 폼: checkbox 필수 체크 / 신고 reason: 5-200자 |
| V6 Cryptography | no | 암호화 직접 구현 없음 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 비어드민 사용자의 admin API 직접 호출 | Elevation of Privilege | Server Action에서 profiles.role 체크 + redirect |
| 탈퇴 계정으로 재로그인 시도 | Spoofing | auth/callback에서 deleted_at IS NOT NULL → redirect('/reactivate') |
| 카드뉴스 생성 API 무인증 호출 | Tampering | `/api/cardnews/generate`는 admin role 체크 필수 |
| 자기 자신 신고 | Tampering | reports INSERT에서 reporter_id ≠ target_id CHECK |
| terms_agreed_at 조작 | Tampering | Server Action에서 admin client 경유, 직접 클라이언트 업데이트 불가 (RLS) |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Puppeteer로 HTML→PNG 스크린샷 | next/og ImageResponse (Satori) | Next.js 13+ | 서버리스 호환, 경량 |
| `cypress-axe` | `@axe-core/playwright` | 2023+ | Playwright 네이티브 |
| 별도 consent 서비스 | Server Action + Supabase UPDATE | Next.js 13+ | 외부 의존성 없음 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | report_target_type enum: 'review', 'user', 'ad' | DB Schema Migration 2 | Phase 3 범위 내 신고 대상이 변경되면 enum 수정 필요 |
| A2 | terms_agreed_at / deleted_at UPDATE는 admin client 경유 필요 (기존 RLS owner update with check role in ('user')로 인해 'admin' role 사용자 실패 가능성) | Pitfall 2 | 실제 RLS 동작 확인 필요 — 프로젝트 Supabase 인스턴스에서 검증 후 결정 |
| A3 | 한국 법령 최소 요건 항목 (법적 페이지 콘텐츠) | 법적 요건 분석 | 법무 검토 전 "초안" 명시 필요 — 실제 서비스에서 법적 리스크 |
| A4 | Supabase `auth.users ON DELETE CASCADE` → profiles 삭제 (deleteUser 시 cascade) | Pattern 4 | 코드베이스에서 profiles FK on delete cascade 확인됨. 실제 Supabase 프로젝트에서 동작 검증 권장 |

---

## Open Questions

1. **profiles owner update RLS 정책과 terms_agreed_at/deleted_at 업데이트 호환성**
   - What we know: 기존 정책은 `with check (auth.uid() = id and role in ('user'))`. role='admin' 사용자가 자기 프로필을 수정 시 이 체크가 실패할 수 있음.
   - What's unclear: 실제 프로덕션 Supabase에서 'admin' role 사용자가 own profile update 시 통과 여부
   - Recommendation: Server Action에서 `createSupabaseAdminClient()` 경유로 UPDATE — RLS 우회, 가장 안전

2. **Footer 공통 컴포넌트 추가 범위**
   - What we know: 현재 layout.tsx에 Footer 없음. 각 페이지(landing, map, profile, admin)에 자체 header 포함.
   - What's unclear: Footer를 layout.tsx에 전역 추가 시 admin 페이지에 불필요한 footer 표시 여부
   - Recommendation: `src/app/layout.tsx`에 `Footer`를 조건부 렌더 (admin 경로 제외) 또는 non-admin layout 그룹 생성

3. **카드뉴스 접근 제어 — admin role 체크 vs CRON_SECRET**
   - What we know: `/api/cardnews/generate`는 어드민만 접근. 브라우저 fetch로 호출됨.
   - What's unclear: Bearer 토큰(CRON_SECRET)이 아닌 user session 기반 auth가 Route Handler에서 작동하는지
   - Recommendation: Route Handler에서 `createSupabaseServerClient()`로 getUser() → profiles.role 체크. CRON_SECRET은 외부 자동화용이므로 이 엔드포인트에는 사용하지 않음.

---

## Sources

### Primary (HIGH confidence)
- `src/app/complexes/[id]/opengraph-image.tsx` — ImageResponse + runtime='nodejs' + TTF 패턴 직접 확인
- `src/app/admin/ads/page.tsx` — Admin 접근 제어 패턴 직접 확인
- `src/app/auth/callback/route.ts` — auth 콜백 삽입점 직접 확인
- `src/lib/auth/review-actions.ts` — Server Action + revalidatePath 패턴 직접 확인
- `supabase/migrations/20260430000016_reviews.sql` — complex_reviews.user_id ON DELETE SET NULL 이미 완료 확인
- `supabase/migrations/20260430000005_users.sql` — profiles 스키마 직접 확인
- `supabase/migrations/20260430000007_ads.sql` — ad_status enum 상태 머신 확인
- `package.json` — 현재 의존성 버전 확인
- npm registry: @axe-core/playwright@4.11.3 [VERIFIED]
- playwright.dev/docs/accessibility-testing — AxeBuilder 공식 패턴 [CITED]

### Secondary (MEDIUM confidence)
- `supabase/migrations/20260430000009_rls.sql` — RLS 정책 패턴 직접 확인
- @axe-core/playwright npm README — AxeBuilder.withTags(), .analyze() API [CITED: npmjs.com/package/@axe-core/playwright]

### Tertiary (LOW confidence)
- 한국 개인정보보호법 제30조 요건 항목 [ASSUMED — 법무 검토 필요]
- 표시광고법 광고 정책 필수 고지 항목 [ASSUMED — 법무 검토 필요]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 기존 코드베이스 직접 확인, npm registry 버전 확인
- Architecture: HIGH — 기존 패턴(ImageResponse, Server Action, cron)의 직접 연장
- Pitfalls: HIGH — 코드베이스 직접 확인(RLS 정책, runtime 설정 등)
- 법적 페이지 콘텐츠: LOW — 법무 검토 전 ASSUMED

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (Next.js, Supabase는 빠르게 변경 — 30일)

---

## Project Constraints (from CLAUDE.md)

플래너가 모든 태스크에서 반드시 준수해야 할 제약:

1. **CRITICAL: 외부 API 호출은 `src/services/` 어댑터에서만** — 카드뉴스 데이터 조회는 `src/lib/data/rankings.ts` 경유
2. **CRITICAL: Supabase 쿼리는 Server Component 또는 API Route에서만** — 클라이언트 컴포넌트 직접 쿼리 금지
3. **CRITICAL: 모든 사용자 데이터 테이블은 RLS 정책 명시** — reports 테이블 RLS 필수 포함
4. **CRITICAL: 광고 게재 쿼리는 `now() BETWEEN starts_at AND ends_at AND status='approved'` 필수**
5. **Server Action 우선** — consent, 탈퇴, 신고 처리 모두 Server Action
6. **AI 슬롭 금지**: backdrop-blur, gradient-text, glow, 보라/인디고, gradient orb — 카드뉴스 및 어드민 UI 모두 해당
7. **커밋 전 `npm run lint && npm run build && npm run test` 통과** — 각 태스크 완료 기준
8. **TDD**: 새 기능 구현 전 테스트 먼저 작성 (CLAUDE.md CRITICAL)
9. **거래 데이터 쿼리**: `WHERE cancel_date IS NULL AND superseded_by IS NULL` 항상 포함 — 카드뉴스 랭킹 데이터에도 해당
