# Phase 2: 랭킹·랜딩·공유 — Research

**Researched:** 2026-05-06
**Domain:** PostgreSQL 랭킹 산식 / Next.js 15 ISR / @vercel/og 동적 이미지 / 카카오톡 공유 SDK / GitHub Actions 1h cron
**Confidence:** HIGH (코드베이스 직접 확인 + Context7 공식 문서 교차 검증)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RANK-01 | 지역 인기 단지 풀 정의 SQL + 일배치 갱신 | `complex_rankings` 테이블 DDL + `regions.is_active=true` sgg_code 필터 패턴 확인 |
| RANK-02 | 랭킹 4종 산식 (신고가·거래량·평당가·관심도) + 1h cron | GitHub Actions `0 * * * *` cron 패턴 확인. `notify-worker.yml` exact analog 존재 |
| RANK-03 | 랜딩 완성 — 오늘 신고가 카드 + 4종 랭킹 탭 (ISR 60s) | `createReadonlyClient()` + `revalidate = 60` 조합으로 ISR 가능 확인 |
| SHARE-01 | 단지별 동적 OG 이미지 (`@vercel/og`) | `next/og`의 `ImageResponse` + `opengraph-image.tsx` 파일 컨벤션 문서 확인. Pretendard WOFF2는 Satori가 지원 안 하므로 TTF 서브셋 필요 |
| SHARE-02 | 카카오톡·네이버 공유 버튼 + 단지 상세 공유 UX | Kakao JS SDK `window.Kakao.Share.sendDefault()` 패턴 확인. 현재 layout.tsx에 카카오 지도 SDK만 로드 중 — 공유 SDK 추가 필요 |
</phase_requirements>

---

## Summary

Phase 2는 5개 요구사항(RANK-01~03, SHARE-01~02)을 다룬다. 기술 도메인별로 세 축이 있다: (1) PostgreSQL 집계 + cron 파이프라인, (2) Next.js 15 ISR 랜딩 리팩터링, (3) `@vercel/og` + 카카오 공유 SDK.

**랭킹 파이프라인**: `complex_rankings` 전용 테이블(materialized view 아님)에 cron이 주기적으로 결과를 UPSERT하는 패턴이 적합하다. Supabase에서 materialized view는 실시간 구독·RLS 지원이 제한적이고, 리프레시 시 테이블 락 리스크가 있다. `ingest_runs` 테이블에 cron 실행 기록을 남기는 기존 패턴을 그대로 사용한다.

**ISR 랜딩**: 현재 `page.tsx`는 `revalidate = 0`(완전 동적)이다. `createReadonlyClient()`는 쿠키를 읽지 않으므로 `revalidate = 60`으로 교체하면 ISR이 즉시 작동한다. 4종 랭킹 데이터는 `complex_rankings` 테이블에서 읽기 때문에 DB 부하가 줄고 ISR 캐시 적중률이 높다.

**OG 이미지 + 공유**: `next/og`의 `ImageResponse`는 Next.js 15에 내장되어 별도 패키지 설치 불필요. 단, Satori(내부 렌더러)는 WOFF2 brotli 압축을 지원하지 않아 현재 `public/fonts/PretendardVariable.woff2`를 그대로 쓸 수 없다. TTF 서브셋을 `public/fonts/PretendardSubset.ttf`로 추가해야 한다. 카카오 공유 SDK는 현재 layout.tsx의 카카오 지도 SDK와 별개 — 지도 SDK는 `maps.sdk.js`, 공유 SDK는 `sdk.js`다.

**Primary recommendation:** `complex_rankings` 테이블 + GitHub Actions 1h cron(GET + Authorization: Bearer) + `opengraph-image.tsx` 파일 컨벤션(Route Handler 아닌 파일 컨벤션 우선) + 카카오 공유 SDK 별도 로드.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 랭킹 산식 집계 | Database (Postgres 함수/UPSERT) | API Route (cron trigger) | 집계는 DB에서, cron은 API Route가 DB 함수 호출 |
| 랭킹 데이터 읽기 | Frontend Server (RSC page.tsx) | — | createReadonlyClient()로 서버 사이드 직접 쿼리 |
| ISR 캐시 관리 | Frontend Server (Next.js) | — | revalidate=60 + Vercel Edge CDN 자동 캐시 |
| 동적 OG 이미지 생성 | Frontend Server (opengraph-image.tsx) | — | Next.js 파일 컨벤션, 빌드 시 정적 최적화 or 요청 시 생성 |
| 카카오톡 공유 | Browser / Client | — | window.Kakao.Share.sendDefault()는 클라이언트 전용 |
| 네이버 공유 | Browser / Client | — | URL 리디렉션 방식 — 클라이언트 전용 |
| cron 스케줄링 (1h) | CI/CD (GitHub Actions) | — | Vercel Hobby 1일 1회 한도 제약으로 GitHub Actions 필수 |
| cron endpoint 인증 | API / Backend | — | CRON_SECRET 헤더 검증 |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next/og (내장) | 15.3.1 (next에 포함) | 동적 OG 이미지 생성 | Next.js 13.3+ 내장. 별도 `@vercel/og` 패키지 설치 불필요 |
| @supabase/supabase-js | ^2.105.1 (기설치) | DB 집계 쿼리 | 기존 패턴 동일 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Kakao JS SDK (CDN) | 2.7.2+ | 카카오톡 공유 | SHARE-02 전용. `sdk.js` 로드 (지도 SDK와 별개) |
| Pretendard TTF subset | 수동 생성 | OG 이미지 한글 폰트 | ImageResponse는 WOFF2 불가, TTF 필요 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| opengraph-image.tsx (파일 컨벤션) | /api/og/complex/route.tsx | 파일 컨벤션이 Next.js가 자동으로 `<meta og:image>` 태그 주입. Route Handler는 generateMetadata에서 수동 images 배열 추가 필요. 파일 컨벤션이 더 단순 |
| complex_rankings 테이블 (cron UPSERT) | PostgreSQL Materialized View | Materialized View는 REFRESH 시 AccessExclusiveLock 발생 가능, RLS 적용 어려움, Supabase 실시간 구독 미지원. UPSERT 테이블이 Supabase 생태계에 적합 |
| GitHub Actions 1h cron | Vercel Cron | Vercel Hobby는 1일 1회 한도. 기존 notify-worker.yml 패턴 exact analog |

**Installation:**
```bash
# 새 패키지 설치 불필요.
# Pretendard TTF 서브셋 파일은 scripts/generate-pretendard-subset.js 또는
# 수동으로 https://github.com/orioncactus/pretendard/releases 에서 다운로드
```

**Version verification:**
```bash
# next/og는 next 패키지에 내장 — 별도 설치 없음
npm view next version  # → 16.2.4 (레지스트리 최신). 프로젝트는 ^15.3.1 사용
# next 15.3.1에서 next/og ImageResponse 지원 확인됨 [VERIFIED: Context7 /vercel/next.js]
```

---

## Architecture Patterns

### System Architecture Diagram

```
[GitHub Actions 1h cron]
      |  GET /api/cron/rankings
      |  Authorization: Bearer {CRON_SECRET}
      v
[src/app/api/cron/rankings/route.ts]
      |  computeRankings() 호출
      v
[src/lib/data/rankings.ts]
      |  4종 집계 SQL 실행
      |  UPSERT → complex_rankings 테이블
      v
[Supabase Postgres]
  complex_rankings (rank_type, complex_id, score, rank)
  transactions (cancel_date IS NULL, superseded_by IS NULL)
  favorites (관심도 집계용)

[사용자 브라우저]
      |  GET /  (ISR 60s)
      v
[src/app/page.tsx]  ←── Vercel Edge CDN 캐시 (최대 60s stale)
      |  createReadonlyClient()
      |  Promise.all([신고가, 랭킹4종])
      v
[Supabase Postgres]  (complex_rankings 직접 읽기)

[사용자 → 단지 상세 링크 공유]
      |
      v
[카카오톡 / 네이버]
      |  og:image URL 크롤링
      v
[src/app/complexes/[id]/opengraph-image.tsx]
      |  params.id → Supabase 쿼리
      |  Pretendard TTF 서브셋 로드
      v
[ImageResponse (Satori 렌더링) → PNG 반환]

[사용자 → ShareButton 클릭]
      |  'use client'
      v
[window.Kakao.Share.sendDefault()] 또는 [navigator.share()] 또는 [clipboard.writeText()]
```

### Recommended Project Structure
```
src/
├── app/
│   ├── page.tsx                          # revalidate=60 으로 변경 + 4종 랭킹 데이터 페칭
│   ├── complexes/[id]/
│   │   ├── page.tsx                      # generateMetadata 유지 (og:image는 파일 컨벤션)
│   │   └── opengraph-image.tsx           # 신규 — 단지별 동적 OG 이미지
│   └── api/
│       └── cron/
│           └── rankings/
│               └── route.ts             # 신규 — 1h 랭킹 집계 cron endpoint
├── components/
│   ├── home/
│   │   ├── RankingTabs.tsx              # 신규 — 'use client', 탭 전환 로컬 상태
│   │   └── HighRecordCard.tsx           # 신규 — RSC, page.tsx에서 추출
│   └── complex/
│       └── ShareButton.tsx              # 신규 — 'use client', 카카오+네이버+클립보드
├── lib/
│   └── data/
│       └── rankings.ts                  # 신규 — getRankingsByType, computeRankings
└── supabase/
    └── migrations/
        ├── YYYYMMDD_complex_rankings.sql        # 신규 테이블 DDL
        └── YYYYMMDD_complex_rankings_rls.sql    # RLS: public read only
.github/
└── workflows/
    └── rankings-cron.yml               # 신규 — 1h cron (notify-worker.yml analog)
```

### Pattern 1: complex_rankings 테이블 DDL + UPSERT 패턴
**What:** 랭킹 결과를 cron이 주기적으로 UPSERT하는 전용 테이블
**When to use:** 1h 갱신 주기, Supabase RLS 필요, 실시간 구독 고려 시
**Example:**
```sql
-- Source: 코드베이스 패턴 (20260430000013_complex_detail_functions.sql 참조)
create table public.complex_rankings (
  id           uuid primary key default gen_random_uuid(),
  complex_id   uuid not null references public.complexes(id) on delete cascade,
  rank_type    text not null
                 check (rank_type in ('high_price', 'volume', 'price_per_pyeong', 'interest')),
  score        numeric not null,
  rank         integer not null,
  window_days  integer not null default 30,  -- 집계 기간 (일)
  computed_at  timestamptz not null default now(),
  unique(rank_type, complex_id, window_days)
);

-- RLS: 별도 migration 파일로 분리 (기존 패턴)
alter table public.complex_rankings enable row level security;
create policy "complex_rankings: public read"
  on public.complex_rankings for select using (true);

-- cron UPSERT 패턴 (rankings.ts에서 호출)
-- on conflict (rank_type, complex_id, window_days) do update set score=..., rank=..., computed_at=now()
```

### Pattern 2: 4종 랭킹 산식 SQL
**What:** 신고가·거래량·평당가·관심도 각각의 집계 쿼리
**When to use:** computeRankings() 함수 내부, `createSupabaseAdminClient()` 사용

```sql
-- Source: 코드베이스 패턴 분석 [VERIFIED: transactions 스키마 직접 확인]

-- 1. 신고가 (high_price): 30일 내 단지별 최고 거래가
SELECT
  complex_id,
  MAX(price) AS score
FROM transactions
WHERE
  deal_type = 'sale'
  AND deal_date >= CURRENT_DATE - INTERVAL '30 days'
  AND cancel_date IS NULL
  AND superseded_by IS NULL
  AND sgg_code IN ('48121','48123','48125','48127','48129','48250')
  AND complex_id IS NOT NULL
GROUP BY complex_id
ORDER BY score DESC
LIMIT 100;

-- 2. 거래량 (volume): 30일 내 단지별 거래 건수
SELECT
  complex_id,
  COUNT(*) AS score
FROM transactions
WHERE
  deal_type = 'sale'
  AND deal_date >= CURRENT_DATE - INTERVAL '30 days'
  AND cancel_date IS NULL
  AND superseded_by IS NULL
  AND sgg_code IN ('48121','48123','48125','48127','48129','48250')
  AND complex_id IS NOT NULL
GROUP BY complex_id
ORDER BY score DESC
LIMIT 100;

-- 3. 평당가 (price_per_pyeong): 30일 내 단지별 평균 평당가
--    평당가 = price / (area_m2 / 3.3058)
SELECT
  complex_id,
  ROUND(AVG(price / (area_m2 / 3.3058))) AS score
FROM transactions
WHERE
  deal_type = 'sale'
  AND deal_date >= CURRENT_DATE - INTERVAL '30 days'
  AND cancel_date IS NULL
  AND superseded_by IS NULL
  AND area_m2 > 0
  AND sgg_code IN ('48121','48123','48125','48127','48129','48250')
  AND complex_id IS NOT NULL
GROUP BY complex_id
HAVING COUNT(*) >= 1  -- 최소 1건 이상
ORDER BY score DESC
LIMIT 100;

-- 4. 관심도 (interest): 즐겨찾기 수
SELECT
  complex_id,
  COUNT(*) AS score
FROM favorites
WHERE complex_id IN (
  SELECT id FROM complexes
  WHERE sgg_code IN ('48121','48123','48125','48127','48129','48250')
)
GROUP BY complex_id
ORDER BY score DESC
LIMIT 100;
```

### Pattern 3: ISR 60s (랜딩 페이지)
**What:** `createReadonlyClient()`로 쿠키 없이 DB 읽기 → ISR 작동
**When to use:** 인증 불필요한 페이지의 데이터 페칭

```typescript
// Source: Context7 /vercel/next.js ISR docs [VERIFIED]
// src/app/page.tsx 수정
export const revalidate = 60  // 0 → 60 변경

export default async function HomePage() {
  const supabase = createReadonlyClient()  // 쿠키 미사용 → ISR 안전

  const [highRecords, rankHighPrice, rankVolume, rankPricePerPyeong, rankInterest] =
    await Promise.all([
      getRecentHighRecords(supabase, 4),
      getRankingsByType(supabase, 'high_price', 10),
      getRankingsByType(supabase, 'volume', 10),
      getRankingsByType(supabase, 'price_per_pyeong', 10),
      getRankingsByType(supabase, 'interest', 10),
    ])
  // ...
}
```

**ISR 작동 조건 체크리스트:**
- `createReadonlyClient()` 사용 → cookies() 미호출 → ISR 가능 [VERIFIED: 코드베이스 직접 확인]
- `headers()` 미호출 → 추가 동적 전환 없음
- `revalidate = 60` 설정 → 최대 60초 stale 허용

### Pattern 4: opengraph-image.tsx 파일 컨벤션
**What:** `src/app/complexes/[id]/opengraph-image.tsx`를 생성하면 Next.js가 자동으로 `<meta property="og:image">` 태그를 주입
**When to use:** 동적 라우트 단지별 OG 이미지 생성

```typescript
// Source: Context7 /vercel/next.js opengraph-image docs [VERIFIED]
// src/app/complexes/[id]/opengraph-image.tsx

import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getComplexById } from '@/lib/data/complex-detail'

export const alt = '단지온도 아파트 실거래가'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: Promise<{ id: string }>
}

export default async function Image({ params }: Props) {
  const { id } = await params

  // 한글 폰트 로드 — TTF 필요 (WOFF2 불가)
  const fontData = await readFile(
    join(process.cwd(), 'public/fonts/PretendardSubset.ttf')
  )

  const supabase = createReadonlyClient()
  const complex = await getComplexById(id, supabase)

  const name = complex?.canonical_name ?? '단지온도'
  const location = [complex?.si, complex?.gu, complex?.dong]
    .filter(Boolean)
    .join(' ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          padding: '60px 72px',
          fontFamily: 'Pretendard',
        }}
      >
        {/* 브랜드 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 48 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#ea580c' }}>단지온도</span>
        </div>
        {/* 단지명 */}
        <div style={{ fontSize: 64, fontWeight: 700, color: '#111', letterSpacing: '-2px', lineHeight: 1.2 }}>
          {name}
        </div>
        {/* 위치 */}
        <div style={{ fontSize: 24, color: '#666', marginTop: 16 }}>
          {location}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Pretendard', data: fontData, style: 'normal', weight: 700 },
      ],
    }
  )
}
```

**주의사항:**
- `export const revalidate` 미설정 시 기본값: 외부 데이터 사용 시 동적. `revalidate = 86400` 추가 권장 (단지 상세와 동일)
- `params`는 Promise — `await params` 필수 (Next.js 15 breaking change) [VERIFIED: Context7]
- 단지 상세 `generateMetadata`에서 `openGraph.images` 배열 수동 추가 불필요. 파일 컨벤션이 자동 처리

### Pattern 5: Kakao Share SDK
**What:** `window.Kakao.Share.sendDefault()` — 커스텀 버튼에서 카카오톡 공유
**When to use:** `'use client'` 컴포넌트에서 사용자 클릭 이벤트 처리

```typescript
// Source: Kakao Developers 공식 문서 + WebFetch 확인 [CITED: developers.kakao.com]
// src/components/complex/ShareButton.tsx
'use client'

interface Props {
  complexId: string
  complexName: string
  location: string
  price?: number    // 만원 단위
}

// Kakao Share SDK 타입 선언 (별도 .d.ts 또는 인라인)
declare global {
  interface Window {
    Kakao: {
      isInitialized: () => boolean
      init: (key: string) => void
      Share: {
        sendDefault: (options: KakaoShareOptions) => void
      }
    }
  }
}

interface KakaoShareOptions {
  objectType: 'feed'
  content: {
    title: string
    description: string
    imageUrl: string
    link: { mobileWebUrl: string; webUrl: string }
  }
  buttons: Array<{
    title: string
    link: { mobileWebUrl: string; webUrl: string }
  }>
}

export function ShareButton({ complexId, complexName, location, price }: Props) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://danjiondo.kr'
  const complexUrl = `${siteUrl}/complexes/${complexId}?utm_source=kakao&utm_medium=share`
  const ogImageUrl = `${siteUrl}/complexes/${complexId}/opengraph-image`

  const handleKakaoShare = () => {
    if (typeof window === 'undefined' || !window.Kakao) return

    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '')
    }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: complexName,
        description: `${location} · ${price ? formatPrice(price) : '실거래가 확인'}`,
        imageUrl: ogImageUrl,
        link: { mobileWebUrl: complexUrl, webUrl: complexUrl },
      },
      buttons: [{ title: '실거래가 보기', link: { mobileWebUrl: complexUrl, webUrl: complexUrl } }],
    })
  }

  const handleNaverShare = () => {
    const encoded = encodeURIComponent(complexUrl)
    const title = encodeURIComponent(complexName)
    window.open(`https://share.naver.com/web/shareView?url=${encoded}&title=${title}`, '_blank')
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(complexUrl)
    // 복사 완료 피드백 (인라인 상태 또는 간단한 토스트)
  }

  // UI: ShareIcon 버튼 + 공유 옵션 드롭다운
  // ...
}
```

**Kakao SDK 초기화 방법 — layout.tsx 수정 없음, 컴포넌트 내 지연 초기화:**
- 현재 `layout.tsx`의 카카오 지도 SDK: `//dapi.kakao.com/v2/maps/sdk.js`
- 카카오 공유 SDK: `//t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js` (별개 URL)
- `ShareButton.tsx`에서 첫 클릭 시 동적 스크립트 로드 + 초기화 → layout.tsx 수정 최소화

**대안: Script 컴포넌트로 전역 로드 (선택)**
```typescript
// layout.tsx에 추가 (선택적)
<Script
  src="//t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
  strategy="lazyOnload"
  crossOrigin="anonymous"
/>
```

### Pattern 6: GitHub Actions 1h 랭킹 cron
**What:** `notify-worker.yml` exact analog — 1h 주기, GET, Authorization 헤더
**When to use:** Vercel Hobby 1일 1회 제약을 우회

```yaml
# Source: 코드베이스 .github/workflows/notify-worker.yml 직접 참조 [VERIFIED]
# .github/workflows/rankings-cron.yml

name: Rankings Cron

on:
  schedule:
    # 매 시간 정각 실행 (UTC)
    - cron: '0 * * * *'
  workflow_dispatch: {}

jobs:
  compute-rankings:
    name: Compute & store rankings
    runs-on: ubuntu-latest
    timeout-minutes: 3

    steps:
      - name: Call rankings cron endpoint
        run: |
          STATUS=$(curl -sSf -o /tmp/rankings_response.json -w "%{http_code}" \
            -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "${{ secrets.SITE_URL }}/api/cron/rankings")

          echo "HTTP status: $STATUS"
          cat /tmp/rankings_response.json

          if [ "$STATUS" != "200" ]; then
            echo "Rankings cron returned $STATUS"
            exit 1
          fi
```

**GitHub Actions 무료 사용량 분석:**
- 1h 주기 × 24h × 30일 = 720회/월 × ~30s = 360분/월
- 기존 notify-worker (5분 주기): 8,640회 × ~10s ≈ 1,440분/월
- 합산 ≈ 1,800분/월. GitHub 무료 티어 2,000분/월 한도 내 (≈ 90% 사용)
- 주의: notify-worker와 합산 시 여유가 줄어듦. 랭킹 cron을 30초 이내 완료하도록 설계

### Anti-Patterns to Avoid
- **Materialized View로 랭킹 관리:** REFRESH 시 AccessExclusiveLock, RLS 적용 어려움, Supabase Realtime 미지원. `complex_rankings` 테이블 + UPSERT 패턴 사용
- **WOFF2 폰트를 ImageResponse에 전달:** Satori는 brotli 압축 지원 안 함. 반드시 TTF/OTF 사용
- **카카오 공유 SDK를 지도 SDK와 혼동:** 두 SDK는 URL이 다름. 지도 SDK는 `maps.sdk.js`, 공유 SDK는 `kakao.min.js` 또는 `sdk.js`
- **opengraph-image.tsx에서 auth 쿠키 읽기:** ISR 깨짐. `createReadonlyClient()` 사용
- **랭킹 탭을 RSC로 구현:** 탭 전환 시 상태가 필요하므로 `'use client'` 컴포넌트 필수. 데이터는 props로 서버에서 전달
- **단지 상세 generateMetadata에서 `openGraph.images` 수동 추가:** `opengraph-image.tsx` 파일 컨벤션 사용 시 자동으로 주입됨. 중복 추가 금지
- **랜딩 page.tsx에서 cookies() 호출:** revalidate=60 ISR 깨짐. `createReadonlyClient()` 사용 유지 필수

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OG 이미지 생성 | canvas/puppeteer 기반 이미지 렌더러 | `next/og`의 `ImageResponse` | Next.js 내장, Edge Runtime 지원, CSS-in-JS 서브셋으로 정렬 자동 |
| 카카오톡 공유 딥링크 | 직접 URL 조합 | `window.Kakao.Share.sendDefault()` | 앱/웹 자동 판별, 미리보기 카드 생성, Kakao 공식 API |
| ISR 캐시 무효화 | 수동 캐시 키 관리 | `revalidate = 60` 세그먼트 설정 | Next.js가 Vercel CDN과 자동 연동 |
| 한글 폰트 렌더링 | 직접 글리프 처리 | Pretendard TTF subset → `ImageResponse fonts` | Satori가 TTF 파싱+렌더링 처리 |

**Key insight:** `ImageResponse`는 Satori 엔진으로 JSX를 PNG로 변환한다. CSS 모든 속성이 지원되지 않음 — `flexbox`는 지원, `grid` 미지원. `display: 'flex'`로 레이아웃 설계 필수.

---

## Common Pitfalls

### Pitfall 1: Pretendard WOFF2 → ImageResponse에서 한글 미렌더링
**What goes wrong:** `public/fonts/PretendardVariable.woff2`를 `fonts.data`에 전달해도 Satori가 WOFF2 brotli를 디코딩하지 못해 한글이 네모(□)로 렌더링됨
**Why it happens:** Satori는 TTF/OTF만 지원. WOFF2는 brotli 압축 사용
**How to avoid:** `PretendardVariable-400.ttf` (또는 서브셋 TTF) 파일을 `public/fonts/`에 추가. Pretendard GitHub releases에서 TTF 다운로드
**Warning signs:** OG 이미지에서 한글이 모두 □ 또는 빈 공간

### Pitfall 2: ISR + auth 혼용 시 revalidate 무시
**What goes wrong:** `revalidate = 60` 설정 후에도 매 요청마다 새로 렌더링됨
**Why it happens:** `cookies()` 또는 `headers()` 호출이 있으면 Next.js가 자동으로 동적 렌더링으로 전환
**How to avoid:** `createReadonlyClient()` 유지 (현재 코드베이스가 이미 이 패턴). `UserMenu` 컴포넌트는 `Suspense`로 래핑되어 있어 ISR에 영향 없음
**Warning signs:** Vercel Functions 탭에서 모든 요청이 SSR로 찍힘

### Pitfall 3: 랭킹 cron이 ingest_runs에 기록되지 않음
**What goes wrong:** 랭킹 cron 실행 여부를 추적할 수 없음 (성공 기준 4 위반)
**Why it happens:** `ingest_runs` 기록 로직을 추가하지 않음
**How to avoid:** `computeRankings()` 함수에서 실행 시작/완료를 `ingest_runs`에 기록. `source_id = 'rankings'`를 `data_sources` 테이블에 추가
**Warning signs:** `/api/cron/rankings` 응답 body에 `ingest_runs.id` 없음

### Pitfall 4: 카카오 공유 SDK 초기화 중복
**What goes wrong:** `window.Kakao.init()` 중복 호출 시 SDK 오류
**Why it happens:** `isInitialized()` 체크 없이 init() 호출
**How to avoid:** 항상 `if (!window.Kakao.isInitialized()) window.Kakao.init(KEY)` 패턴
**Warning signs:** 콘솔에 `Kakao is already initialized` 오류

### Pitfall 5: 관심도 랭킹의 sgg_code 필터 누락
**What goes wrong:** 타 지역 단지의 favorites 수가 창원·김해 단지보다 높아 랭킹 오염
**Why it happens:** `favorites` 테이블에 sgg_code 컬럼 없음 — `complexes` JOIN 필요
**How to avoid:** `favorites` JOIN `complexes WHERE sgg_code IN (...)` 구조 사용
**Warning signs:** 랭킹 결과에 창원·김해 외 지역 단지명 등장

### Pitfall 6: opengraph-image.tsx의 params가 동기 처리
**What goes wrong:** TypeScript 오류 또는 잘못된 id 추출
**Why it happens:** Next.js 15에서 `params`가 `Promise<{id: string}>` — 직접 접근 불가
**How to avoid:** `const { id } = await params` 필수 [VERIFIED: Context7 문서]
**Warning signs:** `params.id` TypeScript 오류 또는 undefined 반환

---

## Code Examples

### rankings.ts — computeRankings (핵심 함수)
```typescript
// Source: 코드베이스 homepage.ts 패턴 + transactions 스키마 분석 [VERIFIED]
// src/lib/data/rankings.ts

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type RankType = 'high_price' | 'volume' | 'price_per_pyeong' | 'interest'

export interface RankingRow {
  complex_id: string
  rank_type: RankType
  score: number
  rank: number
  window_days: number
}

export interface ComplexRankingResult {
  id: string
  canonical_name: string
  si: string | null
  gu: string | null
  score: number
  rank: number
}

const ACTIVE_SGG_CODES = ['48121', '48123', '48125', '48127', '48129', '48250']
const WINDOW_DAYS = 30

// cron에서 호출 — admin 클라이언트 사용
export async function computeRankings(
  supabase: SupabaseClient<Database>,
): Promise<{ type: RankType; upserted: number }[]> {
  // 각 산식별로 집계 후 UPSERT
  // 상세 구현은 PLAN.md에서 작성
}

// page.tsx에서 호출 — readonly 클라이언트 사용
export async function getRankingsByType(
  supabase: SupabaseClient<Database>,
  rankType: RankType,
  limit = 10,
): Promise<ComplexRankingResult[]> {
  const { data, error } = await supabase
    .from('complex_rankings')
    .select(`
      score, rank,
      complexes!inner (id, canonical_name, si, gu)
    `)
    .eq('rank_type', rankType)
    .eq('window_days', WINDOW_DAYS)
    .order('rank', { ascending: true })
    .limit(limit)

  if (error) throw new Error(`getRankingsByType failed: ${error.message}`)

  const results: ComplexRankingResult[] = []
  for (const row of data ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = row as any
    const c = Array.isArray(r.complexes) ? r.complexes[0] : r.complexes
    if (!c) continue
    results.push({
      id: c.id as string,
      canonical_name: c.canonical_name as string,
      si: c.si as string | null,
      gu: c.gu as string | null,
      score: r.score as number,
      rank: r.rank as number,
    })
  }
  return results
}
```

### rankings cron endpoint
```typescript
// Source: 코드베이스 src/app/api/ingest/molit-trade/route.ts 패턴 [VERIFIED]
// src/app/api/cron/rankings/route.ts

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { computeRankings } from '@/lib/data/rankings'

export const runtime = 'nodejs'

export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  const results = await computeRankings(supabase)

  return Response.json({ ok: true, results, computedAt: new Date().toISOString() })
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@vercel/og` 별도 패키지 설치 | `next/og`에서 직접 import (`ImageResponse`) | Next.js 13.3+ | 패키지 설치 불필요. `import { ImageResponse } from 'next/og'` |
| `getStaticProps`의 `revalidate` | App Router `export const revalidate = N` | Next.js 13+ | 파일 상단에 export 상수로 설정 |
| `params`를 직접 객체로 접근 | `params`가 Promise, `await` 필수 | Next.js 15 | `const { id } = await params` |
| Kakao.Link.sendDefault | Kakao.Share.sendDefault | Kakao SDK 2.x | `Kakao.Link` → `Kakao.Share` 네임스페이스 변경 |

**Deprecated/outdated:**
- `Kakao.Link.sendDefault`: 구 SDK API. 현재는 `Kakao.Share.sendDefault` 사용
- `@vercel/og` 직접 설치: Next.js 13.3+에서는 `next/og`로 내장됨

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 창원·김해 활성 sgg_code는 `['48121','48123','48125','48127','48129','48250']` 6개 | 랭킹 산식 SQL | 코드베이스에서 직접 확인 못 함. `regions` 테이블에서 런타임 동적 조회가 더 안전할 수 있음 |
| A2 | `PretendardVariable.woff2`의 TTF 버전이 Pretendard GitHub releases에서 제공됨 | 폰트 로드 패턴 | TTF 버전이 없으면 별도 변환 도구(fonttools 등) 필요 |
| A3 | `Kakao.Share.sendDefault`가 OG 이미지 URL을 직접 받아 처리함 | 카카오 공유 SDK | 카카오가 URL 크롤링으로 OG 태그 읽으므로, 직접 imageUrl 전달이 필요할 수도 있음 (둘 다 지원) |
| A4 | GitHub Actions 무료 티어가 프로젝트에 사용 가능한 상태 | Rankings cron | 이미 notify-worker.yml이 동작 중이므로 가능성 높음 |

---

## Open Questions

1. **sgg_code 동적 vs 하드코딩**
   - What we know: `regions` 테이블에 `is_active=true` 필드 존재. 현재 코드는 하드코딩 패턴 혼재
   - What's unclear: `computeRankings`에서 `regions` 테이블을 동적 조회할지, 상수로 고정할지
   - Recommendation: `regions` 테이블에서 동적 조회 (`WHERE is_active = true`). 확장성 확보

2. **rankings cron이 GitHub Actions 무료 한도를 초과할 리스크**
   - What we know: notify-worker(1,440분/월) + rankings-cron(360분/월) ≈ 1,800분/월. 한도 2,000분
   - What's unclear: 실제 실행 시간이 예측보다 길 경우 초과 가능
   - Recommendation: `timeout-minutes: 3` 명시 + cron 완료 시간 Sentry/로그 추적

3. **Pretendard TTF 라이센스 및 서브셋 여부**
   - What we know: Pretendard는 SIL OFL 라이센스 (서브셋 허용). 풀 TTF는 ~4MB
   - What's unclear: Vercel Edge Function 또는 Node.js runtime에서 4MB TTF 로드 성능
   - Recommendation: opengraph-image.tsx를 Edge runtime이 아닌 Node.js runtime으로 명시 (`export const runtime = 'nodejs'`). Node.js는 4MB 폰트도 처리 가능

4. **SHARE-02: 네이버 공유 방식**
   - What we know: 네이버는 공식 공유 SDK 없음. URL 리디렉션 방식 (`share.naver.com`)
   - What's unclear: 모바일 네이버 앱과의 딥링크 연동
   - Recommendation: URL 방식(`window.open`)으로 구현. 앱 딥링크는 SHARE-02 범위 초과

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `next/og` (ImageResponse) | SHARE-01 | ✓ | next 15.3.1 내장 | — |
| Pretendard TTF 파일 | SHARE-01 (OG 이미지 한글) | ✗ | — | Noto Sans KR TTF (Google Fonts 다운로드) |
| Kakao JS SDK (공유) | SHARE-02 | ✗ (CDN에서 로드 필요) | 2.7.2 | URL 공유만 제공 |
| GitHub Actions (1h cron) | RANK-02 | ✓ | — | — |
| `CRON_SECRET` GitHub Secret | RANK-02 (rankings cron) | ✓ (기존 notify-worker에서 사용 중) | — | — |
| `SITE_URL` GitHub Secret | RANK-02 | ✓ (기존 notify-worker에서 사용 중) | — | — |

**Missing dependencies with no fallback:**
- Pretendard TTF 파일: `public/fonts/PretendardSubset.ttf` 또는 `PretendardVariable.ttf` — SHARE-01 Wave 0에서 파일 추가 필요

**Missing dependencies with fallback:**
- Kakao JS SDK: CDN 미로드 시 `navigator.share` (Web Share API) → URL 복사 폴백 구현

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 (happy-dom) |
| Config file | `vitest.config.ts` (확인됨) |
| Quick run command | `npm run test -- --reporter=verbose src/__tests__/rankings.test.ts` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RANK-01 | `complex_rankings` 테이블에 각 rank_type별 상위 N개 레코드가 UPSERT됨 | integration | `npm run test -- src/__tests__/rankings.test.ts` | ❌ Wave 0 |
| RANK-02 | `computeRankings()`가 4종 랭킹 산식을 올바르게 계산하고 ingest_runs에 기록 | integration | `npm run test -- src/__tests__/rankings.test.ts` | ❌ Wave 0 |
| RANK-03 | `getRankingsByType()`가 rank_type별로 올바른 순서의 결과를 반환 | unit | `npm run test -- src/__tests__/rankings.test.ts` | ❌ Wave 0 |
| RANK-03 | ISR: `revalidate = 60` 설정 후 page.tsx가 `createReadonlyClient()` 유지 | smoke (lint/build) | `npm run build` | 기존 파일 수정 |
| SHARE-01 | `opengraph-image.tsx`가 단지명과 위치를 포함한 PNG를 반환 | smoke | Playwright screenshot test | ❌ Wave 0 |
| SHARE-02 | ShareButton이 `window.Kakao` 없을 때 navigator.share 또는 clipboard 폴백 호출 | unit | `npm run test -- src/__tests__/share-button.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- src/__tests__/rankings.test.ts`
- **Per wave merge:** `npm run test && npm run lint`
- **Phase gate:** `npm run lint && npm run build && npm run test` 전체 통과

### Wave 0 Gaps
- [ ] `src/__tests__/rankings.test.ts` — RANK-01, RANK-02, RANK-03 커버. `ads.test.ts` 패턴 참조
- [ ] `src/__tests__/share-button.test.ts` — SHARE-02 ShareButton 폴백 로직 커버
- [ ] `public/fonts/PretendardSubset.ttf` (또는 `PretendardVariable.ttf`) — Wave 0에서 파일 추가
- [ ] `data_sources` 테이블에 `id='rankings'` 행 추가 (seed 또는 migration)

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | 아니오 | — |
| V3 Session Management | 아니오 | — |
| V4 Access Control | 예 (cron endpoint) | `CRON_SECRET` Bearer 헤더 검증 (기존 패턴) |
| V5 Input Validation | 예 (OG 이미지 `id` 파라미터) | 유효하지 않은 UUID → 404 반환 |
| V6 Cryptography | 아니오 | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| cron endpoint 무단 호출 | Spoofing | `Authorization: Bearer {CRON_SECRET}` 헤더 검증 |
| OG 이미지 id 조작으로 SSRF 시도 | Tampering | `getComplexById()` 내부 UUID 검증 + Not Found 반환. 외부 URL 미사용 |
| 랭킹 조작 (favorites 어뷰징) | Tampering | SHARE-02 범위 외. 관심도 집계는 단순 COUNT — 개인화 랭킹 아님 |

---

## Project Constraints (from CLAUDE.md)

다음 지시사항은 CLAUDE.md에서 추출한 필수 준수 사항이다:

- **CRITICAL:** 모든 외부 API 호출은 `src/services/` 어댑터에서만. `computeRankings()`는 DB만 접근하므로 해당 없음
- **CRITICAL:** Supabase 쿼리는 서버 컴포넌트 또는 API Route에서만. `RankingTabs.tsx`('use client')는 DB 직접 쿼리 금지 — 서버에서 데이터를 props로 전달
- **CRITICAL:** 거래 쿼리 `WHERE cancel_date IS NULL AND superseded_by IS NULL` 항상 포함
- **CRITICAL:** `complexes` 테이블이 Golden Record. 랭킹 집계 시 단지 참조는 항상 `complexes.id` (UUID)로
- **CRITICAL:** RLS 정책은 `supabase/migrations/`에 별도 파일로 명시
- **CRITICAL:** `createSupabaseAdminClient()` 단일 경유. `computeRankings()`에서 admin 클라이언트 사용 시 이 팩토리만 사용
- **AI 슬롭 금지 (UI):** OG 이미지 디자인에서 `backdrop-blur`, gradient text, glow 애니메이션, 보라/인디고 색상, gradient orb 금지
- **Server Action 우선:** 공유 버튼은 mutation이 아닌 이벤트이므로 Server Action 불필요. `'use client'` 컴포넌트에서 직접 처리
- **TDD:** rankings.test.ts를 구현 전에 먼저 작성

---

## Sources

### Primary (HIGH confidence)
- Context7 `/vercel/next.js` — ISR revalidate, opengraph-image.tsx 파일 컨벤션, ImageResponse 생성자, params Promise
- 코드베이스 직접 확인 — `supabase/migrations/*.sql` 스키마, `src/lib/data/homepage.ts`, `.github/workflows/notify-worker.yml`, `src/app/page.tsx`, `package.json`

### Secondary (MEDIUM confidence)
- [Next.js 공식 문서 — opengraph-image 파일 컨벤션](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image) — 직접 WebFetch 확인
- [DEV Community — Custom Fonts with @vercel/og](https://dev.to/apicrud/using-custom-fonts-vercel-open-graph-og-image-generation-29co) — 한국어 폰트 로드 방법

### Tertiary (LOW confidence)
- WebSearch: Kakao SDK sendDefault 패턴 — 공식 Kakao Developers 문서 접근 실패 (리디렉션). 커뮤니티 블로그 다수 교차 확인으로 MEDIUM 수준으로 상향
- WebSearch: NotoSansKR subset 사이즈 (~479KB WOFF) — Pretendard TTF 크기는 직접 확인 못함 [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — next/og 내장 확인, 기존 패키지 목록 직접 확인
- Architecture: HIGH — 코드베이스 직접 분석, 기존 cron 패턴 exact analog 확인
- Pitfalls: HIGH — WOFF2 불가는 Satori 공식 제한, params Promise는 Next.js 15 문서 확인
- Security: HIGH — 기존 CRON_SECRET 패턴 동일 적용

**Research date:** 2026-05-06
**Valid until:** 2026-06-06 (Next.js 15 stable — 30일 유효. Kakao SDK URL은 버전 고정 권장)
