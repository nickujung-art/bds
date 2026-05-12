---
phase: 8
name: 커뮤니티 심화·자동화
status: draft
date: 2026-05-12
---

# Phase 8 UI-SPEC — 커뮤니티 심화·자동화

---

## Design Direction

**톤:** 이돈쪽 종이 (editorial paper). 데이터가 우선이고 UI는 뒤로 물러선다. 실거래가 숫자가 주인공이고 마크는 조용한 주석이다.

**비주얼 방향:** 기존 단지온도 디자인 시스템의 확장. 신규 컴포넌트는 모두 기존 `--dj-orange` / zinc 계열 토큰 안에서 해결한다. 새로운 색상 계열 도입 없음.

**인터랙션 원칙:**
- 상태 전환은 120ms ease (기존 `.btn` 트랜지션과 동일)
- 피드백은 인라인 텍스트 변화로. 모달·토스트 사용 최소화
- 터치 타겟 최소 44px (기존 `.btn-md` 기준 준수)

**RSC 기본, 클라이언트 최소화:**
- `TierBadge` — 서버 컴포넌트 (props만 받아 렌더, 상태 없음)
- `CompareTable` — 서버 컴포넌트 (데이터는 RSC에서 전달)
- `CompareAddButton` — `'use client'` (nuqs URL 상태 변경)
- `KakaoChannelSubscribeForm` — `'use client'` (react-hook-form + zod)
- `AdminCardnewsCopyButton` — `'use client'` (Clipboard API)

---

## Tokens

기존 globals.css 토큰을 그대로 사용한다. Phase 8 전용 신규 토큰 없음.

### Color

| 역할 | 토큰 | 값 | 사용처 |
|------|------|-----|--------|
| 브랜드 (accent) | `--dj-orange` | `#ea580c` | CTA 버튼, 활성 상태, gold 배지 테두리 |
| 브랜드 tint | `--dj-orange-tint` | `#fff1e8` | CompareAddButton 활성 배경 |
| 기본 전경 | `--fg-pri` | `#171719` | 본문, 테이블 데이터 |
| 보조 전경 | `--fg-sec` | `rgba(55,56,60,.61)` | 레이블, 행 헤더 |
| 3차 전경 | `--fg-tertiary` | `rgba(55,56,60,.35)` | 빈 상태, 힌트 텍스트 |
| 표면 | `--bg-surface` | `#ffffff` | 카드 배경 |
| 표면 2 | `--bg-surface-2` | `#f4f4f5` | TierBadge 배경, 행 홀수 |
| 선 기본 | `--line-default` | `rgba(112,115,124,.22)` | 테이블 경계선, 카드 테두리 |
| 선 미세 | `--line-subtle` | `rgba(112,115,124,.12)` | 테이블 행 구분선 |
| 긍정 | `--fg-positive` | `#16a34a` | cafe_verified 배지 |
| 긍정 tint | `--bg-positive-tint` | `#ecfdf5` | cafe_verified 배지 배경 |

**금지 색상:** 보라, 인디고, 파랑 계열 신규 도입 금지. `--fg-brand(#0066ff)`는 외부 링크 한정.

### Spacing (8pt 격자)

| 토큰명 | 값 | 사용처 |
|--------|-----|--------|
| 4px | 0.25rem | 배지 내부 gap, 아이콘-텍스트 간격 |
| 8px | 0.5rem | TierBadge 좌우 여백, 테이블 셀 수직 패딩 |
| 12px | 0.75rem | 버튼 수평 패딩 (sm) |
| 16px | 1rem | 테이블 셀 수평 패딩, 카드 내부 섹션 gap |
| 20px | 1.25rem | 카드 패딩 |
| 24px | 1.5rem | 섹션 간격 |
| 32px | 2rem | 페이지 좌우 여백 |

### Typography

프로젝트 표준 Pretendard 폰트 사용. 신규 폰트 도입 없음.

| 역할 | font shorthand | 사용처 |
|------|---------------|--------|
| 테이블 헤더 | `700 13px/1.4 var(--font-sans)` | CompareTable 컬럼 헤더 |
| 테이블 데이터 | `500 13px/1.4 var(--font-sans)` | CompareTable 셀 값 |
| 테이블 레이블 | `500 12px/1 var(--font-sans)` | CompareTable 행 레이블 |
| 배지 텍스트 | `600 10px/1 var(--font-sans)` | TierBadge |
| 인풋 레이블 | `600 13px/1.4 var(--font-sans)` | KakaoChannelSubscribeForm |
| 인풋 필드 | `500 15px/1.4 var(--font-sans)` | 기존 `.input` 클래스 |
| 힌트/동의 | `500 12px/1.5 var(--font-sans)` | 동의 체크박스 레이블 |
| 숫자 (tabular) | `.tnum` + `500 13px/1 var(--font-sans)` | 가격, 면적 데이터 |

---

## Component Contracts

---

### 1. TierBadge

**파일:** `src/components/reviews/TierBadge.tsx`
**RSC 여부:** 서버 컴포넌트 (props-only, 상태 없음)

#### Props

```typescript
type Tier = 'bronze' | 'silver' | 'gold'

interface TierBadgeProps {
  tier: Tier
  cafeVerified: boolean   // cafe_nickname IS NOT NULL
  className?: string
}
```

#### States

| State | 표시 조건 | 렌더 결과 |
|-------|----------|----------|
| bronze | tier='bronze', cafeVerified=false | 렌더 없음 (null 반환) |
| silver | tier='silver' | 🔥 배지 |
| gold | tier='gold' | 👑 배지 |
| cafe_verified | cafeVerified=true | 💬 배지 |
| gold + cafe_verified | tier='gold', cafeVerified=true | 👑💬 순서로 나란히 |
| silver + cafe_verified | tier='silver', cafeVerified=true | 🔥💬 순서로 나란히 |

#### 시각 명세

- **컨테이너:** `display: inline-flex`, `gap: 4px`, `align-items: center`
- **배지 하나:** `display: inline-flex`, `align-items: center`, `gap: 2px`
- **배지 높이:** 18px (`.badge.sm` 클래스 기준)
- **배지 패딩:** `0 6px`
- **배지 radius:** 6px
- **배지 font:** `600 10px/1 var(--font-sans)`, `letter-spacing: 0.02em`

| 배지 종류 | background | color | 텍스트 |
|----------|-----------|-------|--------|
| gold 👑 | `var(--bg-surface-2)` | `var(--fg-pri)` | `👑` |
| silver 🔥 | `var(--bg-surface-2)` | `var(--fg-sec)` | `🔥` |
| cafe_verified 💬 | `var(--bg-positive-tint)` | `var(--fg-positive)` | `💬` |

**배치:** 사용자명 텍스트 바로 뒤, 인라인. `margin-left: 4px`.

#### 사용 위치

- `ReviewList.tsx` — 후기 카드 내 작성자 행 (현재 formatNick() 텍스트 뒤에 추가)
- `CommentSection.tsx` — 댓글 작성자 행의 formatNick() 텍스트 뒤에 추가

#### 코드 스케치

```tsx
// 서버 컴포넌트 — 'use client' 없음
export function TierBadge({ tier, cafeVerified }: TierBadgeProps) {
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

  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', marginLeft: 4 }}>
      {badges.map(b => (
        <span
          key={b.emoji}
          aria-label={b.label}
          style={{
            display:      'inline-flex',
            alignItems:   'center',
            height:       18,
            padding:      '0 6px',
            borderRadius: 6,
            background:   b.bg,
            color:        b.color,
            font:         '600 10px/1 var(--font-sans)',
            letterSpacing: '0.02em',
          }}
        >
          {b.emoji}
        </span>
      ))}
    </span>
  )
}
```

#### 금지

- `glow`, `box-shadow` 색상 추가 금지
- 배경에 gradient 금지
- "인증됨" 등 한글 텍스트 병기 금지 (이모지만)
- TierBadge가 없는 bronze 사용자 행에 빈 공간 예약 금지 (margin-left 0으로 처리)

---

### 2. CompareTable

**파일:** `src/components/complex/CompareTable.tsx`
**RSC 여부:** 서버 컴포넌트 (데이터는 부모 RSC `/compare/page.tsx`에서 전달)

#### Props

```typescript
interface ComplexSummary {
  id:             string
  canonical_name: string
  built_year:     number | null
  household_count: number | null
  road_address:   string | null
  si:             string | null
  gu:             string | null
  dong:           string | null
  // 거래 데이터는 부모에서 resolve하여 전달
  latestSalePrice:     number | null   // 만원 단위
  latestSalePricePerPy: number | null  // 평당가 만원
  latestJeonsePrice:   number | null
  areaRange:           string | null   // "59~84㎡"
  schoolScore:         number | null   // 0~10 (없으면 null)
  redevelopmentPhase:  string | null   // 재건축 단계 텍스트
  heatType:            string | null   // 난방방식
}

interface CompareTableProps {
  complexes: ComplexSummary[]  // 2~4개
}
```

#### 레이아웃 명세

**구조: 테이블 레이아웃**

```
[행 헤더 열 (고정)] | [단지 1] | [단지 2] | [단지 3?] | [단지 4?]
```

- **sticky top row:** 단지명 행 — `position: sticky; top: 60px; z-index: 10; background: var(--bg-surface)` (nav 높이 60px 기준)
- **sticky left column:** 행 레이블 열 — `position: sticky; left: 0; background: var(--bg-surface); z-index: 5`
- **전체 컨테이너:** `overflow-x: auto; -webkit-overflow-scrolling: touch`

#### 컬럼 너비

| 열 | min-width | 비고 |
|----|----------|------|
| 행 레이블 | 120px | sticky left |
| 단지 데이터 | 160px | 2~4개 반복 |

#### 행 정의 (순서 고정)

| 행 ID | 행 레이블 | 값 형식 | 빈값 처리 |
|-------|---------|--------|----------|
| `complex_name` | (헤더 sticky row) | 단지 canonical_name | — |
| `area` | 전용면적 | `59~84㎡` | `-` |
| `household` | 세대수 | `1,200세대` | `-` |
| `built_year` | 준공연도 | `1998년` | `-` |
| `latest_sale` | 최근매매가 | `15억 5천` | `거래 없음` |
| `price_per_py` | 평당가 | `5,200만원/평` | `-` |
| `latest_jeonse` | 최근전세가 | `8억 2천` | `거래 없음` |
| `school_score` | 학군점수 | `★ 7.4` | `정보 없음` |
| `redevelopment` | 재건축단계 | `조합설립인가` | `-` |
| `heat_type` | 난방방식 | `지역난방` | `-` |

#### 행 스타일

- **헤더 행 (단지명):** background `var(--bg-surface)`, border-bottom `2px solid var(--line-default)`, font `700 14px/1.4 var(--font-sans)`, height 56px
- **데이터 행:** 짝수 `var(--bg-surface)`, 홀수 `var(--bg-surface-2)`, border-bottom `1px solid var(--line-subtle)`
- **셀 패딩:** `12px 16px`
- **행 레이블 셀:** font `500 12px/1 var(--font-sans)`, color `var(--fg-sec)`
- **데이터 셀:** font `500 13px/1.4 var(--font-sans)`, color `var(--fg-pri)`
- **숫자 셀:** `.tnum` 추가

#### 빈 상태

2개 미만 단지 선택 시:

```
단지를 2개 이상 선택하면 비교할 수 있어요.
단지 상세 페이지에서 "비교에 추가 +" 버튼을 눌러주세요.
```
font `500 14px/1.6 var(--font-sans)`, color `var(--fg-sec)`, text-align center, padding `64px 0`

#### 모바일 (< 768px)

- `overflow-x: auto` 수평 스크롤 — 레이아웃 변경 없음
- 헤더 행 sticky 유지
- 행 레이블 열 sticky left 유지
- 셀 패딩 `10px 12px`로 축소

#### 코드 스케치 (구조만)

```tsx
export function CompareTable({ complexes }: CompareTableProps) {
  if (complexes.length < 2) return <EmptyState />

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrollingTouch: 'touch' } as React.CSSProperties}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ minWidth: 120, width: 120 }} />
          {complexes.map(c => <col key={c.id} style={{ minWidth: 160 }} />)}
        </colgroup>
        <thead>
          <tr style={{ position: 'sticky', top: 60, zIndex: 10, background: 'var(--bg-surface)' }}>
            <th style={labelCellStyle} />
            {complexes.map(c => (
              <th key={c.id} style={headerCellStyle}>{c.canonical_name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr key={row.id} style={{ background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-surface-2)' }}>
              <td style={{ ...labelCellStyle, position: 'sticky', left: 0 }}>{row.label}</td>
              {complexes.map(c => (
                <td key={c.id} style={dataCellStyle}>
                  {row.format(c) ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

#### 금지

- `backdrop-blur` 적용 금지
- sticky row에 gradient 오버레이 금지
- 단지별 색상 코드(칼럼 색상 구분) 금지 — 위치만으로 구분

---

### 3. CompareAddButton

**파일:** `src/components/complex/CompareAddButton.tsx`
**RSC 여부:** `'use client'` (nuqs URL 상태 쓰기)

#### Props

```typescript
interface CompareAddButtonProps {
  complexId:   string
  complexName: string
}
```

#### States

| State | 조건 | 버튼 텍스트 | 시각 |
|-------|-----|------------|------|
| default | URL ids에 이 complexId 없음 | `비교에 추가 +` | `.btn-secondary` |
| active | URL ids에 이 complexId 포함됨 | `비교 중 ✓` | `.btn-orange` |
| full | ids.length === 4, 이 복합단지 미포함 | `4/4 비교 중` | `.btn-secondary` + `disabled`, `cursor: not-allowed`, `opacity: 0.5` |

#### 시각 명세

- **크기:** `.btn-sm` (height 32px, padding 0 12px, font 13px)
- **기본:** background `var(--bg-surface)`, border `1px solid var(--line-default)`, color `var(--fg-pri)`
- **활성:** background `var(--dj-orange)`, color `#fff`
- **가득참:** opacity 0.5, cursor not-allowed, disabled 속성
- **hover (기본):** background `var(--bg-surface-2)`
- **hover (활성):** background `var(--dj-orange-dark)`
- **트랜지션:** `120ms ease` (background, color)

#### 배치

단지 상세 페이지 (`/complexes/[id]/page.tsx`) nav header 오른쪽 영역에 배치.

기존 버튼 순서: `ShareButton` | `FavoriteButton` | `알림 설정`

신규 순서: `ShareButton` | `FavoriteButton` | **`CompareAddButton`** | `알림 설정`

**간격:** gap 8px (기존 header gap 24px에서 이 버튼만 8px로 좁힘 — 버튼 군 내부 gap).

"비교 보기" floating 버튼: ≥2개 선택 시 화면 우하단 `position: fixed; bottom: 24px; right: 24px; z-index: 40`에 출현. `.btn-md.btn-orange` 크기. 텍스트 `비교 보기 (N)`. 최소 높이 44px.

#### 코드 스케치

```tsx
'use client'
import { parseAsArrayOf, parseAsString, useQueryState } from 'nuqs'
import Link from 'next/link'

export function CompareAddButton({ complexId, complexName }: CompareAddButtonProps) {
  const [ids, setIds] = useQueryState('ids', parseAsArrayOf(parseAsString).withDefault([]))

  const isActive = ids.includes(complexId)
  const isFull   = ids.length >= 4 && !isActive

  function toggle() {
    if (isFull) return
    setIds(prev =>
      isActive ? prev.filter(id => id !== complexId) : [...prev, complexId]
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={isFull}
        className={`btn btn-sm ${isActive ? 'btn-orange' : 'btn-secondary'}`}
        style={{ opacity: isFull ? 0.5 : 1, cursor: isFull ? 'not-allowed' : 'pointer' }}
        aria-label={isActive ? `${complexName} 비교에서 제거` : `${complexName} 비교에 추가`}
        aria-pressed={isActive}
      >
        {isFull ? '4/4 비교 중' : isActive ? '비교 중 ✓' : '비교에 추가 +'}
      </button>

      {/* 플로팅 비교 보기 버튼 */}
      {ids.length >= 2 && (
        <Link
          href={`/compare?ids=${ids.join(',')}`}
          className="btn btn-md btn-orange"
          style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 40, minHeight: 44 }}
          aria-label={`선택한 ${ids.length}개 단지 비교 보기`}
        >
          비교 보기 ({ids.length})
        </Link>
      )}
    </>
  )
}
```

#### 금지

- map pin 클릭에서 비교 추가 금지 (진입점은 단지 상세 페이지만)
- 즐겨찾기 목록에서 비교 추가 금지
- 4개 초과 허용 금지 (클라이언트 + RSC 양쪽 제한)

---

### 4. KakaoChannelSubscribeForm

**파일:** `src/components/profile/KakaoChannelSubscribeForm.tsx`
**RSC 여부:** `'use client'` (react-hook-form + zod)

#### 배치

프로필 페이지 (`/profile`) 알림 설정 카드 (`PushToggle`, `TopicToggle` 아래) 에 추가.

카드 구조:
```
[알림 설정 카드]
  └─ PushToggle (기존)
  └─ TopicToggle (기존)
  └─ [구분선 1px var(--line-subtle)]
  └─ KakaoChannelSubscribeForm (신규)
```

#### Fields

| 필드 | 타입 | 유효성 | 에러 메시지 |
|------|------|--------|------------|
| `phone` | text input | `/^010-\d{4}-\d{4}$/` | "010-XXXX-XXXX 형식으로 입력해주세요" |
| `consent` | checkbox | must be true | "개인정보 수집에 동의해야 신청할 수 있어요" |

#### 시각 명세

**섹션 헤더:**
- font `700 13px/1.4 var(--font-sans)`, margin-bottom 12px
- 텍스트: `카카오톡 채널 알림`

**부제목:**
- font `500 12px/1.5 var(--font-sans)`, color `var(--fg-sec)`, margin-bottom 16px
- 텍스트: `웹 푸시가 차단된 경우 카카오톡으로 알림을 받을 수 있어요.`

**전화번호 인풋:**
- `.input` 클래스 (height 44px, border-radius 12px, border `1px solid var(--line-default)`)
- placeholder: `010-0000-0000`
- `inputMode="tel"`, `maxLength={13}`, `autoComplete="tel"`
- focus: `border-color: var(--dj-orange); box-shadow: 0 0 0 4px rgba(234,88,12,.12)`
- 에러 시: `border-color: var(--fg-negative); box-shadow: 0 0 0 4px rgba(220,38,38,.12)`

**에러 텍스트:**
- font `500 12px/1 var(--font-sans)`, color `var(--fg-negative)`, margin-top 6px

**동의 체크박스:**
- 기본 checkbox (`<input type="checkbox">`) + `<label>` 연결
- 레이블 font `500 12px/1.5 var(--font-sans)`, color `var(--fg-sec)`
- 개인정보처리방침 링크: color `var(--fg-brand)`, text-decoration none, font-weight 600
- 레이블 텍스트: `[개인정보처리방침]에 따라 전화번호를 수집하는 데 동의합니다.` (대괄호 부분이 링크)
- checkbox 커스텀 스타일 없음 — 브라우저 기본 사용 (안정성 우선)

**제출 버튼:**
- `.btn.btn-md.btn-orange`, width 100%
- 기본: `카카오톡 알림 신청`
- 제출 중: `신청 중…`, disabled
- 완료: `신청 완료 ✓` + disabled (재신청 불가 표시)
- 버튼 height: 40px

**성공 상태 (신청 완료 후 폼 대체):**
```
카카오톡 알림 신청이 완료되었어요.
알림 수신을 원하지 않으면 고객센터에 문의해주세요.
```
font `500 13px/1.6 var(--font-sans)`, color `var(--fg-sec)`, padding `16px 0`

#### Zod 스키마

```typescript
import { z } from 'zod'

const subscribeSchema = z.object({
  phone: z
    .string()
    .regex(/^010-\d{4}-\d{4}$/, '010-XXXX-XXXX 형식으로 입력해주세요'),
  consent: z
    .boolean()
    .refine(v => v === true, '개인정보 수집에 동의해야 신청할 수 있어요'),
})
```

#### 폼 전송

Server Action 호출. 성공 시 컴포넌트 내 `isSubmitted` 상태로 성공 UI 표시.

#### 금지

- 전화번호 클라이언트 콘솔 출력 금지
- 동의 체크박스 없이 제출 가능 상태 금지
- 개인정보처리방침 링크 누락 금지

---

### 5. AdminCardnewsCopyButton

**파일:** `src/components/admin/AdminCardnewsCopyButton.tsx`
**RSC 여부:** `'use client'` (Clipboard API)
**배치:** `/admin/cardnews` 페이지 카드 내, 기존 `CardnewsDownloadButton` 아래 또는 옆

#### 목적

카드뉴스 텍스트(단지명, 가격, 날짜 등)를 클립보드에 복사하여 관리자가 카카오 카페에 수동으로 붙여넣을 수 있도록 돕는다. (OPS-02 scope 축소 — 자동 발행 API 없음)

#### Props

```typescript
interface AdminCardnewsCopyButtonProps {
  text: string   // 복사할 카드뉴스 텍스트 (서버에서 생성 후 props로 전달)
}
```

#### States

| State | 버튼 텍스트 | 시각 |
|-------|-----------|------|
| idle | `텍스트 복사` | `.btn-sm.btn-secondary` |
| copying | `복사 중…` | disabled, opacity 0.7 |
| success | `복사됨 ✓` | `.btn-sm` + color `var(--fg-positive)` + border `1px solid var(--fg-positive)` |
| error | `복사 실패` | `.btn-sm` + color `var(--fg-negative)` |

- success → idle 자동 복귀: 2000ms 후
- error → idle 자동 복귀: 2000ms 후

#### 시각 명세

- **크기:** `.btn-sm` (height 32px, padding 0 12px, font 600 13px)
- **배치:** `CardnewsDownloadButton` 오른쪽에 `gap: 8px` 수평 배치
- **트랜지션:** color, border-color `120ms ease`

#### 코드 스케치

```tsx
'use client'
import { useState } from 'react'

export function AdminCardnewsCopyButton({ text }: AdminCardnewsCopyButtonProps) {
  const [state, setState] = useState<'idle' | 'copying' | 'success' | 'error'>('idle')

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

  const label = {
    idle: '텍스트 복사',
    copying: '복사 중…',
    success: '복사됨 ✓',
    error: '복사 실패',
  }[state]

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={state === 'copying'}
      className="btn btn-sm btn-secondary"
      style={{
        color: state === 'success' ? 'var(--fg-positive)'
             : state === 'error'   ? 'var(--fg-negative)'
             : undefined,
        borderColor: state === 'success' ? 'var(--fg-positive)'
                   : state === 'error'   ? 'var(--fg-negative)'
                   : undefined,
        opacity: state === 'copying' ? 0.7 : 1,
        transition: 'color 120ms ease, border-color 120ms ease',
      }}
      aria-label={label}
      aria-live="polite"
    >
      {label}
    </button>
  )
}
```

#### 금지

- toast / snackbar 팝업 금지 — 버튼 텍스트 인라인 변경으로 피드백
- 성공 상태에 체크 아이콘 이미지 사용 금지 — 텍스트 `✓` 로만

---

## Copywriting Contract

### CTA 레이블

| 컴포넌트 | CTA | 근거 |
|---------|-----|------|
| CompareAddButton (기본) | `비교에 추가 +` | 동사 + 대상 + 행위 명시 |
| CompareAddButton (활성) | `비교 중 ✓` | 현재 상태 표현 |
| CompareAddButton (가득) | `4/4 비교 중` | 한도 정보 전달 |
| CompareAddButton (플로팅) | `비교 보기 (N)` | 선택 수 포함 |
| KakaoChannelSubscribeForm | `카카오톡 알림 신청` | 채널명 명시 |
| AdminCardnewsCopyButton | `텍스트 복사` | 동사 + 대상 명시 |

### 빈 상태 (Empty State)

| 컴포넌트 | 빈 상태 문구 |
|---------|------------|
| CompareTable (< 2개) | `단지를 2개 이상 선택하면 비교할 수 있어요.\n단지 상세 페이지에서 "비교에 추가 +" 버튼을 눌러주세요.` |
| CompareTable (행 값 없음) | 해당 셀에 `-` |
| CompareTable (거래 없음) | `거래 없음` |

### 오류 상태 (Error State)

| 컴포넌트 | 오류 | 문구 |
|---------|------|------|
| KakaoChannelSubscribeForm | 전화번호 형식 | `010-XXXX-XXXX 형식으로 입력해주세요` |
| KakaoChannelSubscribeForm | 동의 미체크 | `개인정보 수집에 동의해야 신청할 수 있어요` |
| KakaoChannelSubscribeForm | Server Action 실패 | `잠시 후 다시 시도해주세요` |
| AdminCardnewsCopyButton | Clipboard API 실패 | `복사 실패` |

### 파괴적 동작 (Destructive Action)

Phase 8 컴포넌트에 파괴적 동작 없음.

- CompareAddButton의 "비교에서 제거" 동작 — 즉시 실행, 확인 불필요 (URL에서 제거, 되돌릴 수 있음)
- KakaoChannelSubscribeForm 구독 취소 — 고객센터 연락 유도 (Phase 8 scope 외)

---

## Registry

- **Design system:** 없음 (`components.json` 없음, Tailwind CSS 3.4+ + 커스텀 CSS 클래스)
- **shadcn 초기화:** 미적용 (기존 `.btn`, `.badge`, `.input`, `.card`, `.chip` 클래스 시스템 사용)
- **third-party UI 블록:** 없음
- **신규 아이콘 라이브러리:** 없음 — 이모지 전용 (👑🔥💬), 기타 아이콘은 기존 inline SVG 패턴

---

## Anti-Patterns (banned)

다음 패턴은 이 Phase 전체에 걸쳐 **금지**한다.

### 전역 금지 (CLAUDE.md 기준)

- `backdrop-filter: blur(...)` — 절대 사용 금지
- `background: linear-gradient(...)` — 모든 컴포넌트 배경에 금지
- `text-gradient` / `background-clip: text` — 금지
- `box-shadow` 색광 (glow) 효과 — `0 0 20px rgba(...)` 형식 금지
- `"Powered by AI"` 또는 이에 준하는 배지 — 금지
- 보라/인디고 계열 (`purple`, `violet`, `indigo`) 브랜드 색상 — 금지
- 배경 gradient orb (`position:absolute; border-radius:50%; filter:blur(...)`) — 금지

### Phase 8 특화 금지

- TierBadge에 애니메이션 (pulse, bounce, spin) — 금지
- CompareTable 단지별 칼럼 배경색 구분 — 금지 (위치로만 구분)
- CompareTable sticky 헤더에 `backdrop-filter` — 금지
- CompareAddButton에 floating 애니메이션 (scale bounce) — 금지
- KakaoChannelSubscribeForm에 전화번호 `console.log` — 보안 금지
- AdminCardnewsCopyButton 성공 시 confetti 등 과도한 피드백 — 금지
- TierBadge에 외부 이미지/SVG 아이콘 — 금지 (이모지만)
- 비교에 추가 진입점으로 지도 핀 클릭 사용 — 범위 외

---

## Accessibility Contract

모든 신규 컴포넌트에 적용.

| 항목 | 기준 |
|------|------|
| 색 대비 | WCAG AA — `--fg-sec`/`--bg-surface` 기준 ≥ 4.5:1 |
| 터치 타겟 | 최소 44×44px (iOS HIG 기준) |
| 키보드 | Tab 가능, Enter/Space 활성화 |
| ARIA | 상태 변화 시 `aria-pressed`, `aria-live` 필수 |
| 포커스 | `outline: 2px solid var(--dj-orange); outline-offset: 2px` |
| 스크린리더 | TierBadge `aria-label="골드 등급"` 등 의미 설명 |
| 이모지 | `aria-label` 또는 `role="img"` + `aria-label` 제공 |

---

## Pre-Populated Sources

| 결정 | 출처 |
|------|------|
| TierBadge 이모지 매핑 (👑🔥💬) | 사용자 결정 (locked) |
| CompareTable "이돈쪽 종이" 에디토리얼 스타일 | 사용자 결정 (locked) |
| 비교 진입점: 단지 상세 페이지만 | 사용자 결정 (locked) |
| CompareTable 최대 4개 | RESEARCH.md (DIFF-06) |
| nuqs URL state | RESEARCH.md (Standard Stack) |
| OPS-02 scope: 복사 버튼 + 수동 카페 붙여넣기 | RESEARCH.md (OPS-02 대안 분석) |
| Tailwind CSS 3.4+, 커스텀 CSS 클래스 시스템 | CLAUDE.md + globals.css |
| 신규 색상 토큰 없음 | globals.css 기존 토큰 완비 |
| RSC 기본, 클라이언트 최소화 | CLAUDE.md 아키텍처 규칙 |
| 전화번호 암호화 저장 | RESEARCH.md (Security Domain) |
| AI 슬롭 금지 목록 | CLAUDE.md |
