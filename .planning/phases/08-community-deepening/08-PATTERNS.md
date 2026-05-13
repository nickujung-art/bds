# Phase 8: 커뮤니티 심화·자동화 - Pattern Map

**Mapped:** 2026-05-12
**Files analyzed:** 14 (신규 12 + 수정 2)
**Analogs found:** 14 / 14

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/services/kakao-channel.ts` | service | request-response | `src/services/kapt.ts` | role-match |
| `src/services/daum-cafe.ts` | service | request-response | `src/services/molit.ts` | exact |
| `src/lib/data/member-tier.ts` | data | CRUD | `src/lib/data/profile.ts` | exact |
| `src/lib/data/cafe-posts.ts` | data | CRUD | `src/lib/data/reviews.ts` | exact |
| `src/lib/data/compare.ts` | data | batch | `src/lib/data/complex-detail.ts` | role-match |
| `src/lib/notifications/deliver.ts` | service (modify) | event-driven | `src/lib/notifications/deliver.ts` | self |
| `src/app/compare/page.tsx` | page | request-response | `src/app/favorites/page.tsx` | exact |
| `src/app/api/worker/cafe-ingest/route.ts` | route | batch | `src/app/api/worker/notify/route.ts` | exact |
| `src/components/reviews/TierBadge.tsx` | component | — | `src/components/reviews/GpsBadge.tsx` | exact |
| `src/components/complex/CompareTable.tsx` | component | — | `src/components/complex/FavoritesTable.tsx` | role-match |
| `src/components/complex/CompareAddButton.tsx` | component | — | `src/components/complex/FavoriteButton.tsx` | exact |
| `src/components/profile/KakaoChannelSubscribeForm.tsx` | component | request-response | `src/components/profile/PushToggle.tsx` | exact |
| `src/components/admin/AdminCardnewsCopyButton.tsx` | component | — | `src/components/admin/CardnewsDownloadButton.tsx` | exact |
| `supabase/migrations/XXX_phase8_gamification.sql` | migration | — | `supabase/migrations/20260508000004_gps_auth.sql` | exact |

---

## Pattern Assignments

---

### `src/services/kakao-channel.ts` (service, request-response)

**Analog:** `src/services/kapt.ts`

**Imports pattern** (kapt.ts lines 1-2):
```typescript
import { z } from 'zod/v4'
// 서비스 파일: 외부 API 키는 process.env에서, import 'server-only' 는 services/에서는 미사용 (lib/에만)
```

**환경변수 검증 패턴** (kapt.ts lines 21-22):
```typescript
const apiKey = process.env.SOLAPI_API_KEY
if (!apiKey) throw new Error('SOLAPI_API_KEY is not set')
// SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER, KAKAO_CHANNEL_PF_ID 동일 패턴
```

**Core pattern — SDK 래퍼** (kapt.ts lines 36-40 참조, RESEARCH.md Pattern 3):
```typescript
import { SolapiMessageService } from 'solapi'

export async function sendAlimtalk(params: {
  to:         string
  pfId:       string
  templateId: string
  variables:  Record<string, string>
}): Promise<void> {
  const service = new SolapiMessageService(
    process.env.SOLAPI_API_KEY!,
    process.env.SOLAPI_API_SECRET!,
  )
  await service.send({
    to:   params.to,
    from: process.env.SOLAPI_SENDER_NUMBER!,
    kakaoOptions: {
      pfId:       params.pfId,
      templateId: params.templateId,
      variables:  params.variables,
      disableSms: false,
    },
  })
}
```

**Error handling pattern** (molit.ts lines 98-100):
```typescript
if (!res.ok) {
  const err = Object.assign(new Error(`SOLAPI send HTTP ${res.status}`), { status: res.status })
  throw err
}
```

---

### `src/services/daum-cafe.ts` (service, request-response)

**Analog:** `src/services/molit.ts`

**Imports + 상수 선언** (molit.ts lines 1-10):
```typescript
import { z } from 'zod/v4'
import { withRetry } from '@/lib/api/retry'

const CAFE_SEARCH_URL = 'https://dapi.kakao.com/v2/search/cafe'
const DEFAULT_SIZE = 10
```

**Zod 스키마 정의** (molit.ts lines 15-32):
```typescript
const CafePostSchema = z.object({
  title:    z.string(),
  contents: z.string(),
  url:      z.string(),
  datetime: z.string(),
  cafename: z.string(),
})
export type CafePost = z.infer<typeof CafePostSchema>
```

**Core fetch 패턴** (molit.ts lines 86-118):
```typescript
export async function searchCafePosts(query: string, size = DEFAULT_SIZE): Promise<CafePost[]> {
  const apiKey = process.env.KAKAO_REST_API_KEY
  if (!apiKey) throw new Error('KAKAO_REST_API_KEY is not set')

  const url = new URL(CAFE_SEARCH_URL)
  url.searchParams.set('query', query)
  url.searchParams.set('sort', 'recency')
  url.searchParams.set('size', String(size))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${apiKey}` },
    signal:  AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Daum cafe search HTTP ${res.status}`)

  const json = (await res.json()) as {
    documents: Array<{
      title: string; contents: string; url: string;
      datetime: string; cafename: string
    }>
  }
  const items: CafePost[] = []
  for (const d of json.documents) {
    const parsed = CafePostSchema.safeParse(d)
    if (parsed.success) items.push(parsed.data)
  }
  return items
}
```

**참고:** `withRetry` 래퍼는 molit.ts line 90에서 확인. `src/lib/api/retry.ts`에 위치.

---

### `src/lib/data/member-tier.ts` (data, CRUD)

**Analog:** `src/lib/data/profile.ts`

**Imports 패턴** (profile.ts lines 1-3):
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
// import 'server-only' — lib/data/ 파일은 server-only 적용
```

**단일 필드 조회 패턴** (profile.ts lines 4-14):
```typescript
export async function getMemberTier(
  userId: string,
  supabase: SupabaseClient<Database>,
): Promise<{ member_tier: string; activity_points: number } | null> {
  const { data } = await supabase
    .from('profiles')
    .select('member_tier, activity_points')
    .eq('id', userId)
    .single()
  return data as { member_tier: string; activity_points: number } | null
}
```

**카운트 패턴** (profile.ts lines 15-22):
```typescript
export async function getActivityLogs(
  userId: string,
  supabase: SupabaseClient<Database>,
  limit = 20,
): Promise<Array<{ points: number; reason: string; created_at: string }>> {
  const { data } = await supabase
    .from('activity_logs')
    .select('points, reason, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as Array<{ points: number; reason: string; created_at: string }>
}
```

---

### `src/lib/data/cafe-posts.ts` (data, CRUD)

**Analog:** `src/lib/data/reviews.ts`

**Imports 패턴** (reviews.ts lines 1-3):
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
```

**Core 조회 패턴** (reviews.ts lines 11-23):
```typescript
export async function getCafePostsByComplex(
  complexId: string,
  supabase: SupabaseClient<Database>,
  limit = 10,
): Promise<CafePost[]> {
  const { data } = await supabase
    .from('cafe_posts')
    .select('id, title, excerpt, url, cafe_name, posted_at, confidence')
    .eq('complex_id', complexId)
    .eq('is_verified', true)        // 검수 완료된 글만
    .order('posted_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
```

**upsert 패턴** (reviews.ts 구조 기반):
```typescript
export async function upsertCafePost(
  post: {
    url: string; title: string; excerpt: string | null;
    cafe_name: string | null; posted_at: string | null;
    complex_id: string | null; confidence: number | null;
  },
  supabase: SupabaseClient<Database>,
): Promise<void> {
  const { error } = await supabase
    .from('cafe_posts')
    .upsert(post, { onConflict: 'url' })
  if (error) throw new Error(`upsertCafePost failed: ${error.message}`)
}
```

---

### `src/lib/data/compare.ts` (data, batch)

**Analog:** `src/lib/data/complex-detail.ts` + `src/app/profile/page.tsx` (Promise.all 패턴)

**Imports 패턴** (complex-detail.ts lines 1-3):
```typescript
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
```

**Promise.all 병렬 fetch 패턴** (profile.ts lines 41-46):
```typescript
// profile.ts에서 이미 사용 중인 패턴
const [favCount, reviewCount, isPushSubscribed, topics] = await Promise.all([
  getFavoritesCount(user.id, supabase),
  getReviewsCount(user.id, supabase),
  hasPushSubscription(user.id, supabase),
  getNotificationTopics(user.id, supabase),
])
```

**Core compare fetch 패턴** (complex-detail.ts lines 27-44 기반):
```typescript
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getComplexById } from '@/lib/data/complex-detail'

export async function getCompareCandidates(
  ids: string[],
  supabase: SupabaseClient,
) {
  // 서버 측 4개 제한 (nuqs 클라이언트 제한 보완)
  const validIds = ids.slice(0, 4)
  const results = await Promise.all(
    validIds.map(id => getComplexById(id, supabase))
  )
  // null 필터링 (잘못된 id 방어)
  return results.filter((c): c is NonNullable<typeof c> => c !== null)
}
```

**거래 데이터 조회 시 필수 조건** (CLAUDE.md):
```typescript
// 비교 표에서 최근 거래 표시 시 반드시 포함
.filter('cancel_date', 'is', null)
.filter('superseded_by', 'is', null)
```

---

### `src/lib/notifications/deliver.ts` (service, modify — event-driven)

**Analog:** `src/lib/notifications/deliver.ts` (자기 자신)

**기존 deliver 구조** (deliver.ts lines 49-106):
```typescript
export async function deliverPendingNotifications(
  supabase: SupabaseClient<Database>,
): Promise<{ sent: number; failed: number }> {
  // ...
  for (const n of pending) {
    try {
      // 기존: email + webpush 분기
      if (resend && email) { await sendEmail(...) }
      if (pushReady) { await sendPushToUser(...) }

      // 신규 추가 위치: kakao_channel 분기
      if (notif.type === 'kakao_channel') {
        await sendAlimtalkToUser(supabase, notif.user_id, notif.title, notif.body)
      }

      await supabase.from('notifications').update({ status: 'sent', ... })
      sent++
    } catch {
      await supabase.from('notifications').update({ status: 'failed' })
      failed++
    }
  }
}
```

**새 헬퍼 함수 추가 위치** (deliver.ts line 48 앞에 삽입):
```typescript
async function sendAlimtalkToUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  title: string,
  body: string,
): Promise<void> {
  const { data: sub } = await supabase
    .from('kakao_channel_subscriptions')
    .select('phone_number')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!sub) return  // 미구독자 스킵
  await sendAlimtalk({
    to:         sub.phone_number,
    pfId:       process.env.KAKAO_CHANNEL_PF_ID!,
    templateId: process.env.KAKAO_ALIMTALK_TEMPLATE_ID!,
    variables:  { '#{제목}': title, '#{내용}': body },
  })
}
```

---

### `src/app/compare/page.tsx` (page, request-response)

**Analog:** `src/app/favorites/page.tsx`

**Imports + metadata + revalidate 패턴** (favorites/page.tsx lines 1-12):
```typescript
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createSupabaseServerClient } from '@/lib/supabase/server'
// Phase 8 신규:
import { createSearchParamsCache, parseAsArrayOf, parseAsString } from 'nuqs/server'
import { getCompareCandidates } from '@/lib/data/compare'
import { CompareTable } from '@/components/complex/CompareTable'

export const metadata: Metadata = { title: '단지 비교 | 단지온도' }
export const revalidate = 0
```

**Auth 패턴** (favorites/page.tsx lines 23-29):
```typescript
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>
}) {
  const supabase = await createSupabaseServerClient()
  // 비교 페이지는 비로그인도 접근 가능 (공개 URL 공유 기능)
  // redirect는 필요시에만 사용
```

**nuqs 서버 캐시 패턴** (RESEARCH.md Pattern 4):
```typescript
const searchParamsCache = createSearchParamsCache({
  ids: parseAsArrayOf(parseAsString, ',').withDefault([]),
})

const { ids } = searchParamsCache.parse(await searchParams)
const validIds = ids.slice(0, 4)  // 서버 측 제한

const complexes = await getCompareCandidates(validIds, supabase)
return <CompareTable complexes={complexes} />
```

**Nav 헤더 패턴** (favorites/page.tsx lines 41-66):
```typescript
<header style={{
  height: 60, background: '#fff',
  borderBottom: '1px solid var(--line-default)',
  display: 'flex', alignItems: 'center',
  padding: '0 32px', gap: 32,
  position: 'sticky', top: 0, zIndex: 50,
}}>
  <Link href="/" className="dj-logo">...</Link>
  <nav style={{ display: 'flex', gap: 24, font: '600 14px/1 var(--font-sans)' }}>
    ...
  </nav>
</header>
```

---

### `src/app/api/worker/cafe-ingest/route.ts` (route, batch)

**Analog:** `src/app/api/worker/notify/route.ts`

**전체 구조** (notify/route.ts lines 1-20):
```typescript
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  // 인증: x-cron-secret 헤더 방식 (notify 라우트 방식)
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  try {
    // 카페 글 수집 + NLP 매칭 서비스 호출
    const { ingested, matched, queued } = await ingestCafePosts(supabase)
    return NextResponse.json({ ingested, matched, queued })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('cafe-ingest worker error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
```

**참고:** `digest/route.ts` (lines 8-10)에서 `Authorization: Bearer` 방식도 사용. 두 방식 모두 프로젝트 내 존재. `cafe-ingest`는 `x-cron-secret` 헤더 방식 사용 권장 (notify 라우트와 일관성).

---

### `src/components/reviews/TierBadge.tsx` (component, —)

**Analog:** `src/components/reviews/GpsBadge.tsx`

**전체 패턴** (GpsBadge.tsx lines 1-21):
```typescript
// GpsBadge.tsx — 서버 컴포넌트, 'use client' 없음
interface GpsBadgeProps {
  level: 0 | 1 | 2 | 3
}

const BADGE_CONFIG = {
  0: null,
  1: { label: '방문인증', className: 'badge neutral' },
  2: { label: '거주인증', className: 'badge pos' },
  3: { label: '소유자인증', className: 'badge orange' },
} as const

export function GpsBadge({ level }: GpsBadgeProps) {
  const config = BADGE_CONFIG[level]
  if (!config) return null
  return (
    <span className={config.className} aria-label={`GPS 인증 배지: ${config.label}`}>
      {config.label}
    </span>
  )
}
```

**TierBadge는 UI-SPEC 코드 스케치를 직접 사용** — GpsBadge의 구조를 따르되 인라인 style로 구현:
```typescript
// 'use client' 없음 — 서버 컴포넌트
type Tier = 'bronze' | 'silver' | 'gold'

interface TierBadgeProps {
  tier: Tier
  cafeVerified: boolean
  className?: string
}

export function TierBadge({ tier, cafeVerified }: TierBadgeProps) {
  // bronze + cafeVerified=false → null (GpsBadge의 level=0 → null 패턴과 동일)
  const badges: Array<{ emoji: string; bg: string; color: string; label: string }> = []
  if (tier === 'gold') {
    badges.push({ emoji: '👑', bg: 'var(--bg-surface-2)', color: 'var(--fg-pri)', label: '골드 등급' })
  } else if (tier === 'silver') {
    badges.push({ emoji: '🔥', bg: 'var(--bg-surface-2)', color: 'var(--fg-sec)', label: '실버 등급' })
  }
  if (cafeVerified) {
    badges.push({ emoji: '💬', bg: 'var(--bg-positive-tint)', color: 'var(--fg-positive)', label: '카페 인증' })
  }
  if (badges.length === 0) return null
  // ... (UI-SPEC 코드 스케치 그대로)
}
```

---

### `src/components/complex/CompareTable.tsx` (component, —)

**Analog:** `src/components/complex/FavoritesTable.tsx`

**테이블 컨테이너 패턴** (FavoritesTable.tsx lines 95-112):
```typescript
// 'use client' 없음 — 서버 컴포넌트 (FavoritesTable은 클라이언트이지만 CompareTable은 서버)
<div style={{
  background: '#fff',
  border: '1px solid var(--line-default)',
  borderRadius: 16,
  overflow: 'hidden',  // CompareTable은 overflow-x: auto로 변경
}}>
  <table style={{
    width: '100%',
    borderCollapse: 'collapse',
    font: '500 14px/1.4 var(--font-sans)',
  }}>
```

**thead 스타일** (FavoritesTable.tsx lines 113-125):
```typescript
<thead>
  <tr style={{
    background: 'var(--bg-surface-2)',
    font: '600 12px/1 var(--font-sans)',
    color: 'var(--fg-sec)',
  }}>
    <th style={{ textAlign: 'left', padding: '14px 20px' }}>...</th>
  </tr>
</thead>
```

**행 홀짝 배경 + 구분선 패턴** (FavoritesTable.tsx lines 128-136):
```typescript
{items.map((item, i) => (
  <tr key={item.id} style={{
    borderTop: '1px solid var(--line-subtle)',
    // CompareTable: background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-2)'
  }}>
    <td style={{ padding: '18px 20px' }}>...</td>
  </tr>
))}
```

**숫자 셀 tnum 패턴** (FavoritesTable.tsx line 177):
```typescript
<td style={{ padding: '18px 20px', textAlign: 'right' }} className="tnum">
  {value}
</td>
```

**sticky 헤더는 FavoritesTable에 없음** — UI-SPEC의 `position: sticky; top: 60px` 패턴을 직접 적용:
```typescript
<thead>
  <tr style={{ position: 'sticky', top: 60, zIndex: 10, background: 'var(--bg-surface)' }}>
```

---

### `src/components/complex/CompareAddButton.tsx` (component, — , 'use client')

**Analog:** `src/components/complex/FavoriteButton.tsx`

**'use client' + useTransition 패턴** (FavoriteButton.tsx lines 1-8):
```typescript
'use client'

import { useState, useTransition } from 'react'
import { addFavorite, removeFavorite } from '@/lib/auth/favorite-actions'
// CompareAddButton: import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'
```

**토글 상태 + 버튼 className 패턴** (FavoriteButton.tsx lines 19-49):
```typescript
export function FavoriteButton({ complexId, initialFavorited = false }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited)
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className={`btn btn-md ${favorited ? 'btn-orange' : 'btn-secondary'}`}
      style={{ gap: 6, opacity: isPending ? 0.7 : 1 }}
    >
      {favorited ? '관심단지 ✓' : '관심단지'}
    </button>
  )
}
```

**CompareAddButton의 nuqs 기반 변형:**
```typescript
'use client'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'
import Link from 'next/link'

export function CompareAddButton({ complexId, complexName }: CompareAddButtonProps) {
  const [ids, setIds] = useQueryState('ids', parseAsArrayOf(parseAsString, ',').withDefault([]))
  const isActive = ids.includes(complexId)
  const isFull   = ids.length >= 4 && !isActive

  // useTransition 대신 nuqs 동기 업데이트 — startTransition 불필요
  function toggle() {
    if (isFull) return
    setIds(prev =>
      isActive ? prev.filter(id => id !== complexId) : [...prev, complexId]
    )
  }
  // aria-pressed, disabled 패턴은 FavoriteButton과 동일
}
```

---

### `src/components/profile/KakaoChannelSubscribeForm.tsx` (component, request-response, 'use client')

**Analog:** `src/components/profile/PushToggle.tsx`

**'use client' + useState 상태 관리 패턴** (PushToggle.tsx lines 1-10):
```typescript
'use client'

import { useState, useEffect } from 'react'
import { registerPushSubscription, unregisterPushSubscription } from '@/lib/auth/push-actions'
// KakaoChannelSubscribeForm: import { useForm } from 'react-hook-form' + import { zodResolver } from '@hookform/resolvers/zod'
```

**로딩 + 에러 상태 패턴** (PushToggle.tsx lines 22-25):
```typescript
const [loading, setLoading] = useState(false)
const [error, setError]     = useState<string | null>(null)
```

**에러 표시 패턴** (PushToggle.tsx lines 120-131):
```typescript
{error && (
  <div style={{
    marginTop: 8,
    font:  '500 12px/1.4 var(--font-sans)',
    color: '#dc2626',
  }}>
    {error}
  </div>
)}
```

**인풋 + 버튼 클래스 패턴** (PushToggle.tsx + 프로젝트 전반):
```typescript
// 기존 .input 클래스 사용 (globals.css 기반)
<input className="input" type="tel" inputMode="tel" maxLength={13} />
// 제출 버튼: .btn.btn-md.btn-orange
<button type="submit" className="btn btn-md btn-orange" disabled={loading}>
  {loading ? '신청 중…' : '카카오톡 알림 신청'}
</button>
```

**성공 상태 전환 패턴** (PushToggle.tsx lines 62-64):
```typescript
setSubscribed(true)
// KakaoChannelSubscribeForm: setIsSubmitted(true) → 폼 대신 성공 메시지 렌더
```

---

### `src/components/admin/AdminCardnewsCopyButton.tsx` (component, —, 'use client')

**Analog:** `src/components/admin/CardnewsDownloadButton.tsx`

**전체 구조 참조** (CardnewsDownloadButton.tsx lines 1-54):
```typescript
'use client'
import { useState } from 'react'

export function CardnewsDownloadButton() {
  const [pending, setPending] = useState(false)
  const [err, setErr]         = useState<string | null>(null)

  async function handleDownload() {
    setPending(true)
    setErr(null)
    try {
      // ... fetch + blob + a.click()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : '다운로드 실패')
    } finally {
      setPending(false)
    }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <button
        type="button"
        className="btn btn-md btn-primary"
        onClick={handleDownload}
        disabled={pending}
        aria-label="..."
      >
        {pending ? '생성 중…' : '카드뉴스 생성 + 다운로드'}
      </button>
      {err && (
        <div role="alert" style={{ font: '500 13px/1.5 var(--font-sans)', color: '#dc2626' }}>
          {err}
        </div>
      )}
    </div>
  )
}
```

**AdminCardnewsCopyButton의 변형 패턴** — state를 union type으로 확장:
```typescript
'use client'
import { useState } from 'react'

// 4-state machine: idle → copying → success/error → idle
type CopyState = 'idle' | 'copying' | 'success' | 'error'

export function AdminCardnewsCopyButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>('idle')

  async function handleCopy() {
    setState('copying')
    try {
      await navigator.clipboard.writeText(text)
      setState('success')
    } catch {
      setState('error')
    } finally {
      setTimeout(() => setState('idle'), 2000)
    }
  }
  // aria-live="polite" (CardnewsDownloadButton은 role="alert" — 이쪽이 더 적절)
}
```

---

### `supabase/migrations/XXX_phase8_gamification.sql` (migration, —)

**Analog:** `supabase/migrations/20260508000004_gps_auth.sql`

**ALTER TABLE + 컬럼 추가 패턴** (gps_auth.sql lines 56-59):
```sql
alter table public.profiles
  add column if not exists gps_badge_level smallint not null default 0
    check (gps_badge_level between 0 and 3);
-- Phase 8: activity_points, member_tier 동일 패턴
```

**새 테이블 + 인덱스 + RLS 패턴** (gps_auth.sql lines 1-55):
```sql
create table public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  -- ... 필드 정의
  created_at timestamptz not null default now()
);

create index activity_logs_user_id_idx on public.activity_logs(user_id, created_at desc);

alter table public.activity_logs enable row level security;

create policy "activity_logs: owner read"
  on public.activity_logs for select using (auth.uid() = user_id);
-- write: service_role only (트리거에서 SECURITY DEFINER 함수로 호출)
```

**트리거 함수 패턴** (users.sql lines 23-32):
```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Phase 8 포인트 트리거 동일 구조:
  -- add_activity_points(NEW.user_id, 10, 'review')
  return new;
end;
$$;

create trigger reviews_award_points
  after insert on public.complex_reviews
  for each row execute function public.award_review_points();
```

**set_updated_at 트리거 재사용 패턴** (reviews.sql lines 16-18):
```sql
create trigger complex_reviews_updated_at
  before update on public.complex_reviews
  for each row execute function public.set_updated_at();
-- 신규 테이블에도 동일하게 적용
```

**RLS owner-all 패턴** (rls.sql lines 107-113):
```sql
alter table public.kakao_channel_subscriptions enable row level security;
create policy "kakao_channel_subscriptions: owner all"
  on public.kakao_channel_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## Shared Patterns

### 인증 (Cron Secret)
**Source:** `src/app/api/worker/notify/route.ts` lines 8-11  
**Apply to:** `src/app/api/worker/cafe-ingest/route.ts`
```typescript
const secret = request.headers.get('x-cron-secret')
if (!secret || secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 환경변수 존재 검증
**Source:** `src/services/kapt.ts` lines 21-22  
**Apply to:** `src/services/kakao-channel.ts`, `src/services/daum-cafe.ts`
```typescript
const apiKey = process.env.KAKAO_REST_API_KEY
if (!apiKey) throw new Error('KAKAO_REST_API_KEY is not set')
```

### Supabase 서버 클라이언트 생성
**Source:** `src/app/favorites/page.tsx` line 25, `src/app/api/worker/notify/route.ts` line 14  
**Apply to:** 모든 RSC 페이지, API 라우트
```typescript
// RSC 페이지:
const supabase = await createSupabaseServerClient()
// API Route (worker):
const supabase = createSupabaseAdminClient()
```

### 에러 핸들링 (서비스 레이어)
**Source:** `src/lib/data/complex-detail.ts` lines 42-43  
**Apply to:** 모든 `src/lib/data/*.ts` 파일
```typescript
if (error) throw new Error(`[functionName] failed: ${error.message}`)
```

### `import 'server-only'`
**Source:** `src/lib/notifications/deliver.ts` line 1, `src/lib/data/complex-detail.ts` line 1  
**Apply to:** `src/lib/data/member-tier.ts`, `src/lib/data/cafe-posts.ts`, `src/lib/data/compare.ts`
```typescript
import 'server-only'
// lib/data/ 및 lib/notifications/ 파일에 필수
```

### `export const revalidate = 0`
**Source:** `src/app/favorites/page.tsx` line 11, `src/app/profile/page.tsx` line 12  
**Apply to:** `src/app/compare/page.tsx`
```typescript
export const revalidate = 0
// 실시간 데이터 페이지에 필수
```

### 버튼 클래스 시스템
**Source:** `src/components/complex/FavoriteButton.tsx` line 43  
**Apply to:** `CompareAddButton`, `KakaoChannelSubscribeForm`, `AdminCardnewsCopyButton`
```typescript
// .btn + 크기(.btn-sm / .btn-md) + 변형(.btn-orange / .btn-secondary / .btn-ghost)
className={`btn btn-md ${active ? 'btn-orange' : 'btn-secondary'}`}
```

### CSS 토큰 사용 (인라인 style)
**Source:** `src/components/complex/FavoritesTable.tsx` 전반  
**Apply to:** Phase 8 모든 컴포넌트
```typescript
// 색상 토큰만 사용. 하드코딩 금지
color: 'var(--fg-pri)'
background: 'var(--bg-surface-2)'
border: '1px solid var(--line-default)'
```

### Zod 스키마 기반 입력 검증
**Source:** `src/services/molit.ts` lines 15-32 (Zod safeParse 패턴)  
**Apply to:** `src/services/daum-cafe.ts`, `KakaoChannelSubscribeForm`
```typescript
const parsed = Schema.safeParse(item)
if (parsed.success) items.push(parsed.data)
// react-hook-form에서는: zodResolver(subscribeSchema)
```

### RLS 모든 신규 테이블 필수 (CLAUDE.md CRITICAL)
**Source:** `supabase/migrations/20260430000009_rls.sql`  
**Apply to:** `XXX_phase8_gamification.sql` 내 모든 신규 테이블
```sql
alter table public.[table_name] enable row level security;
create policy "[table_name]: ..." on public.[table_name] ...;
```

---

## No Analog Found

Phase 8 파일 중 코드베이스에 밀접한 아날로그가 없는 파일 없음. 모든 파일에 기존 패턴 적용 가능.

---

## Metadata

**Analog search scope:** `src/services/`, `src/lib/data/`, `src/lib/notifications/`, `src/components/`, `src/app/`, `supabase/migrations/`
**Files scanned:** 31 (서비스 6, 데이터 함수 22, 컴포넌트 44, 페이지 25, 마이그레이션 24 중 핵심 선별)
**Pattern extraction date:** 2026-05-12
