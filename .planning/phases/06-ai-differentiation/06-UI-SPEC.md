---
phase: 6
name: AI·차별화기술
status: draft
date: 2026-05-08
---

# Phase 6 UI Design Contract

## Design System State

**Tool:** None (Tailwind CSS 3.4+ with custom CSS tokens — no shadcn)
**Font:** Pretendard Variable (`var(--font-sans)`)
**Token source:** `src/app/globals.css`

### Color Tokens (canonical, do not invent new values)

| Token | Value | Role |
|---|---|---|
| `--dj-orange` | `#ea580c` | Brand accent, primary CTA, active states |
| `--dj-orange-tint` | `#fff1e8` | Orange badge/chip background |
| `--dj-orange-dark` | `#c2410c` | Orange hover state |
| `--fg-pri` | `#171719` | Primary text |
| `--fg-sec` | `rgba(55,56,60,0.61)` | Secondary text, labels |
| `--fg-tertiary` | `rgba(55,56,60,0.35)` | Placeholder, metadata |
| `--fg-positive` | `#16a34a` | Positive delta (price lower than market) |
| `--fg-negative` | `#dc2626` | Negative delta (price higher than market), destructive |
| `--bg-canvas` | `#f7f7f8` | Page background |
| `--bg-surface` | `#ffffff` | Card background |
| `--bg-surface-2` | `#f4f4f5` | Table header, icon background |
| `--bg-positive-tint` | `#ecfdf5` | Positive badge background |
| `--bg-negative-tint` | `#fef2f2` | Negative badge background |
| `--bg-cautionary-tint` | `#fffbeb` | Warning badge background |
| `--color-cool-10` | `#171719` | Dark surface (chat user bubble background) |
| `--color-orange-30` | `#ea580c` | Cautionary badge text (same value as `--dj-orange`) |
| `--line-default` | `rgba(112,115,124,0.22)` | Card borders, table separators |
| `--line-subtle` | `rgba(112,115,124,0.12)` | Row dividers |

### Spacing Scale

8-point base. Multiples of 4 only. Established values from existing pages:

| Step | px | Usage |
|---|---|---|
| 2 | 8px | Gap between icon and text, badge padding |
| 3 | 12px | Chip/button small padding, section inner gap |
| 4 | 16px | Card section gap, tab padding, button medium |
| 5 | 20px | Card padding (compact cards) |
| 6 | 24px | Card padding (standard), chart margins |
| 7 | 28px | Card padding (header card) |
| 8 | 32px | Page horizontal padding |

Touch targets: minimum 40px height for interactive elements (matches `.btn-md`).

### Typography Scale

| Role | Spec | Token class |
|---|---|---|
| Page title / H1 | `700 28px/1.25 var(--font-sans)`, `letter-spacing: -0.024em` | — |
| Section heading | `700 18px/1.4 var(--font-sans)`, `letter-spacing: -0.005em` | — |
| Card heading | `700 15–16px/1.4 var(--font-sans)` | — |
| Body / label | `500 13px/1.3 var(--font-sans)` | — |
| Small / meta | `500 11–12px/1 var(--font-sans)` | — |
| Price / tabular | `600–700 13–32px/1 var(--font-sans)` | `.tnum` |

Two weights only: **500 (medium)** and **600–700 (semibold/bold)**. Do not introduce 400 or 800 in new components.

### Radius Scale (existing tokens)

| Token | Value | Use |
|---|---|---|
| `--radius-md` | `8px` | Buttons, small elements |
| `--radius-lg` | `12px` | Inputs, medium buttons |
| `--radius-xl` | `16px` | Large buttons |
| `--radius-3xl` | `24px` | Cards (`.card`) |

### Component Classes (reuse, do not re-implement)

- `.card` — white surface, `--radius-3xl`, `--line-default` border
- `.badge` — 22px height, variants: `.orange`, `.pos`, `.neg`, `.caut`, `.neutral`
- `.chip` — pill shape, variants: `.selected`, `.orange`, `.brand`, `.sm`
- `.btn` + `.btn-md` + `.btn-orange` — standard CTA button
- `.tab` / `.tabs` — border-bottom tab bar, `.tab[data-orange-active='true']` for active
- `.tnum` — tabular numeric figures

---

## Anti-Pattern Prohibitions (enforced project-wide)

These are banned regardless of what is "conventional" for AI/chat UIs:

- No `backdrop-filter: blur(...)` on any element
- No gradient text (`background-clip: text`)
- No glow animations (`box-shadow` color pulsing, `filter: blur` animations)
- No "Powered by AI" badges or "AI" marketing labels visible to end users
- No purple or indigo brand colors
- No gradient background orbs or decorative blobs
- No skeleton loaders with shimmer/gradient animations — use static gray placeholder rectangles instead
- No "typing indicator" dot animations in the chat panel — use a simple text "응답 중..." instead

---

## Component 1: 갭 라벨 (Gap Label)

### Location

단지 상세 페이지 (`/complexes/[id]`) — 가격 섹션 내 거래 내역 상단. Specifically: immediately above `<DealTypeTabs>` inside the "실거래가 추이" card.

### Visual Design

The label is an inline badge rendered inside the existing "실거래가 추이" card header row, aligned right of the `<h3>` heading.

```
실거래가 추이                    [시세보다 500만원 높음 ↑]
─────────────────────────────────────────────────────
[매매] [전세] [월세]
```

**Badge anatomy:**

```
<span class="badge [neg|pos]">
  [ArrowIcon 10×10]  시세보다 {N}만원 {높음|낮음}
</span>
```

- Height: 22px (`.badge` standard)
- Padding: 0 8px
- Border-radius: 6px
- Font: `600 11px/1 var(--font-sans)`, `letter-spacing: 0.02em`
- "높음" (listing above market): `.badge.neg` — `bg: var(--bg-negative-tint)`, `color: var(--fg-negative)`
- "낮음" (listing below market): `.badge.pos` — `bg: var(--bg-positive-tint)`, `color: var(--fg-positive)`
- Arrow icon: 10×10 SVG, `stroke="currentColor"`, strokeWidth 2.5. Up arrow for "높음", down arrow for "낮음"

**Exact copy:**
- Above market: `시세보다 {price}만원 높음`
- Below market: `시세보다 {price}만원 낮음`
- Price format: integer 만원 (e.g. 500, 1200). If >= 10000만 use 억 format: `1억 500만원`. Match existing `formatPrice()` logic in `complexes/[id]/page.tsx`.

### States

| State | Render |
|---|---|
| Data available, above market | `.badge.neg` with up-arrow icon |
| Data available, below market | `.badge.pos` with down-arrow icon |
| No listing price data | Component not rendered (null return) — do not show a placeholder or "데이터 없음" |
| No transaction data for comparison | Component not rendered (null return) |
| Gap is zero | Component not rendered (edge case) |

### Accessibility

- `aria-label="매물 시세 비교: 시세보다 {N}만원 {높음|낮음}"` on the `<span>`
- Color is not the only differentiator — icon direction also distinguishes the two states

### Data Contract

```typescript
interface GapLabelProps {
  listingPricePerPy: number | null  // from listing_prices.price_per_py (most recent)
  avgTransactionPricePerPy: number | null  // avg price_per_py, transactions, last 12 months
}
```

Computation: `gap = listingPricePerPy - avgTransactionPricePerPy`. Render only when both values are non-null and `gap !== 0`. Show "높음" when `gap > 0`, "낮음" when `gap < 0`.

Server-side fetch in `complexes/[id]/page.tsx` using `createReadonlyClient()`. Add to existing `Promise.all()` — do not add a separate waterfall fetch.

---

## Component 2: 지역 통계 탭 (District Statistics Tab)

### Location

단지 상세 페이지 — new tab inserted in the main column, directly after `<ValueQuadrantChart>` (or in place of it when quadrant data is unavailable). The tab does not replace any existing card; it is a new standalone `.card`.

### Visual Design

**Card structure:**

```
┌─────────────────────────────────────────────────┐
│ 지역 통계                [시군구명] 기준          │  ← card header row
│─────────────────────────────────────────────────│
│ SGIS 통계청 기준 · {year}년 {quarter}분기        │  ← meta label (fg-tertiary, 11px)
│                                                 │
│  인구수          세대수                          │
│  123,456명       56,789세대                      │  ← two-column stat display
└─────────────────────────────────────────────────┘
```

**Card heading row:**
- `<h3>` `700 15px/1.4` left
- `<span>` `500 12px/1 var(--fg-tertiary)` right — district name e.g. "성산구 기준"

**Meta label:** `500 11px/1 var(--font-sans)`, `color: var(--fg-tertiary)`, `margin-bottom: 16px`

**Stat block (2-column grid):**

Each stat cell:
```
label:  500 11px/1  color: var(--fg-tertiary)   margin-bottom: 4px
value:  700 24px/1  color: var(--fg-pri)         class: tnum
```

Layout: `display: grid; grid-template-columns: 1fr 1fr; gap: 16px`

**Number formatting:**
- 인구수: `{n.toLocaleString('ko-KR')}명`
- 세대수: `{n.toLocaleString('ko-KR')}세대`

### States

| State | Render |
|---|---|
| Data loaded | Full stat block as above |
| No district match (complex has no si/gu) | Card not rendered |
| district_stats row missing | Render card with: `font: 500 13px/1.6 var(--font-sans)`, `color: var(--fg-tertiary)`, `text-align: center`, `padding: 32px 0` — copy: "해당 지역 통계 데이터가 아직 수집되지 않았습니다." |
| Loading (client-side fetch, if applicable) | Static text placeholder: `font: 500 13px/1.6`, `color: var(--fg-tertiary)` — copy: "통계를 불러오는 중입니다." |

Note: preferred implementation is server-side fetch (ISR pattern). Loading state only applies if a client component is required.

### Accessibility

- `<h3>` heading with card-level heading semantics
- Stat values paired with visible labels — no `aria-label` on individual numbers needed (label is adjacent)
- `role="region" aria-labelledby="district-stats-heading"` on the card container

### Data Contract

```typescript
interface DistrictStatsCardProps {
  districtName: string      // e.g. "성산구"
  population: number | null
  households: number | null
  dataYear: number | null
  dataQuarter: number | null  // 1–4
}
```

Source: `district_stats` table (new in Phase 6). Query keyed on `complex.si + complex.gu`.

---

## Component 3: RAG AI 상담 패널 (AI Consultation Panel)

### Location

단지 상세 페이지:
1. **Entry point:** floating button, fixed position, bottom-right corner of viewport
2. **Panel:** slides in from right edge, overlays the page (not a modal overlay — page remains scrollable behind it)

### Entry Button

```
position: fixed
bottom: 24px
right: 24px
z-index: 100
```

**Button anatomy:**
```
<button class="btn btn-md btn-orange" style="height: 44px; padding: 0 18px; gap: 8px;">
  <ChatIcon 16×16 />
  AI 상담
</button>
```

- Height: 44px (minimum touch target)
- Background: `var(--dj-orange)`
- Hover: `var(--dj-orange-dark)`
- Border-radius: `var(--radius-lg)` (12px)
- Font: `600 14px/1 var(--font-sans)`
- Icon: simple speech-bubble or message SVG, `stroke="currentColor"`, strokeWidth 2, no fill

**Do not use:**
- Circular FAB shape
- Pulsing ring animation
- "✨ AI" or "🤖" emoji
- "Powered by Claude" text on the button

When panel is open, button changes to close trigger:
```
<button class="btn btn-md btn-secondary" style="height: 44px; padding: 0 18px; gap: 8px;">
  <XIcon 14×14 />
  닫기
</button>
```

### Panel Design

```
position: fixed
top: 0
right: 0
width: 400px  (min: 320px on narrow viewports)
height: 100vh
z-index: 200
background: var(--bg-surface)
border-left: 1px solid var(--line-default)
box-shadow: -4px 0 24px rgba(0,0,0,0.08)
display: flex
flex-direction: column
```

**Panel header (60px height):**
```
padding: 0 20px
border-bottom: 1px solid var(--line-default)
display: flex
align-items: center
gap: 12px
```

Content:
- Left: `<span style="font: 700 15px/1.4 var(--font-sans)">{complexName} 상담</span>`
- Right: close button — `<button class="btn btn-ghost btn-icon">` with X icon

**No "AI", "Claude", "GPT", or chatbot branding in the panel header.**

**Disclaimer strip (below header, 36px height):**
```
background: var(--bg-cautionary-tint)
border-bottom: 1px solid rgba(180,120,0,0.15)
padding: 8px 16px
font: 500 11px/1.4 var(--font-sans)
color: rgba(120,80,0,0.75)
```
Copy: `단지 DB 데이터 기반 응답입니다. 투자 조언이 아닙니다.`

**Message area:**
```
flex: 1
overflow-y: auto
padding: 16px
display: flex
flex-direction: column
gap: 12px
```

**Message bubbles:**

User message:
```
align-self: flex-end
max-width: 80%
background: var(--color-cool-10)
color: #fff
border-radius: 12px 12px 2px 12px
padding: 10px 14px
font: 500 13px/1.5 var(--font-sans)
```

Assistant message:
```
align-self: flex-start
max-width: 85%
background: var(--bg-surface-2)
color: var(--fg-pri)
border-radius: 12px 12px 12px 2px
padding: 10px 14px
font: 500 13px/1.5 var(--font-sans)
border: 1px solid var(--line-subtle)
```

**"정보 없음" response styling:** same as assistant bubble. No special styling — the copy itself communicates the boundary: `"해당 정보는 단지 데이터에 없습니다."`.

**Input area (fixed at panel bottom):**
```
border-top: 1px solid var(--line-default)
padding: 12px 16px
display: flex
gap: 8px
```

Input field: `class="input"` style override — `height: 40px; border-radius: var(--radius-lg); font-size: 14px`
Send button: `class="btn btn-md btn-orange"` with SendIcon 16×16, `width: 40px; padding: 0`

### States

| State | Render |
|---|---|
| Panel closed | Only floating button visible |
| Panel open, no messages | Welcome message in assistant bubble: `"안녕하세요. {complexName}에 대해 궁금한 점을 물어보세요."` |
| Sending (awaiting response) | Static text "응답 중..." in assistant bubble with `color: var(--fg-tertiary)`. **No dot animation.** |
| Response received | Full assistant bubble |
| API error | Assistant bubble with `color: var(--fg-negative)`: `"요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."` |
| "정보 없음" from RAG | Assistant bubble, normal styling: `"해당 정보는 단지 데이터에 없습니다."` |

### Panel Animation

Slide-in from right: `transform: translateX(100%)` → `translateX(0)`. Transition: `transform 200ms cubic-bezier(0.16,1,0.3,1)`. No fade, no blur.

Panel open adds `overflow: hidden` to `<body>` to prevent background scroll.

### Accessibility

- Panel root: `role="dialog" aria-label="{complexName} AI 상담" aria-modal="true"`
- When panel opens: focus moves to close button
- When panel closes: focus returns to trigger button
- Input: `aria-label="질문 입력"`
- Send button: `aria-label="전송"`
- Message list: `role="log" aria-live="polite" aria-label="상담 내용"`
- Keyboard: `Escape` closes panel

### Data Contract

```typescript
interface AiPanelProps {
  complexId: string
  complexName: string
}

// Message shape (client state)
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  isError?: boolean
  isPending?: boolean
}
```

API: POST `/api/chat/complex` with `{ complexId, messages: ChatMessage[] }`. Streamed response preferred (SSE or chunked). Server Action not appropriate here — use Route Handler.

---

## Component 4: AD-02 어드민 AI 카피 어시스트 (Admin Ad Copy Assistant)

### Location

어드민 광고 등록/수정 폼. Inserted below the ad copy text input field (`<textarea>` for 광고 카피). The existing form layout pattern from `/admin/ads/page.tsx` applies: white card, table/form rows.

### Visual Design

**Trigger:** AI 검토 button appears as a secondary action beside the copy textarea:

```
[카피 입력 textarea — full width                    ]
[AI 검토  btn-secondary btn-sm]  ← 8px below textarea
```

Button: `class="btn btn-sm btn-secondary"` with SparkleIcon 14×14 (simple 4-point star SVG, **not** a gradient star). Copy: `AI 검토`.

**Results panel** (appears below the button after API response):

```
┌─────────────────────────────────────────────────┐
│ 검토 결과                                        │  ← 500 12px fg-sec
│─────────────────────────────────────────────────│
│ 위반 가능 표현                                   │  ← 600 12px fg-negative (only if violations[])
│ · "최저가 보장"                                  │  ← 500 12px fg-pri, list
│ · "100% 확실한"                                  │
│                                                 │
│ 개선 제안                                        │  ← 600 12px fg-sec (only if suggestions[])
│ · "합리적인 가격대를 제공합니다"로 변경 권장       │  ← 500 12px fg-pri
└─────────────────────────────────────────────────┘
```

**Panel container:**
```
margin-top: 8px
border: 1px solid var(--line-default)
border-radius: var(--radius-md)
padding: 12px 16px
background: var(--bg-surface)
font-family: var(--font-sans)
```

**Section labels:**
- "위반 가능 표현": `font: 600 12px/1.4`, `color: var(--fg-negative)`, `margin-bottom: 6px`
- "개선 제안": `font: 600 12px/1.4`, `color: var(--fg-sec)`, `margin-bottom: 6px`

**List items:** `font: 500 12px/1.6`, `color: var(--fg-pri)`. Prefix with `·` (middle dot), `padding-left: 8px`.

**Empty result (no violations, no suggestions):**
```
font: 500 12px/1.4 var(--font-sans)
color: var(--fg-positive)
```
Copy: `"검토 결과 특이 사항이 없습니다."`

### States

| State | Render |
|---|---|
| Idle (no review triggered) | Button only, no panel |
| Loading (API call in flight) | Button disabled (`opacity: 0.5; cursor: not-allowed`), panel shows: `"검토 중..."` in `fg-tertiary 12px` |
| Results with violations | Panel with violations list (red label) + suggestions list |
| Results with suggestions only | Panel with suggestions list only (no red label) |
| Results clean | Panel with green "특이 사항 없음" copy |
| API error (non-blocking) | Panel with warning copy: `"AI 검토 요청에 실패했습니다. 직접 검토 후 등록하세요."` in `color: var(--bg-cautionary-tint)` background, `fg-negative` text |

The form submit (광고 등록/수정) is **never blocked** by AI review state. The results are advisory only.

### Accessibility

- Button: `aria-label="광고 카피 AI 검토"` (prevents "AI 검토" alone being ambiguous)
- Results panel: `role="status" aria-live="polite"` — updates announce to screen readers
- When loading: `aria-busy="true"` on the panel
- Violation items: `<ul>` list, not `<div>` stacks

### Data Contract

```typescript
// Input to server action / route handler
interface AdCopyReviewRequest {
  copy: string  // ad copy text to review
}

// Response (JSON from Claude API via server)
interface AdCopyReviewResult {
  violations: string[]
  suggestions: string[]
}
```

Implementation: POST `/api/admin/ad-copy-review`. Returns `AdCopyReviewResult`. On network failure, resolve to `{ violations: [], suggestions: [] }` with `isError: true` flag to trigger warning state.

---

## Component 5: /admin/ads ROI 대시보드 (Admin Ads ROI Dashboard)

### Location

`/admin/ads` page — inserted as a new section above the existing campaigns table. The existing page uses a single card with `<table>` for campaign list. The ROI dashboard is a separate `.card` above it.

### Visual Design

```
┌─── ROI 대시보드 ──────────────────────────────────────────────────────────────┐
│ 노출    클릭    전환    CTR%    이상트래픽                                        │
│ col1   col2   col3   col4    col5 (flag column)                               │
│─────────────────────────────────────────────────────────────────────────────  │
│ [table rows per campaign]                                                     │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Section heading (above card):**
```
font: 700 16px/1.4 var(--font-sans)
letter-spacing: -0.02em
margin: 0 0 12px
color: var(--fg-pri)
```
Copy: `광고 ROI 현황`

**Table header row:**
```
background: var(--bg-surface-2)
border-bottom: 1px solid var(--line-default)
```

Columns:

| Column | Header copy | Width | Alignment | Font |
|---|---|---|---|---|
| 광고명 | 광고명 | auto | left | `600 12px` fg-sec |
| 노출 | 노출 | 80px | right | `600 12px` fg-sec |
| 클릭 | 클릭 | 80px | right | `600 12px` fg-sec |
| 전환 | 전환 | 80px | right | `600 12px` fg-sec |
| CTR% | CTR% | 80px | right | `600 12px` fg-sec |
| 이상트래픽 | 이상트래픽 | 100px | center | `600 12px` fg-sec |

Header cell padding: `10px 16px`.

**Table data rows:**

- Odd/even: no alternating color (consistent with existing admin table pattern)
- Row separator: `border-bottom: 1px solid var(--line-subtle)` (last row: none)
- Cell padding: `12px 16px`

**Cell styles:**

- 광고명: `600 13px/1.3 var(--font-sans)` fg-pri
- 노출/클릭/전환: `500 13px/1 var(--font-sans)` fg-sec, `.tnum`, right-aligned, `n.toLocaleString('ko-KR')`
- CTR%: `600 13px/1 var(--font-sans)` fg-pri, `.tnum`, right-aligned, format: `{n.toFixed(1)}%`
- 이상트래픽: center-aligned

**Anomaly flag (이상트래픽 column):**

When `anomaly: true`:
```
<span class="badge caut">이상감지</span>
```
`.badge.caut`: `background: var(--bg-cautionary-tint)`, `color: var(--color-orange-30)`

When `anomaly: false`:
```
<span style="font: 500 12px/1 var(--font-sans); color: var(--fg-tertiary)">—</span>
```

**No color-coded row highlight** for anomaly rows — the badge in the dedicated column is the sole indicator.

### States

| State | Render |
|---|---|
| Loading (SSR — no loading state needed; page uses `revalidate = 0`) | N/A (server component) |
| No campaigns | Show existing "등록된 광고 캠페인이 없습니다." empty state (already implemented), ROI card not rendered |
| Campaign has zero impressions | Show `0` in all numeric cells, `—` in CTR% cell |
| CTR% formula: `(conversions / clicks) × 100` | Show `—` when clicks = 0 (avoid divide-by-zero) |

### Accessibility

- `<table>` with `<caption class="sr-only">광고 ROI 현황</caption>`
- Column headers: `<th scope="col">`
- Numeric cells: no additional ARIA needed — visible labels in headers are sufficient
- Anomaly badge: `aria-label="이상 트래픽 감지됨"` on `.badge.caut`

### Data Contract

```typescript
interface AdRoiRow {
  campaignId: string
  title: string
  impressions: number
  clicks: number
  conversions: number
  ctr: number | null  // null when clicks === 0
  anomaly: boolean
}
```

Source: aggregate query on `ad_events` grouped by `campaign_id` and `event_type`. Anomaly flag: `true` if any `ad_events` row for this campaign has `is_anomaly = true` within the active period.

---

## Copywriting Contract

| Element | Copy (Korean) | Notes |
|---|---|---|
| Gap label — above market | `시세보다 {N}만원 높음` | N = integer 만원 |
| Gap label — below market | `시세보다 {N}만원 낮음` | N = integer 만원 |
| District stats — no data | `해당 지역 통계 데이터가 아직 수집되지 않았습니다.` | center-aligned, fg-tertiary |
| District stats — loading | `통계를 불러오는 중입니다.` | only if client fetch |
| AI panel — entry button | `AI 상담` | no emoji, no AI branding |
| AI panel — close button | `닫기` | |
| AI panel — disclaimer | `단지 DB 데이터 기반 응답입니다. 투자 조언이 아닙니다.` | cautionary strip |
| AI panel — welcome | `안녕하세요. {complexName}에 대해 궁금한 점을 물어보세요.` | assistant bubble |
| AI panel — pending | `응답 중...` | static text, fg-tertiary |
| AI panel — no data | `해당 정보는 단지 데이터에 없습니다.` | assistant bubble, normal styling |
| AI panel — API error | `요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.` | assistant bubble, fg-negative |
| Ad copy review — button | `AI 검토` | btn-sm, secondary |
| Ad copy review — loading | `검토 중...` | fg-tertiary, 12px |
| Ad copy review — clean | `검토 결과 특이 사항이 없습니다.` | fg-positive |
| Ad copy review — error | `AI 검토 요청에 실패했습니다. 직접 검토 후 등록하세요.` | non-blocking warning |
| ROI dashboard — section | `광고 ROI 현황` | section heading h2 |
| ROI — anomaly badge | `이상감지` | badge.caut |
| ROI — no anomaly | `—` | fg-tertiary |

---

## Registry

No shadcn. No third-party component registries. All components built from existing globals.css token system and custom TSX.

---

## Implementation Notes for Executor

1. **Gap label:** Server-side computation in `complexes/[id]/page.tsx`. Add `getGapLabel(id, supabase)` to the existing `Promise.all()` array. Return `null` from the function when data is missing. Pass result as a prop to a `<GapLabel>` client component (or render inline as JSX in the server page).

2. **District stats card:** New `<DistrictStatsCard>` server component. Fetched in the same `Promise.all()` in `complexes/[id]/page.tsx`. Positioned after `<ValueQuadrantChart>` in the main column flex stack (gap: 16px).

3. **AI panel:** `'use client'` component. Local state for open/closed, messages array. API calls via `fetch('/api/chat/complex', ...)`. Panel root element uses `position: fixed` — must be rendered at the bottom of the page component tree to avoid stacking context conflicts with the sticky header.

4. **Ad copy review:** `'use client'` within the admin form. Triggered by button click, not automatically on input. State: `idle | loading | result | error`. No debounce needed — explicit trigger only.

5. **ROI dashboard:** Server component in `/admin/ads/page.tsx`. Add ROI aggregate query to the existing data fetch. Render `.card` above the existing campaigns table `.card`.

6. **Revalidation:** `complexes/[id]/page.tsx` uses `revalidate = 86400`. Gap label and district stats data follow the same ISR window. No separate revalidation tag needed.

7. **Mobile:** No dedicated mobile breakpoint spec for Phase 6 — the existing page is desktop-first (1280px max-width grid). The AI panel collapses to `width: 100vw` on viewports < 480px using an inline media query or CSS variable.

---

*Generated: 2026-05-08*
*Consumed by: gsd-planner, gsd-executor, gsd-ui-checker, gsd-ui-auditor*
