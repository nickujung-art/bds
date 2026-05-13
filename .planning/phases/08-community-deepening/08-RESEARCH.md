# Phase 8: 커뮤니티 심화·자동화 - Research

**Researched:** 2026-05-12
**Domain:** 게이미피케이션, 카카오톡 채널 알림, NLP 단지 매칭, 즐겨찾기 비교 표, 카페 자동 발행
**Confidence:** MEDIUM (카카오 채널/카페 API는 공식 문서 직접 확인, 게이미피케이션 DB 스키마는 프로젝트 패턴 기반)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DIFF-01 | 게이미피케이션 마크 (👑🔥💬) + 회원 등급 기반 UI | activity_points + member_tier 스키마 설계, 후기/댓글에 등급 마크 렌더 패턴 |
| DIFF-02 | 카페 글 NLP 단지 매칭 (정확도 ≥ 85%) + 단지 페이지 연동 | Naver Search API (cafe 엔드포인트) + Gemini NER + 기존 matchComplex() 파이프라인 재사용 |
| DIFF-04 | 카카오톡 채널 알리미 (웹 푸시 거부 대안) | SOLAPI SDK v6 (alimtalk) + 기존 notifications 테이블 + GitHub Actions 워커 확장 |
| DIFF-05 | 회원 등급 시스템 + 우선 알림 혜택 | member_tier 컬럼 + 트리거 자동 갱신 + 알림 우선순위 로직 |
| DIFF-06 | 즐겨찾기 단지 2~4개 비교 표 | nuqs 2.8.9 URL state + Promise.all 병렬 fetch + 기존 getComplexById + FavoritesTable 패턴 |
| OPS-02 | 카카오 카페 매니저 OAuth 카드뉴스 자동 발행 (법무 승인 후) | Naver 카페 글쓰기 API 미공개 확인 → 대안 조사 결과 포함 |
</phase_requirements>

---

## Summary

Phase 8은 V2.0의 최종 단계로, 커뮤니티 참여를 심화시키는 6개 요구사항을 구현한다. 기술적으로는 세 개의 독립적인 도메인으로 분류된다: (1) 게이미피케이션(DIFF-01, DIFF-05) — DB 스키마 변경 + 트리거 + UI, (2) 외부 채널 연동(DIFF-02, DIFF-04, OPS-02) — 카카오 API 레이어, (3) 비교 UX(DIFF-06) — URL state + 병렬 데이터 fetching.

**가장 큰 리스크: OPS-02.** 다음(Daum) 카페는 글쓰기 API를 공개하지 않는다. [VERIFIED: 카카오 개발자 문서 직접 확인] 검색(read-only) API만 존재한다. OPS-02는 법무 승인 조건부이자 API 부재 조건부이므로, 플래그가 달린 어드민 수동 플로우로 대체하는 것이 현실적이다.

**DIFF-04(카카오톡 채널 알림):** 카카오 직접 API가 아닌 SOLAPI 같은 공식 딜러사를 경유해야 한다. 비즈니스 채널 심사(3~5 영업일) + 알림톡 템플릿 사전 승인(1~3 영업일)이 필요하므로 플래닝 시 선행 작업으로 분리해야 한다.

**Primary recommendation:** Wave 0에서 마이그레이션(member_tier, cafe_posts, kakao_channel_id 컬럼)을 먼저 적용하고, Wave 1에서 DIFF-01/05/06을 병렬 실행한다. DIFF-02/DIFF-04는 외부 API 승인 타임라인이 있으므로 Wave 2로 배치한다. OPS-02는 scope를 "어드민 복사 버튼 + 카페 수동 붙여넣기 가이드"로 축소하여 법무 승인을 기다린다.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 활동 포인트 계산 (DIFF-01, DIFF-05) | DB (Postgres 트리거) | API Route | 포인트는 데이터 변경 시점에 원자적으로 갱신 — 클라이언트 신뢰 불가 |
| 회원 등급 마크 UI (DIFF-01) | Frontend Server (RSC) | — | 등급은 profiles 테이블에서 read, 렌더는 서버 컴포넌트 |
| Naver 카페 검색 (DIFF-02) | API / Backend (cron) | — | REST API key는 서버 전용 — KAKAO_REST_API_KEY 이미 존재 |
| NLP 단지 매칭 (DIFF-02) | API / Backend (cron) | — | Gemini API key는 서버 전용 |
| 카카오톡 채널 발송 (DIFF-04) | API / Backend (GitHub Actions worker) | — | SOLAPI API key 서버 전용, 기존 notify-worker 패턴 확장 |
| 비교 표 URL state (DIFF-06) | Browser / Client | Frontend Server | nuqs parseAsArrayOf → 클라이언트 UI, 초기 데이터는 RSC |
| 비교 데이터 fetch (DIFF-06) | Frontend Server (RSC) | — | Promise.all([getComplexById, ...]) 서버에서 병렬 |
| 카드뉴스 발행 (OPS-02) | API / Backend (admin) | — | 어드민 전용 Server Action |

---

## Standard Stack

### Core (추가 패키지)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| solapi | 6.0.1 | 카카오 알림톡 발송 (DIFF-04) | 카카오 공식 딜러사 SDK, TypeScript 100%, MIT, HMAC 인증 내장 [VERIFIED: npm registry] |
| nuqs | 2.8.9 | 비교 모드 URL state 관리 (DIFF-06) | Next.js App Router 공식 지원, 6kB gzipped, parseAsArrayOf 제공 [VERIFIED: npm registry] |

### Supporting (기존 스택 활용)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @google/generative-ai | 0.24.1 | Gemini NLP (DIFF-02) 단지명 추출 | 이미 설치됨 — 추가 비용 없음 |
| @supabase/supabase-js | 2.105.1 | 게이미피케이션 DB 갱신 | 기존 패턴 동일 |
| recharts | 3.8.1 | 비교 표 시각화 보조 (DIFF-06) | 이미 설치됨 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| solapi | coolsms SDK | CoolSMS도 동일 기능, solapi가 문서/타입 더 풍부 |
| nuqs | 직접 useSearchParams + router.push | boilerplate 증가, 타입 안전성 낮음 |
| Gemini NER (DIFF-02) | 자체 regex + pg_trgm | 정확도 ≥ 85% 목표에 regex만으로 불충분, Gemini 이미 설치됨 |

**Installation:**
```bash
npm install solapi nuqs
```

**Version verification:** [VERIFIED: npm registry 2026-05-12] — solapi@6.0.1, nuqs@2.8.9

---

## Architecture Patterns

### System Architecture Diagram

```
[카페 글 수집 cron (GitHub Actions)]
    → Naver Search API /v2/search/cafe
    → Gemini Flash (NER: 단지명 추출)
    → matchComplex() [기존 3축 파이프라인]
    → cafe_posts 테이블 upsert
    → complex_id 연결

[알림톡 발송 (GitHub Actions notify-worker 확장)]
    → notifications 테이블 (type: 'kakao_channel' 추가)
    → kakao_channel_subscriptions 테이블 조회
    → SOLAPI SDK → 카카오톡 채널 알림톡

[비교 표 (브라우저 → RSC)]
    → nuqs URL: /compare?ids=uuid1,uuid2,uuid3
    → RSC: Promise.all(ids.map(id => getComplexById(id)))
    → CompareTable 렌더

[게이미피케이션 (DB 레이어)]
    → complex_reviews INSERT 트리거 → activity_points += 10
    → comments INSERT 트리거 → activity_points += 3
    → member_tier 자동 갱신 함수 호출
    → ReviewList/ProfilePage에서 tier 마크 렌더
```

### Recommended Project Structure
```
src/
├── services/
│   ├── kakao-channel.ts      # SOLAPI alimtalk 어댑터 (DIFF-04)
│   └── naver-cafe.ts          # Naver Search cafe API 어댑터 (DIFF-02)
├── lib/
│   ├── data/
│   │   ├── member-tier.ts    # 등급 조회/갱신 (DIFF-01, DIFF-05)
│   │   ├── cafe-posts.ts     # cafe_posts 테이블 조회 (DIFF-02)
│   │   └── compare.ts        # 2-4개 단지 병렬 fetch (DIFF-06)
│   └── notifications/
│       └── deliver.ts        # 알림톡 채널 분기 추가 (DIFF-04)
├── app/
│   ├── compare/
│   │   └── page.tsx          # /compare?ids=... RSC (DIFF-06)
│   └── api/
│       └── worker/
│           └── cafe-ingest/
│               └── route.ts  # 카페 글 수집 엔드포인트 (DIFF-02)
└── components/
    ├── reviews/
    │   └── TierBadge.tsx     # 👑🔥💬 마크 (DIFF-01)
    └── complex/
        └── CompareTable.tsx  # 비교 표 (DIFF-06)
```

### Pattern 1: 게이미피케이션 DB 트리거 방식

**What:** 사용자 활동(후기 작성, 댓글 작성, GPS 인증)에서 포인트 자동 적립
**When to use:** 포인트 계산을 애플리케이션 레이어에 두면 레이스 컨디션 및 조작 위험. DB 트리거가 원자적.

```sql
-- Source: 프로젝트 기존 set_updated_at 트리거 패턴 준수
CREATE OR REPLACE FUNCTION public.add_activity_points(
  p_user_id uuid,
  p_points  integer,
  p_reason  text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.activity_logs (user_id, points, reason)
    VALUES (p_user_id, p_points, p_reason);
  UPDATE public.profiles
    SET activity_points = activity_points + p_points,
        member_tier = CASE
          WHEN activity_points + p_points >= 200 THEN 'gold'
          WHEN activity_points + p_points >= 50  THEN 'silver'
          ELSE 'bronze'
        END
    WHERE id = p_user_id;
END;
$$;

-- 후기 작성 트리거
CREATE TRIGGER reviews_award_points
  AFTER INSERT ON public.complex_reviews
  FOR EACH ROW EXECUTE FUNCTION public.award_review_points();
```

### Pattern 2: Naver 카페 검색 + Gemini NER 파이프라인

**What:** 카페 검색 결과 → Gemini로 단지명 추출 → 기존 matchComplex() 연결
**When to use:** 정확도 ≥ 85% 목표는 단순 regex로 달성 불가. Gemini Flash는 이미 프로젝트에 설치됨.

```typescript
// Source: src/app/api/admin/ad-copy-review/route.ts의 Gemini 패턴 참조
// src/services/naver-cafe.ts
const CAFE_SEARCH_URL = 'https://dapi.kakao.com/v2/search/cafe'

export interface CafePost {
  title:     string
  contents:  string
  url:       string
  datetime:  string
  cafeName:  string
}

export async function searchCafePosts(
  query: string,
  size = 10,
): Promise<CafePost[]> {
  const url = new URL(CAFE_SEARCH_URL)
  url.searchParams.set('query', query)
  url.searchParams.set('sort', 'recency')
  url.searchParams.set('size', String(size))

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`Naver cafe search HTTP ${res.status}`)

  const json = (await res.json()) as {
    documents: Array<{
      title: string; contents: string; url: string;
      datetime: string; cafename: string
    }>
  }
  return json.documents.map(d => ({
    title:    d.title,
    contents: d.contents,
    url:      d.url,
    datetime: d.datetime,
    cafeName: d.cafename,
  }))
}
```

```typescript
// Gemini NER: 단지명 추출
// Source: src/app/api/chat/complex/route.ts의 GoogleGenerativeAI 패턴
async function extractComplexNames(text: string): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: `한국 부동산 텍스트에서 아파트 단지명만 추출하세요. 응답은 반드시 JSON: {"complexes": ["단지명1", "단지명2"]}. 단지명이 없으면 빈 배열.`,
  })
  const prompt = `다음 텍스트에서 아파트 단지명을 추출하세요:\n[텍스트]\n${text.slice(0, 500)}\n[텍스트 끝]`
  const result = await model.generateContent(prompt)
  const raw = result.response.text().replace(/```json\n?|```/g, '').trim()
  const parsed = JSON.parse(raw) as { complexes: string[] }
  return parsed.complexes ?? []
}
```

### Pattern 3: SOLAPI 알림톡 발송

**What:** 기존 deliverPendingNotifications()에 카카오톡 채널 분기 추가
**When to use:** 웹 푸시를 거부한 사용자에게 대안 채널 제공

```typescript
// Source: SOLAPI 공식 문서 패턴 [CITED: solapi.com/guides/kakao-ata-guide]
// src/services/kakao-channel.ts
import { SolapiMessageService } from 'solapi'

export async function sendAlimtalk(params: {
  to: string        // 수신자 전화번호 (010-XXXX-XXXX)
  pfId: string      // 카카오 채널 ID
  templateId: string
  variables: Record<string, string>
}): Promise<void> {
  const service = new SolapiMessageService(
    process.env.SOLAPI_API_KEY!,
    process.env.SOLAPI_API_SECRET!,
  )
  await service.send({
    to:           params.to,
    from:         process.env.SOLAPI_SENDER_NUMBER!,
    kakaoOptions: {
      pfId:       params.pfId,
      templateId: params.templateId,
      variables:  params.variables,
    },
  })
}
```

### Pattern 4: 비교 표 URL state + 병렬 fetch

**What:** nuqs parseAsArrayOf로 URL에 2~4개 단지 ID 저장, RSC에서 Promise.all로 병렬 fetch
**When to use:** 공유 가능한 URL, 새로고침 시 상태 유지 필요

```typescript
// Source: nuqs 공식 문서 [CITED: nuqs.dev]
// app/compare/page.tsx (RSC)
import { createSearchParamsCache, parseAsArrayOf, parseAsString } from 'nuqs/server'

const searchParamsCache = createSearchParamsCache({
  ids: parseAsArrayOf(parseAsString).withDefault([]),
})

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[]>>
}) {
  const { ids } = searchParamsCache.parse(await searchParams)
  const validIds = ids.slice(0, 4)  // 최대 4개 제한

  const supabase = createReadonlyClient()
  const complexes = await Promise.all(
    validIds.map(id => getComplexById(id, supabase))
  )
  const found = complexes.filter(Boolean)

  return <CompareTable complexes={found} />
}
```

```typescript
// 클라이언트 CompareSelector: nuqs useQueryState
// 'use client'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'

export function CompareSelector() {
  const [ids, setIds] = useQueryState(
    'ids',
    parseAsArrayOf(parseAsString).withDefault([]),
  )

  function toggleComplex(complexId: string) {
    setIds(prev =>
      prev.includes(complexId)
        ? prev.filter(id => id !== complexId)
        : prev.length < 4 ? [...prev, complexId] : prev
    )
  }
  // ...
}
```

### Anti-Patterns to Avoid

- **클라이언트에서 포인트 계산:** `activity_points`를 클라이언트 Server Action에서 UPDATE하면 레이스 컨디션 발생. 반드시 DB 트리거 경유.
- **카카오톡 알림 직접 발신:** 카카오 공식 API는 비즈니스 채널 심사 + 비즈 앱 전환 필요. SOLAPI 같은 공식 딜러사를 경유해야 한다.
- **단지명 단독 매칭:** CLAUDE.md 엄격 규칙. 카페 글에서 추출한 단지명으로 매칭 시에도 `matchComplex()` 파이프라인 경유 필수 (sgg_code + 좌표 없으면 admin_code axis만 사용하고 confidence 0.85 캡).
- **Naver 카페 글쓰기 API 직접 호출:** 해당 API는 공개되지 않았다. [VERIFIED: kakao developers docs 확인]
- **SOLAPI 클라이언트 사이드 직접 호출:** API key 노출 위험. 반드시 src/services/kakao-channel.ts 어댑터를 통해 서버에서만 호출.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL에 배열 파라미터 저장 | 직접 URLSearchParams 조작 | nuqs parseAsArrayOf | 타입 안전성, SSR hydration 불일치 방지, 6kB |
| 카카오톡 메시지 발송 | 카카오 BizMessage API 직접 HMAC 구현 | solapi SDK | HMAC_SHA256 인증 내장, 재시도 로직 포함 |
| 한국어 단지명 NER | 직접 regex | Gemini Flash NER | 불규칙 표기 변형(한자, 영문 혼용, 숫자 변형) 처리 |
| 포인트 동시성 제어 | SELECT + UPDATE 쌍 | Postgres 트리거 + atomic UPDATE | 동시 다중 요청 시 race condition 방지 |

**Key insight:** 카카오톡 채널 알림은 직접 카카오 API를 쓰는 것이 아니라 "카카오톡 채널" 기능과 "비즈메시지(알림톡)"를 혼동하지 않는 것이 핵심이다. 알림톡은 공식 딜러사(SOLAPI, CoolSMS 등) 경유 필수이다.

---

## Common Pitfalls

### Pitfall 1: 카카오 채널 API와 알림톡 API 혼동

**What goes wrong:** `developers.kakao.com/docs/latest/ko/kakaotalk-channel`의 채널 API(친구 추가/관리)와 비즈메시지 알림톡 발송 API를 같은 것으로 오해.
**Why it happens:** 둘 다 "카카오톡 채널"이라는 명칭이 들어가서 혼동.
**How to avoid:**
- 알림톡 발송: SOLAPI/CoolSMS 같은 공식 딜러사 SDK 경유
- 채널 관리(추가·차단 상태 조회): `developers.kakao.com` 채널 API (사용 사례 다름)
- 이 Phase에서는 SOLAPI 경유 알림톡만 구현
**Warning signs:** `developers.kakao.com`의 채널 API 문서에 메시지 발송 엔드포인트가 없음.

### Pitfall 2: 알림톡 템플릿 사전 승인 누락

**What goes wrong:** 코드는 완성됐는데 실제 발송 시 "미승인 템플릿" 오류 발생.
**Why it happens:** 알림톡은 카카오가 템플릿을 사전 심사(1~3 영업일)해야 발송 가능. [CITED: solapi.com/guides/kakao-ata-guide]
**How to avoid:** Wave 0 작업에 "SOLAPI 계정 생성 + 비즈니스 채널 연결 + 알림톡 템플릿 등록" 체크리스트 포함. 코딩보다 선행.
**Warning signs:** 개발 환경에서 SOLAPI 테스트 발송 시 400/403 응답.

### Pitfall 3: Naver 카페 글쓰기 API 존재 가정

**What goes wrong:** OPS-02를 구현하려 했더니 카페에 글을 자동으로 쓰는 공개 API가 없음.
**Why it happens:** 네이버 카페는 글쓰기 API 제공, 다음 카페는 검색(read-only)만 제공. [VERIFIED: kakao developers docs]
**How to avoid:** OPS-02 scope를 "어드민에서 카드뉴스 복사 → 카페 수동 붙여넣기 가이드" + 법무 승인 후 재검토로 변경.
**Warning signs:** 카카오 개발자 문서 `/v2/search/cafe` 외에 POST 엔드포인트 없음.

### Pitfall 4: member_tier 갱신 타이밍 불일치

**What goes wrong:** 후기를 작성한 직후 프로필 페이지에 가면 아직 이전 등급이 표시됨.
**Why it happens:** `revalidate = 0` 없는 RSC 캐시, 또는 포인트 갱신이 비동기.
**How to avoid:** DB 트리거에서 `member_tier`도 동시 갱신. profiles 조회 페이지에 `export const revalidate = 0` 또는 `unstable_noStore()`.
**Warning signs:** 테스트에서 INSERT 직후 SELECT가 이전 값을 반환.

### Pitfall 5: 비교 표 URL에 4개 초과 ID 허용

**What goes wrong:** URL을 직접 조작해 5개 이상의 ID를 넣으면 DB 쿼리가 5개 이상 실행.
**Why it happens:** nuqs만으로는 서버 측 제한이 없음.
**How to avoid:** RSC에서 `ids.slice(0, 4)` 적용. CompareSelector에서도 클라이언트 검사.
**Warning signs:** 성능 테스트 시 Promise.all이 4개 초과 실행.

### Pitfall 6: 카페 글 NLP 매칭에서 단지명 단독 매칭

**What goes wrong:** Gemini가 추출한 "롯데캐슬"로 matchByAdminCode() → 동일 지역 내 여러 롯데캐슬 단지 중 첫 번째가 연결됨.
**Why it happens:** sgg_code 없이 이름만으로 매칭 시 복수 결과 중 하나 선택.
**How to avoid:** 카페 글에서 지역명(시/구/동)도 Gemini로 함께 추출 → sgg_code 유추에 활용. 신뢰도 낮으면 complex_match_queue로 운영자 검수.
**Warning signs:** 매칭된 단지 중 지역이 맞지 않는 케이스 발생.

---

## Code Examples

Verified patterns from official sources or project codebase:

### SOLAPI 알림톡 발송 기본 패턴

```typescript
// Source: [CITED: SOLAPI GitHub solapi-nodejs]
import { SolapiMessageService } from 'solapi'

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY!,
  process.env.SOLAPI_API_SECRET!,
)

// 알림톡 발송 (template 변수 없는 경우 variables: {})
await messageService.send({
  to:   '01012345678',
  from: process.env.SOLAPI_SENDER_NUMBER!,
  kakaoOptions: {
    pfId:       process.env.KAKAO_CHANNEL_PF_ID!,
    templateId: 'KA01TP...',
    variables:  { '#{단지명}': '래미안더센트럴', '#{가격}': '15억 5천만원' },
    disableSms: false,   // 발송 실패 시 SMS fallback
  },
})
```

### Naver 카페 검색 API 요청

```typescript
// Source: [CITED: developers.kakao.com/docs/ko/daum-search/dev-guide]
// KAKAO_REST_API_KEY는 이미 .env.local.example에 존재
const res = await fetch(
  `https://dapi.kakao.com/v2/search/cafe?query=${encodeURIComponent('창원 아파트')}&sort=recency&size=10`,
  {
    headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    signal: AbortSignal.timeout(10_000),
  }
)
// 응답: { meta: { total_count, is_end }, documents: [{ title, contents, url, cafename, datetime }] }
```

### nuqs 비교 모드 URL 파서

```typescript
// Source: [CITED: nuqs.dev] [VERIFIED: npm registry nuqs@2.8.9]
import { parseAsArrayOf, parseAsString } from 'nuqs/server'

// /compare?ids=uuid1%2Cuuid2%2Cuuid3
const idsParser = parseAsArrayOf(parseAsString, ',').withDefault([])
// → ['uuid1', 'uuid2', 'uuid3']
```

### 기존 matchComplex() 파이프라인과 카페 글 연동

```typescript
// Source: src/lib/data/complex-matching.ts (기존 코드)
// 카페 글에 지역 정보가 없는 경우 최대한 추출 시도
import { matchComplex } from '@/lib/data/complex-matching'

async function linkCafePostToComplex(
  post: CafePost,
  extractedName: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  // 지역 정보는 카페 글에서 Gemini로 추출한 것 활용
  // sgg_code 없으면 admin_code axis는 빈 결과 → queue로 이동
  return matchComplex({
    rawName:    extractedName,
    sggCode:    extractedSggCode ?? '',  // 창원 성산구 = '48125'
    source:     'cafe_nlp',
    rawPayload: { postUrl: post.url, cafeName: post.cafeName },
  }, supabase)
}
```

---

## OPS-02 현실적 대안 분석

### 현황

다음(Daum)·네이버(Naver) 카페는 글쓰기 공개 API를 제공하지 않는다. 검색(read-only) API만 존재. OPS-02는 어드민 수동 플로우로 대체.

- 제공: `GET /v2/search/cafe` — 검색(읽기)만 가능
- 미제공: 글쓰기, 게시 엔드포인트

### 대안 옵션

| 옵션 | 구현 가능성 | 리스크 | 권장 |
|------|-----------|--------|------|
| A. 어드민 "복사" 버튼 + 카페 수동 작업 | 즉시 구현 가능 | 운영 부담 | O (단기) |
| B. 브라우저 자동화 (Playwright headless) | 기술적 가능 | 카카오 이용약관 위반 위험, 봇 감지 | X |
| C. 카카오 파트너사 채널 API 별도 계약 | 계약 필요 | 법무·비용 | 법무 승인 후 검토 |

**권장:** OPS-02 scope를 Phase 8에서는 "어드민 카드뉴스 복사 클립보드 버튼 + 카페 게시 가이드 문서"로 축소. 법무 승인 + 카카오 파트너사 계약 후 Phase 9에서 자동화.

---

## 게이미피케이션 DB 스키마 설계

### 신규 컬럼 (profiles 테이블 확장)

```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS activity_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS member_tier text NOT NULL DEFAULT 'bronze'
    CHECK (member_tier IN ('bronze', 'silver', 'gold'));

CREATE INDEX profiles_member_tier_idx ON public.profiles(member_tier);
```

### 활동 로그 테이블

```sql
CREATE TABLE public.activity_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points     integer NOT NULL,
  reason     text NOT NULL CHECK (reason IN ('review', 'comment', 'gps_verify', 'daily_visit')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs: owner read"
  ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);
-- write: service_role only (트리거에서 SECURITY DEFINER 함수로 호출)
```

### 포인트 적립 기준 (ASSUMED — 프로젝트 기획 미확정)

| 활동 | 포인트 |
|------|--------|
| 후기 작성 | +10 |
| 댓글 작성 | +3 |
| GPS 인증 통과 | +20 |
| 첫 즐겨찾기 등록 | +5 |

### 등급 기준 (ASSUMED — 프로젝트 기획 미확정)

| 등급 | 조건 | 마크 |
|------|------|------|
| bronze | 0~49점 | (없음) |
| silver 🔥 | 50~199점 | 🔥 |
| gold 👑 | 200점 이상 | 👑 |
| (카페 우선) 💬 | 카페 닉네임 인증 완료 | 💬 |

> 💬 마크는 포인트와 별개로 `cafe_nickname IS NOT NULL`이면 표시하는 것으로 구현 가능.

### 카카오 채널 구독 테이블 (DIFF-04)

```sql
CREATE TABLE public.kakao_channel_subscriptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone_number     text NOT NULL,  -- 암호화 저장 권장 (개인정보)
  subscribed_at    timestamptz NOT NULL DEFAULT now(),
  is_active        boolean NOT NULL DEFAULT true,
  UNIQUE(user_id)
);

ALTER TABLE public.kakao_channel_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "kakao_channel_subscriptions: owner all"
  ON public.kakao_channel_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 카페 글 저장 테이블 (DIFF-02)

```sql
CREATE TABLE public.cafe_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complex_id  uuid REFERENCES public.complexes(id) ON DELETE SET NULL,
  title       text NOT NULL,
  excerpt     text,
  url         text NOT NULL UNIQUE,
  cafe_name   text,
  posted_at   timestamptz,
  matched_at  timestamptz NOT NULL DEFAULT now(),
  confidence  numeric,   -- matchComplex() 반환 confidence
  is_verified boolean NOT NULL DEFAULT false  -- 운영자 검수 완료
);

ALTER TABLE public.cafe_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cafe_posts: public read"
  ON public.cafe_posts FOR SELECT USING (true);
-- write: service_role only (cron 워커)
```

---

## 회원 등급 우선 알림 혜택 (DIFF-05) 패턴

```typescript
// src/lib/notifications/generate-alerts.ts 수정 패턴
// gold 등급 사용자에게 30분 먼저 알림 발송

async function shouldNotifyNow(
  userId: string,
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('member_tier')
    .eq('id', userId)
    .single()

  if ((profile as { member_tier: string } | null)?.member_tier === 'gold') return true
  // silver/bronze: 30분 딜레이 (created_at + 30m 이후에만 발송)
  return false
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 직접 URLSearchParams 조작 | nuqs (URL state) | 2023~ | SSR hydration 안전, 타입 안전 |
| 카카오 BizMessage 직접 계약 | SOLAPI/CoolSMS 딜러사 경유 | 2020~ | 진입 장벽 낮음, SDK 제공 |
| Postgres stored procedure 포인트 | DB 트리거 기반 | 일반적 패턴 | 원자성 보장 |
| 카페 글 수동 분류 | Gemini Flash NER | 2024~ | 비용 낮음, 한국어 정확도 높음 |

**Deprecated/outdated:**
- `next-auth`를 통한 카카오 OAuth: 이 프로젝트는 Supabase Auth로 완전 구현됨 (CLAUDE.md 확정)
- 카카오 i Connect Message 직접 계약: SOLAPI 경유로 대체

---

## Runtime State Inventory

Phase 8은 신규 기능 추가이므로 rename/refactor 해당 없음.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | 없음 — 신규 테이블만 추가 | 없음 |
| Live service config | SOLAPI 계정: 신규 가입 필요 | Wave 0 사전 작업 |
| OS-registered state | 없음 | 없음 |
| Secrets/env vars | SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER, KAKAO_CHANNEL_PF_ID, GEMINI_API_KEY (이미 존재) | 신규 env var 추가 |
| Build artifacts | 없음 | 없음 |

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @google/generative-ai | DIFF-02 Gemini NER | ✓ | 0.24.1 | — |
| KAKAO_REST_API_KEY | DIFF-02 Naver Search | ✓ (env 존재) | — | — |
| GEMINI_API_KEY | DIFF-02 NER | 확인 필요 (env에 없음) | — | ANTHROPIC_API_KEY로 대체 가능 |
| SOLAPI 계정 | DIFF-04 알림톡 | ✗ (신규 가입 필요) | — | 없음 (Wave 0 선행 필수) |
| 카카오 비즈니스 채널 | DIFF-04 | ✗ (신규 심사 필요) | — | 없음 |
| 알림톡 템플릿 승인 | DIFF-04 | ✗ (1~3 영업일) | — | 없음 |

**Missing dependencies with no fallback:**
- SOLAPI 계정 + 카카오 비즈니스 채널 심사 + 알림톡 템플릿 승인 — DIFF-04 구현 전 선행 필수. Wave 0에 "외부 계정 설정" 태스크 포함 필요.

**Missing dependencies with fallback:**
- GEMINI_API_KEY: 없으면 ANTHROPIC_API_KEY + Anthropic SDK로 대체 가능 (이미 설치됨). 단, 비용 차이 있음.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | vitest.config.ts |
| Quick run command | `npm run test` |
| Full suite command | `npm run test && npm run test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIFF-01 | member_tier 자동 갱신 (review INSERT → bronze→silver 전환) | unit | `npm run test -- --grep "member.tier"` | ❌ Wave 0 |
| DIFF-01 | TierBadge 컴포넌트 렌더 | unit | `npm run test -- --grep "TierBadge"` | ❌ Wave 0 |
| DIFF-02 | Naver 카페 검색 API 어댑터 | unit (mock) | `npm run test -- --grep "naver-cafe"` | ❌ Wave 0 |
| DIFF-02 | Gemini NER 단지명 추출 | unit (mock) | `npm run test -- --grep "extractComplexNames"` | ❌ Wave 0 |
| DIFF-02 | cafe_posts 매칭 정확도 ≥ 85% | manual (100건 샘플) | — | manual-only |
| DIFF-04 | SOLAPI 알림톡 발송 (mock) | unit (mock) | `npm run test -- --grep "kakao-channel"` | ❌ Wave 0 |
| DIFF-04 | notify-worker 알림톡 분기 | unit | `npm run test -- --grep "deliver.*kakao"` | ❌ Wave 0 |
| DIFF-05 | member_tier 등급별 알림 우선순위 | unit | `npm run test -- --grep "member.tier.*priority"` | ❌ Wave 0 |
| DIFF-06 | CompareTable 2개 단지 렌더 | unit | `npm run test -- --grep "CompareTable"` | ❌ Wave 0 |
| DIFF-06 | /compare 페이지 4개 초과 제한 | unit | `npm run test -- --grep "compare.*limit"` | ❌ Wave 0 |
| OPS-02 | 어드민 카드뉴스 복사 버튼 | E2E (Playwright) | `npm run test:e2e -- --grep "cardnews.*copy"` | ❌ Wave 0 |

> 정확도 테스트 (DIFF-02): 100건 카페 글 샘플을 수동으로 매칭하여 ≥ 85% 달성 여부 검증. 자동화 불가 (ground truth 레이블링 필요).

### Sampling Rate

- **Per task commit:** `npm run test -- --grep "[태스크 관련 키워드]"`
- **Per wave merge:** `npm run test`
- **Phase gate:** `npm run test && npm run test:e2e` full suite green

### Wave 0 Gaps

- [ ] `src/__tests__/member-tier.test.ts` — DIFF-01, DIFF-05 커버
- [ ] `src/__tests__/naver-cafe.test.ts` — DIFF-02 커버
- [ ] `src/__tests__/kakao-channel.test.ts` — DIFF-04 커버
- [ ] `src/__tests__/compare.test.ts` — DIFF-06 커버
- [ ] `npm install solapi nuqs` — 신규 패키지

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Supabase Auth (기존), 알림톡 구독 시 전화번호 인증 필요 |
| V3 Session Management | no | 기존 세션 변경 없음 |
| V4 Access Control | yes | RLS 모든 신규 테이블 필수, 포인트 갱신은 SECURITY DEFINER 트리거만 |
| V5 Input Validation | yes | nuqs 타입 파서, Gemini 프롬프트 인젝션 방지 (기존 패턴 준수) |
| V6 Cryptography | yes | 전화번호 저장 시 암호화 (Supabase pgcrypto 또는 암호화 저장) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| 포인트 조작 (클라이언트 직접 호출) | Tampering | DB 트리거 + SECURITY DEFINER (클라이언트 UPDATE 금지) |
| 알림톡 수신자 번호 개인정보 노출 | Information Disclosure | RLS owner-only, 서버 로그 제외 |
| Gemini 프롬프트 인젝션 (카페 글 내용) | Tampering | 기존 패턴: `[카피 내용]` 구분자로 감싸 사용자 입력 분리 |
| Naver Search API 키 노출 | Information Disclosure | 서버 전용 (KAKAO_REST_API_KEY, src/services/ 어댑터만 호출) |
| URL 비교 모드 ID 조작 | Information Disclosure | RSC에서 ids.slice(0, 4), getComplexById null 체크 |
| SOLAPI API key 노출 | Information Disclosure | 서버 전용 환경변수, src/services/kakao-channel.ts 어댑터만 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 포인트 기준: 후기=10, 댓글=3, GPS=20 | 게이미피케이션 DB 스키마 | 등급 임계값 재조정 필요 (스키마 변경은 불필요) |
| A2 | 등급 임계값: silver=50점, gold=200점 | 게이미피케이션 DB 스키마 | DB 컬럼 CHECK 제약 변경 필요 |
| A3 | 💬 마크는 cafe_nickname IS NOT NULL 조건 | 게이미피케이션 DB 스키마 | 별도 플래그 컬럼 추가 필요 |
| A4 | silver=🔥, gold=👑 마크 매핑 | 게이미피케이션 DB 스키마 | UI 수정만 필요 (DB 변경 없음) |
| A5 | GEMINI_API_KEY가 .env.local에 설정됨 | Environment Availability | Phase 6 미완료 시 별도 설정 필요 |
| A6 | 카페 글 지역 정보가 글 내에 포함됨 (창원, 김해) | DIFF-02 NER 파이프라인 | 지역 정보 없을 시 매칭 신뢰도 낮아져 queue 증가 |

---

## Open Questions (RESOLVED)

1. **DIFF-04 알림톡 수신 동의 및 전화번호 수집 방법**
   - What we know: 알림톡은 수신자 전화번호 필요. 개인정보 수집 동의 절차 필요.
   - What's unclear: 기존 Supabase Auth(네이버 OAuth + Email OTP)는 전화번호를 수집하지 않음.
   - Recommendation: 프로필 페이지에 "카카오톡 알림 신청" 폼 추가 (전화번호 입력 + 동의 체크). 개인정보처리방침 업데이트 필요 (LEGAL-02 연동).
   - RESOLVED: 프로필 페이지에 "카카오톡 알림 신청" 폼 추가 (전화번호 입력 + 동의 체크), 개인정보처리방침 링크 포함.

2. **DIFF-02 카페 검색 쿼리 전략**
   - What we know: Naver Search API로 단지명 키워드 검색 가능. 일 100,000회 한도 (현재 지도 API와 공유).
   - What's unclear: "창원 래미안"처럼 광역 검색 vs 단지별 개별 검색 중 어느 것이 정확도 ≥ 85% 달성에 유리한지.
   - Recommendation: 단지별 개별 검색 (canonical_name + 지역명). 수집 주기는 GitHub Actions에서 일 1회 cron.
   - RESOLVED: 단지별 개별 검색 (canonical_name + 지역명), GitHub Actions 일 1회 cron.

3. **DIFF-05 우선 알림 혜택 구체적 스펙**
   - What we know: "gold 등급 우선 알림"이 요구사항이지만 구체적 시간 차이 미정.
   - What's unclear: 30분 우선? 즉시 발송? 별도 알림 유형?
   - Recommendation: gold 등급에 즉시 발송, silver/bronze에 30분 딜레이 큐잉. DB에 `priority` 컬럼 추가.
   - RESOLVED: gold 등급 즉시 발송, silver/bronze 30분 딜레이 큐잉.

---

## Project Constraints (from CLAUDE.md)

- **CRITICAL:** 외부 API 호출(Naver Search, SOLAPI, Gemini)은 반드시 `src/services/` 어댑터에서만. 컴포넌트·라우트에서 직접 호출 금지.
- **CRITICAL:** Supabase 쿼리는 서버 컴포넌트 또는 API Route에서만.
- **CRITICAL:** 신규 테이블 모두 RLS 정책 명시 (supabase/migrations/ 포함).
- **CRITICAL:** 단지명 단독 매칭 절대 금지 — 항상 위치(sgg_code 또는 좌표) + 이름 복합 매칭.
- **AI 슬롭 금지:** backdrop-blur, gradient-text, glow, "Powered by AI" 배지, 보라/인디고, gradient orb. TierBadge와 비교 표 UI에도 적용.
- Server Action 우선 — 폼 submit은 Server Action 사용.
- 전화번호는 개인정보 — 저장 시 암호화 또는 최소 수집 원칙 적용.
- 광고 쿼리: `now() BETWEEN starts_at AND ends_at AND status='approved'` 항상 포함 (관련 없으나 일반 원칙).
- 거래 쿼리: `WHERE cancel_date IS NULL AND superseded_by IS NULL` 항상 포함 (비교 표에서 최근 거래 표시 시 필수).

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: kakao developers docs] — Naver Search cafe API `/v2/search/cafe` read-only 확인, 글쓰기 API 없음 확인
- [VERIFIED: kakao developers docs] — 카카오톡 채널 API와 알림톡 비즈메시지 API 분리 확인
- [VERIFIED: npm registry 2026-05-12] — solapi@6.0.1, nuqs@2.8.9 현행 버전
- [VERIFIED: codebase] — src/lib/data/complex-matching.ts 기존 3축 매칭 파이프라인
- [VERIFIED: codebase] — src/app/api/chat/complex/route.ts Gemini 사용 패턴
- [VERIFIED: codebase] — src/lib/notifications/deliver.ts 기존 알림 전달 패턴

### Secondary (MEDIUM confidence)
- [CITED: solapi.com/guides/kakao-ata-guide] — 알림톡 템플릿 사전 승인 1~3 영업일 소요, 비즈니스 채널 3~5 영업일 심사
- [CITED: nuqs.dev] — parseAsArrayOf, useQueryState, Next.js App Router 지원 확인
- [CITED: solapi GitHub solapi-nodejs] — SolapiMessageService, pfId, templateId, variables 파라미터 구조

### Tertiary (LOW confidence)
- WebSearch 결과 — Naver 카페 글쓰기 API 부재 (복수 출처 교차 확인으로 MEDIUM으로 승격)

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — solapi, nuqs 버전 npm registry 직접 확인. Naver Search API 공식 문서 확인.
- Architecture: MEDIUM — 기존 프로젝트 패턴 기반 설계, 게이미피케이션 포인트/등급 기준은 ASSUMED.
- Pitfalls: HIGH — 카카오 채널 vs 알림톡 혼동, 카페 글쓰기 API 부재는 공식 문서 확인.

**Research date:** 2026-05-12
**Valid until:** 2026-06-12 (SOLAPI API 변경, 카카오 정책 변경 시 재확인 필요)
