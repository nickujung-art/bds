# Phase 4: 커뮤니티 기초 - Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 22 (신규 15 + 수정 7)
**Analogs found:** 21 / 22

---

## File Classification

| 신규/수정 파일 | Role | Data Flow | 최근접 아날로그 | 매칭 품질 |
|----------------|------|-----------|----------------|-----------|
| `src/services/molit-presale.ts` | service | request-response | `src/services/kapt.ts` | exact |
| `src/services/kapt.ts` (수정) | service | request-response | `src/services/kapt.ts` | self |
| `src/lib/auth/comment-actions.ts` | server-action | request-response | `src/lib/auth/review-actions.ts` | exact |
| `src/lib/auth/review-actions.ts` (수정) | server-action | request-response | `src/lib/auth/review-actions.ts` | self |
| `src/lib/notifications/digest.ts` | utility | batch | `src/lib/notifications/deliver.ts` | role-match |
| `src/lib/data/comments.ts` | data | CRUD | `src/lib/data/reviews.ts` | exact |
| `src/lib/data/presale.ts` | data | CRUD | `src/lib/data/reviews.ts` | role-match |
| `src/components/reviews/CommentSection.tsx` | component | request-response | `src/components/reviews/ReviewForm.tsx` | exact |
| `src/components/reviews/PresaleCard.tsx` (분류 수정) | component | transform | `src/components/reviews/ReviewList.tsx` | role-match |
| `src/components/reviews/ReviewForm.tsx` (수정) | component | request-response | `src/components/reviews/ReviewForm.tsx` | self |
| `src/components/reviews/ReviewList.tsx` (수정) | component | request-response | `src/components/reviews/ReviewList.tsx` | self |
| `src/app/presale/page.tsx` | page | request-response | `src/app/favorites/page.tsx` | role-match |
| `src/app/api/worker/digest/route.ts` | route | batch | `src/app/api/worker/notify/route.ts` | exact |
| `src/app/api/worker/cafe-code/route.ts` | route | request-response | `src/app/api/worker/notify/route.ts` | exact |
| `src/app/api/cron/daily/route.ts` | route | batch | `src/app/api/cron/rankings/route.ts` | exact |
| `src/app/admin/reports/page.tsx` (수정) | page | request-response | `src/app/admin/reports/page.tsx` | self |
| `src/app/profile/page.tsx` (수정) | page | request-response | `src/app/profile/page.tsx` | self |
| `src/app/page.tsx` (수정) | page | request-response | `src/app/page.tsx` | self |
| `supabase/migrations/20260507000003_phase4_enum.sql` | migration | — | `supabase/migrations/20260506000002_reports.sql` | role-match |
| `supabase/migrations/20260507000004_phase4_tables.sql` | migration | — | `supabase/migrations/20260430000016_reviews.sql` | role-match |
| `.github/workflows/cafe-code-weekly.yml` | config | event-driven | `.github/workflows/notify-worker.yml` | exact |
| `.github/workflows/weekly-digest.yml` | config | event-driven | `.github/workflows/rankings-cron.yml` | role-match |

---

## Pattern Assignments

### `src/services/molit-presale.ts` (service, request-response)

**아날로그:** `src/services/kapt.ts`

**Imports 패턴** (lines 1-6):
```typescript
import { z } from 'zod/v4'
```

**Core 패턴** — Zod 스키마 + fetch + 페이지네이션 (lines 8-60):
```typescript
const BASE_URL = 'https://apis.data.go.kr/1613000/AptListService3/getSigunguAptList3'

const KaptComplexSchema = z.object({
  kaptCode: z.string(),
  kaptName: z.string(),
  bjdCode:  z.string().optional(),
  as1:      z.string().optional(),
})

export async function fetchComplexList(sggCode: string): Promise<KaptComplex[]> {
  const apiKey = process.env.KAPT_API_KEY
  if (!apiKey) throw new Error('KAPT_API_KEY is not set')   // 환경변수 가드 필수

  const url = new URL(BASE_URL)
  url.searchParams.set('ServiceKey', apiKey)
  url.searchParams.set('_type', 'json')                     // JSON 응답 요청

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),                    // 타임아웃 필수
  })
  if (!res.ok) throw new Error(`K-apt API ${res.status}: ${await res.text()}`)

  const json: unknown = await res.json()
  // unknown으로 받아서 단계별 캐스팅
  const body = (json as { response?: { body?: unknown } })?.response?.body

  for (const item of items) {
    const parsed = KaptComplexSchema.safeParse(item)        // safeParse — throw 안 함
    if (parsed.success) results.push(parsed.data)
  }
}
```

**MOLIT 전용 주의 사항:**
- MOLIT API는 XML 응답 — `_type=json` 파라미터 없음. `Accept: 'application/xml'` 헤더 사용
- `dealAmount` 필드는 `"15,000"` 형식 문자열 → 파싱 시 쉼표 제거 후 `parseInt`
- `cdealType === 'Y'`이면 취소 거래 (`presale_transactions.cancel_date` 설정)
- `LAWD_CD` 파라미터: 창원(38110), 김해(38370) 5자리 법정동코드

---

### `src/services/kapt.ts` — `fetchKaptBasicInfo` 추가 (service, request-response)

**아날로그:** 기존 `src/services/kapt.ts` 내 `fetchComplexList` 패턴

**확장 패턴** — 기존 파일 하단에 추가:
```typescript
// 신규 엔드포인트 (기존 BASE_URL과 별도)
const BASIC_INFO_URL = 'http://apis.data.go.kr/1613000/AptBasisInfoServiceV3/getAphusBassInfoV3'

const KaptBasicInfoSchema = z.object({
  kaptCode:      z.string(),
  kaptName:      z.string(),
  kaptdaCnt:     z.coerce.number().optional(),   // 세대수
  kaptDongCnt:   z.coerce.number().optional(),   // 동수
  // V3 실제 응답 확인 후 필드 확정 필요 (ASSUMED)
})

export type KaptBasicInfo = z.infer<typeof KaptBasicInfoSchema>

export async function fetchKaptBasicInfo(kaptCode: string): Promise<KaptBasicInfo | null> {
  const apiKey = process.env.KAPT_API_KEY
  if (!apiKey) throw new Error('KAPT_API_KEY is not set')

  const url = new URL(BASIC_INFO_URL)
  url.searchParams.set('ServiceKey', apiKey)
  url.searchParams.set('kaptCode', kaptCode)
  url.searchParams.set('_type', 'json')

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`K-apt BasicInfo API ${res.status}`)

  const json: unknown = await res.json()
  const item = (json as { response?: { body?: { item?: unknown } } })?.response?.body?.item
  const parsed = KaptBasicInfoSchema.safeParse(item)
  return parsed.success ? parsed.data : null
}
```

---

### `src/lib/auth/comment-actions.ts` (server-action, request-response)

**아날로그:** `src/lib/auth/review-actions.ts`

**전체 파일 패턴** (lines 1-57 참조):
```typescript
'use server'                                              // 반드시 첫 줄

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface SubmitCommentInput {
  reviewId:  string
  complexId: string    // revalidatePath에 사용
  content:   string
}

export async function submitComment(
  input: SubmitCommentInput,
): Promise<{ error: string | null }> {
  const { reviewId, complexId, content } = input

  // 입력 검증 (DB CHECK 이전 레이어)
  if (content.length < 10 || content.length > 500) {
    return { error: '댓글은 10자 이상 500자 이하로 작성해주세요.' }
  }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }   // 인증 가드

  const { error } = await supabase
    .from('comments')
    .insert({ review_id: reviewId, user_id: user.id, content: content.trim() })

  if (error) return { error: error.message }
  revalidatePath(`/complexes/${complexId}`)              // ISR 캐시 무효화
  return { error: null }
}

export async function deleteComment(
  commentId: string,
  complexId: string,
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id)   // RLS 이중 방어

  if (error) return { error: error.message }
  revalidatePath(`/complexes/${complexId}`)
  return { error: null }
}
```

---

### `src/lib/auth/review-actions.ts` — `verifyGpsForReview` 추가 (server-action, request-response)

**아날로그:** 기존 `src/lib/auth/review-actions.ts` 내 `submitReview` 패턴

**GPS 검증 추가 패턴** (기존 파일 하단 추가):
```typescript
export async function verifyGpsForReview(
  reviewId:  string,
  complexId: string,
  lat:       number,
  lng:       number,
): Promise<{ gps_verified: boolean; error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { gps_verified: false, error: '로그인이 필요합니다.' }

  // supabase.rpc()로 PostGIS 검증 — 클라이언트 좌표를 절대 직접 신뢰하지 않음
  const { data: proximity } = await supabase.rpc('check_gps_proximity', {
    p_complex_id: complexId,
    p_lat:        lat,
    p_lng:        lng,
    p_distance_m: 100,
  })

  const verified = proximity === true
  if (verified) {
    await supabase
      .from('complex_reviews')
      .update({ gps_verified: true })
      .eq('id', reviewId)
      .eq('user_id', user.id)  // 본인 후기만
    revalidatePath(`/complexes/${complexId}`)
  }
  return { gps_verified: verified, error: null }
}
```

---

### `src/lib/notifications/digest.ts` (utility, batch)

**아날로그:** `src/lib/notifications/deliver.ts`

**Imports 패턴** (lines 1-5):
```typescript
import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
```

**Core 배치 패턴** (lines 49-106 참조):
```typescript
const BATCH_SIZE = 50   // deliver.ts와 동일한 배치 크기

export async function buildWeeklyDigest(
  supabase: SupabaseClient<Database>,
): Promise<{ inserted: number }> {
  // 1. favorites JOIN으로 구독자+단지 한번에 조회 (N+1 방지)
  const { data: favorites } = await supabase
    .from('favorites')
    .select('user_id, complex_id')

  if (!favorites?.length) return { inserted: 0 }

  // 2. unique complex_id 배치로 최근 거래 조회
  // 3. user별 digest 내용 빌드
  // 4. notifications INSERT (type='digest', dedupe_key=week번호)
  // deliver.ts의 status='pending' 패턴을 따름 — 5분 워커가 자동 처리
  let inserted = 0
  for (const batch of userBatches) {
    const { error } = await supabase.from('notifications').insert(batch)
    if (!error) inserted += batch.length
  }
  return { inserted }
}
```

**error handling 패턴** (deliver.ts lines 71-101):
```typescript
try {
  // 작업 수행
  sent++
} catch {
  await supabase
    .from('notifications')
    .update({ status: 'failed' })
    .eq('id', notif.id as string)
  failed++
}
```

---

### `src/lib/data/comments.ts` (data, CRUD)

**아날로그:** `src/lib/data/reviews.ts`

**전체 파일 패턴** (lines 1-37 참조):
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// DB 타입에서 직접 Row 타입 추출
export type Comment = Database['public']['Tables']['comments']['Row']

export async function getCommentsByReviewId(
  reviewId: string,
  supabase: SupabaseClient<Database>,
  limit = 20,
): Promise<Comment[]> {
  const { data } = await supabase
    .from('comments')
    .select('*')
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true })   // 댓글은 오래된 순
    .limit(limit)
  return data ?? []
}

// 후기 목록과 댓글 첫 3개를 함께 조회 (N+1 방지 JOIN 패턴)
export async function getReviewsWithComments(
  complexId: string,
  supabase: SupabaseClient<Database>,
): Promise<ReviewWithComments[]> {
  const { data } = await supabase
    .from('complex_reviews')
    .select('*, comments(id, content, created_at, user_id)')
    .eq('complex_id', complexId)
    .order('created_at', { ascending: false })
    .limit(20)
  return data ?? []
}
```

---

### `src/lib/data/presale.ts` (data, CRUD)

**아날로그:** `src/lib/data/reviews.ts`

**Core 패턴:**
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type NewListing = Database['public']['Tables']['new_listings']['Row']

export async function getActiveListings(
  supabase: SupabaseClient<Database>,
  limit = 20,
): Promise<NewListing[]> {
  const { data } = await supabase
    .from('new_listings')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

// presale_transactions도 동일 패턴:
// cancel_date IS NULL AND superseded_by IS NULL (transactions 대원칙)
export async function getPresaleTransactions(
  listingId: string,
  supabase: SupabaseClient<Database>,
): Promise<PresaleTransaction[]> {
  const { data } = await supabase
    .from('presale_transactions')
    .select('*')
    .eq('listing_id', listingId)
    .is('cancel_date', null)              // transactions 대원칙
    .is('superseded_by', null)            // transactions 대원칙
    .order('deal_date', { ascending: false })
  return data ?? []
}
```

---

### `src/components/reviews/CommentSection.tsx` (component, request-response)

**아날로그:** `src/components/reviews/ReviewForm.tsx`

**Imports + 'use client' 패턴** (lines 1-5):
```typescript
'use client'

import { useState, useTransition } from 'react'
import { submitComment } from '@/lib/auth/comment-actions'
```

**Client Component 상태+전환 패턴** (lines 13-34):
```typescript
export function CommentSection({ reviewId, complexId, initialComments }: Props) {
  const [comments, setComments]   = useState(initialComments)
  const [content, setContent]     = useState('')
  const [error, setError]         = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [showAll, setShowAll]     = useState(false)   // "더 보기" 토글

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitComment({ reviewId, complexId, content })
      if (result.error) {
        setError(result.error)
      } else {
        setContent('')
        // revalidatePath가 서버에서 처리 — 클라이언트는 낙관적 업데이트 없음
      }
    })
  }
```

**인라인 렌더 패턴** (reviews.ts 참조, D-02):
```typescript
  const visible = showAll ? comments : comments.slice(0, 3)

  return (
    <div>
      {visible.map(c => (
        <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line-subtle)' }}>
          <p style={{ font: '500 13px/1.55 var(--font-sans)', margin: 0 }}>{c.content}</p>
        </div>
      ))}
      {comments.length > 3 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-sec)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0' }}
        >
          댓글 {comments.length - 3}개 더 보기
        </button>
      )}
      {/* 댓글 작성 폼 — ReviewForm 스타일 동일 */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="댓글을 입력해주세요. (10자 이상)"
          maxLength={500}
          rows={2}
          className="input"
          style={{ font: '500 13px/1.55 var(--font-sans)', padding: '8px 10px', resize: 'vertical' }}
        />
        {error && <span style={{ font: '500 12px/1 var(--font-sans)', color: '#dc2626' }}>{error}</span>}
        <button type="submit" className="btn btn-sm btn-orange" disabled={pending} style={{ alignSelf: 'flex-end' }}>
          {pending ? '등록 중…' : '댓글 등록'}
        </button>
      </form>
    </div>
  )
}
```

---

### `src/components/presale/PresaleCard.tsx` (component, transform)

**아날로그:** `src/components/reviews/ReviewList.tsx`

**순수 렌더 컴포넌트 패턴** (ReviewList.tsx 전체 구조 참조):
```typescript
// 'use client' 없음 — 순수 Server Component 또는 공유 컴포넌트
import type { NewListing } from '@/lib/data/presale'

interface Props {
  listing: NewListing
}

export function PresaleCard({ listing }: Props) {
  return (
    <div
      style={{
        padding:      '14px 0',
        borderBottom: '1px solid var(--line-subtle)',
      }}
    >
      <div style={{ font: '700 15px/1.3 var(--font-sans)', marginBottom: 4 }}>
        {listing.name}
      </div>
      <div style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-sec)', marginBottom: 6 }}>
        {listing.region}
      </div>
      {/* 분양가 범위 */}
      <div className="tnum" style={{ font: '600 14px/1 var(--font-sans)' }}>
        {listing.price_min?.toLocaleString('ko-KR')} ~{' '}
        {listing.price_max?.toLocaleString('ko-KR')}만원
      </div>
    </div>
  )
}
```

---

### `src/components/reviews/ReviewForm.tsx` — GPS 버튼 추가 (component, request-response)

**아날로그:** 기존 `src/components/reviews/ReviewForm.tsx`

**GPS 버튼 추가 위치** — 기존 submit 버튼 행(lines 88-111) 사이에 삽입:
```typescript
// 기존 state에 추가
const [gpsState, setGpsState] = useState<'idle' | 'loading' | 'verified' | 'failed'>('idle')

// GPS 버튼 핸들러
async function handleGpsVerify() {
  if (!navigator.geolocation) { setGpsState('failed'); return }
  setGpsState('loading')
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      // lat/lng를 Server Action에 전달 — verified 플래그를 클라이언트에서 직접 설정하지 않음
      const result = await verifyGpsForReview(reviewId, complexId, pos.coords.latitude, pos.coords.longitude)
      setGpsState(result.gps_verified ? 'verified' : 'failed')
    },
    () => { setGpsState('failed') },
  )
}

// JSX — 기존 submit 버튼 왼쪽에 삽입
<button
  type="button"
  onClick={handleGpsVerify}
  disabled={gpsState === 'loading' || gpsState === 'verified'}
  style={{
    font:       '500 12px/1 var(--font-sans)',
    color:      gpsState === 'verified' ? '#16a34a' : 'var(--fg-sec)',
    background: 'none',
    border:     '1px solid var(--line-default)',
    borderRadius: 6,
    padding:    '6px 10px',
    cursor:     'pointer',
  }}
>
  {gpsState === 'loading'  ? '위치 확인 중…' :
   gpsState === 'verified' ? 'GPS 인증 완료' :
   gpsState === 'failed'   ? '인증 실패' : '현재 위치로 인증'}
</button>
```

---

### `src/components/reviews/ReviewList.tsx` — 댓글 인라인 + 카페 링크 추가 (component, request-response)

**아날로그:** 기존 `src/components/reviews/ReviewList.tsx`

**GPS 배지** (line 78-90) — 이미 존재. 수정 불필요.

**카페 링크 추가 위치** — ReviewList 컴포넌트 상단 (ReviewStats 위):
```typescript
// COMM-03: 카페 외부 링크 — 단지명으로 네이버 카페 검색
function CafeLink({ complexName }: { complexName: string }) {
  const href = `https://cafe.naver.com/ArticleSearchList.nhn?search.query=${encodeURIComponent(complexName)}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        font:           '500 12px/1 var(--font-sans)',
        color:          'var(--fg-sec)',
        textDecoration: 'none',
        display:        'inline-flex',
        alignItems:     'center',
        gap:            4,
        marginBottom:   12,
      }}
    >
      네이버 카페에서 이 단지 이야기 보기 →
    </a>
  )
}
```

**댓글 인라인 추가** — 각 리뷰 카드 `<p>` 태그(line 104-110) 이후:
```typescript
// CommentSection을 리뷰 카드 하단에 추가
<CommentSection
  reviewId={r.id}
  complexId={complexId}
  initialComments={(r.comments ?? []).slice(0, 3)}   // 첫 3개만 서버에서 전달
/>
```

---

### `src/app/presale/page.tsx` (page, request-response / ISR)

**아날로그:** `src/app/favorites/page.tsx` + `src/app/page.tsx`

**ISR 설정 패턴** (page.tsx line 11):
```typescript
export const revalidate = 3600   // 분양 데이터는 1시간 캐시 (일배치 갱신이므로)
```

**Readonly 클라이언트 패턴** (complexes/[id]/page.tsx line 4):
```typescript
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getActiveListings } from '@/lib/data/presale'

export default async function PresalePage() {
  const supabase = createReadonlyClient()   // ISR: cookies() 미호출 필수
  const listings = await getActiveListings(supabase)
  // ...
}
```

**nav 구조 패턴** (favorites/page.tsx lines 56-66):
```typescript
<nav style={{ display: 'flex', gap: 24, font: '600 14px/1 var(--font-sans)' }}>
  <Link href="/"         style={{ color: 'var(--fg-sec)', textDecoration: 'none' }}>홈</Link>
  <Link href="/map"      style={{ color: 'var(--fg-sec)', textDecoration: 'none' }}>지도</Link>
  <Link href="/presale"  style={{ color: 'var(--dj-orange)', textDecoration: 'none' }}>분양</Link>
  <Link href="/favorites" style={{ color: 'var(--fg-sec)', textDecoration: 'none' }}>관심단지</Link>
</nav>
```

---

### `src/app/api/worker/digest/route.ts` (route, batch)

**아날로그:** `src/app/api/worker/notify/route.ts`

**전체 파일 패턴** (lines 1-20):
```typescript
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { buildWeeklyDigest } from '@/lib/notifications/digest'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  // 모든 worker endpoint: x-cron-secret 헤더 검증
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()   // admin client — 서비스 롤

  const { inserted } = await buildWeeklyDigest(supabase)

  return NextResponse.json({ inserted })
}
```

---

### `src/app/api/worker/cafe-code/route.ts` (route, request-response)

**아날로그:** `src/app/api/worker/notify/route.ts`

**Core 패턴** (notify/route.ts 동일 구조):
```typescript
import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  // 이번 주 코드 이미 존재하는지 확인 (중복 방지 — week_start UNIQUE)
  const weekStart = getMonday(new Date()).toISOString().slice(0, 10)
  const { data: existing } = await supabase
    .from('cafe_join_codes')
    .select('code')
    .eq('week_start', weekStart)
    .single()

  if (existing) return NextResponse.json({ code: existing.code, skipped: true })

  // PostgreSQL 랜덤 코드 생성 → RPC or INSERT + DB 기본값 활용
  const { data, error } = await supabase
    .from('cafe_join_codes')
    .insert({ week_start: weekStart, code: generateCode() })
    .select('code')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ code: data.code })
}
```

---

### `src/app/api/cron/daily/route.ts` (route, batch)

**아날로그:** `src/app/api/cron/rankings/route.ts`

**Cron 인증 패턴 주의** — rankings는 `Authorization: Bearer` 헤더, notify-worker는 `x-cron-secret` 헤더. **일배치는 Vercel Cron에서 호출하므로 `Authorization: Bearer` 패턴 사용**:

```typescript
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { fetchPresaleTrades } from '@/services/molit-presale'
import { fetchKaptBasicInfo } from '@/services/kapt'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  // rankings/route.ts와 동일한 Bearer 검증 (Vercel Cron 패턴)
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  try {
    // 분양권전매 데이터 수집 (창원+김해)
    const trades = await fetchPresaleTrades('38110', currentMonth())
    // UPSERT (ON CONFLICT DO NOTHING) — 중복 방지
    await supabase.from('presale_transactions').upsert(trades, { onConflict: 'listing_id,deal_date,area,floor' })

    return Response.json({ ok: true, tradesInserted: trades.length })
  } catch (err) {
    console.error('daily cron failed:', err)
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    )
  }
}
```

---

### `src/app/admin/reports/page.tsx` — SLA 배지 추가 (page, request-response)

**아날로그:** 기존 `src/app/admin/reports/page.tsx`

**추가할 타입** (line 22-28 수정):
```typescript
interface ReportRow {
  id: string
  target_type: 'review' | 'user' | 'ad' | 'comment'   // 'comment' 추가
  target_id: string
  reason: string
  status: 'pending' | 'accepted' | 'rejected'
  created_at: string
}
```

**SLA 배지 유틸 함수** — 파일 상단 `formatDateTime` 다음에 추가:
```typescript
function isOverdue(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() > 24 * 60 * 60 * 1000
}
```

**테이블 헤더 수정** (line 125):
```typescript
// 기존: ['일시', '대상', '대상 ID', '사유', '상태', '액션']
// 수정: SLA 컬럼 추가
{['일시', 'SLA', '대상', '대상 ID', '사유', '상태', '액션'].map(h => (...))}

// SLA td (일시 td 바로 뒤):
<td style={{ padding: '12px 16px' }}>
  {r.status === 'pending' && isOverdue(r.created_at) ? (
    <span style={{
      display: 'inline-block', padding: '3px 8px', borderRadius: 4,
      font: '600 11px/1 var(--font-sans)', color: '#fff', background: '#dc2626',
    }}>
      24h 초과
    </span>
  ) : (
    <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
      정상
    </span>
  )}
</td>
```

---

### `src/app/profile/page.tsx` — 알림 토픽 설정 UI 추가 (page, request-response)

**아날로그:** 기존 `src/app/profile/page.tsx`

**추가 위치** — 기존 "알림 설정" 카드 (line 194-204) 하단에 새 카드 추가:
```typescript
{/* 알림 토픽 설정 — NOTIF-02 */}
<div className="card" style={{ padding: 20, marginBottom: 16 }}>
  <h3 style={{ font: '700 14px/1.4 var(--font-sans)', margin: '0 0 14px' }}>
    알림 토픽
  </h3>
  {/* TopicToggle: Client Component, Server Action 호출 */}
  <TopicToggle userId={user.id} initialTopics={topics} />
</div>
```

**데이터 fetch 패턴** (기존 Promise.all 패턴 line 39-43 확장):
```typescript
const [favCount, reviewCount, isPushSubscribed, topics] = await Promise.all([
  getFavoritesCount(user.id, supabase),
  getReviewsCount(user.id, supabase),
  hasPushSubscription(user.id, supabase),
  getNotificationTopics(user.id, supabase),   // 신규
])
```

---

### `src/app/page.tsx` — nav 분양 링크 + 분양 섹션 추가 (page, request-response)

**아날로그:** 기존 `src/app/page.tsx`

**nav 분양 링크 활성화** — 기존 `href="#"` 분양 링크를 `/presale`로 변경:
```typescript
// 기존 nav에서 href="#" 분양 링크 → href="/presale"
<Link href="/presale" style={{ color: 'var(--fg-sec)', textDecoration: 'none' }}>분양</Link>
```

**분양 섹션 추가** — 기존 섹션들 하단에 ISR 데이터 없이 링크 카드만:
```typescript
{/* 분양 섹션 — 데이터는 /presale ISR 페이지에서 처리 */}
<section style={{ marginTop: 48 }}>
  <h2 style={{ font: '700 18px/1.3 var(--font-sans)', letterSpacing: '-0.02em', marginBottom: 16 }}>
    신축·분양
  </h2>
  <Link href="/presale" className="card" style={{ display: 'block', padding: 20, textDecoration: 'none' }}>
    <div style={{ font: '600 14px/1.4 var(--font-sans)' }}>분양 정보 보기 →</div>
    <div style={{ font: '500 12px/1.4 var(--font-sans)', color: 'var(--fg-sec)', marginTop: 4 }}>
      창원·김해 신축 분양권 전매 실거래가
    </div>
  </Link>
</section>
```

---

### `.github/workflows/cafe-code-weekly.yml` (config, event-driven)

**아날로그:** `.github/workflows/notify-worker.yml`

**전체 파일 패턴** (notify-worker.yml 전체 구조):
```yaml
name: Cafe Code Weekly

on:
  schedule:
    - cron: '5 0 * * 1'  # 매주 월요일 09:05 KST (UTC 00:05)
  workflow_dispatch: {}

jobs:
  generate-code:
    name: Generate weekly cafe join code
    runs-on: ubuntu-latest
    timeout-minutes: 2      # notify-worker는 4분 — 단순 insert이므로 2분으로 충분

    steps:
      - name: Generate cafe join code
        run: |
          STATUS=$(curl -sSf -o /tmp/cafe_code_response.json -w "%{http_code}" \
            -X POST \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.SITE_URL }}/api/worker/cafe-code")

          echo "HTTP status: $STATUS"
          cat /tmp/cafe_code_response.json

          if [ "$STATUS" != "200" ]; then
            echo "Cafe code worker returned $STATUS"
            exit 1
          fi
```

---

### `.github/workflows/weekly-digest.yml` (config, event-driven)

**아날로그:** `.github/workflows/rankings-cron.yml`

**전체 파일 패턴:**
```yaml
name: Weekly Digest

on:
  schedule:
    - cron: '0 0 * * 1'  # 매주 월요일 09:00 KST (UTC 00:00)
  workflow_dispatch: {}

jobs:
  send-digest:
    name: Build & enqueue weekly digest
    runs-on: ubuntu-latest
    timeout-minutes: 10    # rankings는 3분 — 다이제스트는 구독자 수에 따라 길어질 수 있음

    steps:
      - name: Trigger digest worker
        run: |
          STATUS=$(curl -sSf -o /tmp/digest_response.json -w "%{http_code}" \
            -X POST \
            -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.SITE_URL }}/api/worker/digest")

          echo "HTTP status: $STATUS"
          cat /tmp/digest_response.json

          if [ "$STATUS" != "200" ]; then
            echo "Digest worker returned $STATUS"
            exit 1
          fi
```

---

### `supabase/migrations/20260507000003_phase4_enum.sql` (migration)

**아날로그:** `supabase/migrations/20260506000002_reports.sql`

**enum 변경 패턴** (RESEARCH.md §Pitfall 1 — 트랜잭션 분리):
```sql
-- 이 파일은 단독 실행 (ALTER TYPE은 트랜잭션 내 실행 불가)
-- Supabase 마이그레이션: 파일명 타임스탬프로 실행 순서 보장

ALTER TYPE public.report_target_type ADD VALUE IF NOT EXISTS 'comment';

-- notifications.type CHECK 제약 변경 (DROP + ADD 필요)
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('price_alert', 'comment', 'reply', 'system', 'digest'));
```

---

### `supabase/migrations/20260507000004_phase4_tables.sql` (migration)

**아날로그:** `supabase/migrations/20260430000016_reviews.sql` (RLS 패턴)

**RLS 3-정책 패턴** (RESEARCH.md §댓글 시스템 §RLS):
```sql
-- comments 테이블 RLS (complex_reviews 패턴 동일)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments: public read"
  ON public.comments FOR SELECT USING (true);

CREATE POLICY "comments: auth insert"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "comments: owner update"
  ON public.comments FOR UPDATE USING (user_id = auth.uid());

-- admin delete 포함 (complex_reviews 패턴 확장)
CREATE POLICY "comments: owner or admin delete"
  ON public.comments FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- check_gps_proximity SQL 함수 (RESEARCH.md §GPS PostGIS 검증)
CREATE OR REPLACE FUNCTION public.check_gps_proximity(
  p_complex_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_distance_m integer DEFAULT 100
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.complexes
    WHERE id = p_complex_id
      AND location IS NOT NULL
      AND ST_DWithin(location, ST_Point(p_lng, p_lat)::geography, p_distance_m)
  )
$$;
```

---

## Shared Patterns

### 1. Server Action 인증 가드
**Source:** `src/lib/auth/review-actions.ts` lines 24-26, `src/lib/auth/admin-actions.ts` lines 9-28
**Apply to:** `comment-actions.ts`, `review-actions.ts` (GPS 추가), 알림 토픽 action (신규)
```typescript
const supabase = await createSupabaseServerClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return { error: '로그인이 필요합니다.' }
```

### 2. Admin 권한 가드
**Source:** `src/lib/auth/admin-actions.ts` lines 9-28
**Apply to:** `src/app/admin/reports/page.tsx` (기존 패턴 유지)
```typescript
async function requireAdmin() {
  // createSupabaseServerClient() + getUser() + profiles.role 체크
  if (!['admin', 'superadmin'].includes(profile.role)) { ... }
  return { error: null, admin: createSupabaseAdminClient() }
}
```

### 3. Cron 엔드포인트 인증 (Worker — POST)
**Source:** `src/app/api/worker/notify/route.ts` lines 8-11
**Apply to:** `digest/route.ts`, `cafe-code/route.ts`
```typescript
const secret = request.headers.get('x-cron-secret')
if (!secret || secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### 4. Cron 엔드포인트 인증 (Vercel Cron — GET)
**Source:** `src/app/api/cron/rankings/route.ts` lines 7-10
**Apply to:** `src/app/api/cron/daily/route.ts`
```typescript
const authHeader = request.headers.get('authorization')
if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

### 5. Admin Client (Service Role)
**Source:** `src/app/api/worker/notify/route.ts` line 14, `src/app/api/cron/rankings/route.ts` line 13
**Apply to:** 모든 `/api/worker/*`, `/api/cron/*` 라우트
```typescript
const supabase = createSupabaseAdminClient()   // 서비스 롤 — RLS 우회 가능
```

### 6. ISR Readonly 클라이언트
**Source:** `src/app/complexes/[id]/page.tsx` line 4, `src/app/page.tsx`
**Apply to:** `src/app/presale/page.tsx`
```typescript
import { createReadonlyClient } from '@/lib/supabase/readonly'
export const revalidate = 3600   // ISR: cookies() 미호출 조건
const supabase = createReadonlyClient()
```

### 7. Zod 외부 API 스키마 검증
**Source:** `src/services/kapt.ts` lines 8-16, 49-51
**Apply to:** `src/services/molit-presale.ts`
```typescript
const Schema = z.object({ ... })
const parsed = Schema.safeParse(item)   // safeParse — 개별 아이템 파싱 실패 무시
if (parsed.success) results.push(parsed.data)
```

### 8. revalidatePath 캐시 무효화
**Source:** `src/lib/auth/review-actions.ts` line 36, `src/lib/auth/favorite-actions.ts` line 22
**Apply to:** `comment-actions.ts`, `review-actions.ts` (GPS), 알림 토픽 action
```typescript
revalidatePath(`/complexes/${complexId}`)   // 단지 상세 페이지 재생성
```

### 9. CSS 변수 토큰 사용
**Source:** 모든 컴포넌트 파일
**Apply to:** 모든 신규 컴포넌트
```
var(--dj-orange)       — 브랜드 강조색
var(--fg-pri)          — 본문 텍스트
var(--fg-sec)          — 보조 텍스트
var(--fg-tertiary)     — 3차 텍스트 (날짜, 카운트)
var(--line-default)    — 기본 구분선
var(--line-subtle)     — 약한 구분선
var(--bg-canvas)       — 페이지 배경
var(--font-sans)       — 기본 폰트
var(--font-mono)       — 모노 폰트 (ID 등)
```

### 10. transactions 대원칙 (presale_transactions)
**Source:** CLAUDE.md
**Apply to:** `src/lib/data/presale.ts`의 모든 쿼리
```typescript
.is('cancel_date', null)       // cancel_date IS NULL
.is('superseded_by', null)     // superseded_by IS NULL
```

---

## No Analog Found

코드베이스에 근접 아날로그가 없는 파일 (플래너는 RESEARCH.md 패턴 참조):

| 파일 | Role | Data Flow | 이유 |
|------|------|-----------|------|
| (없음) | — | — | 모든 파일에 1개 이상의 아날로그 존재 |

---

## Metadata

**아날로그 탐색 범위:**
- `src/services/` — 2개 파일 전수 검토
- `src/lib/auth/` — 7개 파일 전수 검토
- `src/lib/notifications/` — 1개 파일 검토
- `src/lib/data/` — reviews.ts, favorites.ts, profile.ts 검토
- `src/components/reviews/` — 2개 파일 전수 검토
- `src/app/admin/reports/`, `src/app/profile/`, `src/app/page.tsx` — 전수 검토
- `src/app/api/worker/notify/`, `src/app/api/cron/rankings/` — 전수 검토
- `.github/workflows/` — 2개 파일 전수 검토

**총 스캔 파일:** 23개
**Pattern extraction date:** 2026-05-07
