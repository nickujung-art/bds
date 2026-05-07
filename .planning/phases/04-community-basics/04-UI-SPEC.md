# Phase 4: 커뮤니티 기초 — UI Design Contract

**Created:** 2026-05-07
**Status:** Ready for planning
**Phase:** 4 — 커뮤니티 기초 (V1.5)

---

## 1. Visual Direction

### Style Statement

**Swiss / Editorial Data-First** — 스위스 국제 타이포그래피 원칙을 부동산 데이터 UI에 적용한다.
격자 기반 정보 위계, 기능적 색상 사용, 명확한 텍스트 크기 대비를 통해 실수요자가 빠르게 정보를 읽을 수 있는 인터페이스를 만든다.

**왜 이 방향인가:**
- 창원·김해 실수요자(Persona A)는 "이웃 의견"을 신뢰성 있게 보고 싶다. 장식적 UI는 신뢰도를 낮춘다.
- 기존 코드베이스(ReviewForm, ReviewList, AdminReports)가 이미 이 방향으로 확립되어 있다.
- 데이터가 주인공이다 — GPS 인증, SLA 상태, 분양가 범위 등 숫자와 상태 정보가 UI의 핵심이다.

### Design Principles

1. **데이터가 장식을 이긴다.** 모든 색상·아이콘·레이블은 정보를 전달하기 위해 존재한다. 장식용 요소는 사용하지 않는다.
2. **상태를 명확히 드러낸다.** GPS 인증 여부, SLA 초과 여부, 알림 토픽 구독 여부 — 모든 상태는 즉시 읽혀야 한다.
3. **기존 토큰 위에 쌓는다.** 새 색상·간격·폰트 크기를 추가하지 않는다. `globals.css` 에 정의된 토큰만 사용한다.
4. **최소한의 인터랙션.** 댓글 토글, GPS 버튼 상태, 알림 토픽 토글 — 각 인터랙션은 하나의 명확한 목적을 가진다.
5. **모바일에서 손가락으로 조작 가능.** 모든 탭 가능한 요소의 최소 터치 영역은 44×44px.

### Anti-patterns (This Phase)

- `backdrop-blur` — 절대 금지 (CLAUDE.md)
- `gradient-text` — 절대 금지 (CLAUDE.md)
- glow 애니메이션 — 절대 금지 (CLAUDE.md)
- 보라/인디고 색상 — 절대 금지 (CLAUDE.md)
- 배경 gradient orb — 절대 금지 (CLAUDE.md)
- 분양 카드를 균일 간격 4열 그리드로 처리하는 것 — 가격 범위·입주일·세대수의 시각적 위계를 살릴 것
- GPS 배지를 초록색만으로 처리하는 것 — 색맹 사용자를 위해 텍스트 레이블 필수
- SLA 배지를 빨강/초록 이진법으로 처리하는 것 — 3단계 구분 필요 (정상/임박/초과)
- 댓글 섹션에 카드를 중첩하는 것 — 후기 카드 내부 댓글은 구분선으로 처리
- 카페 외부 링크에 버튼 스타일을 쓰는 것 — 텍스트 링크 + 외부 링크 아이콘으로 처리

---

## 2. Design Tokens

### Color System

기존 `globals.css` 토큰을 그대로 사용한다. Phase 4에서 신규 CSS 변수를 추가하지 않는다.

**색상 비율 (60/30/10 원칙):**
- 캔버스(`--bg-canvas`) + 표면(`--bg-surface`): ~60% — 페이지 배경, 카드 배경
- 중립(`--bg-surface-2`, 라인, 보조 전경): ~30% — 구분선, 보조 텍스트, 비활성 상태
- 브랜드(`--dj-orange`) + 시맨틱(positive/negative/cautionary): ~10% — CTA, 상태 표시

| 역할 | 토큰 | 값 | 사용처 |
|------|------|-----|--------|
| 브랜드 주색 | `--dj-orange` | `#ea580c` | CTA 버튼, 활성 탭, 별점 |
| 브랜드 틴트 | `--dj-orange-tint` | `#fff1e8` | GPS 버튼 idle 배경, 오렌지 칩 배경 |
| 기본 전경 | `--fg-pri` | `#171719` | 본문, 단지명, 댓글 내용 |
| 보조 전경 | `--fg-sec` | `rgba(55,56,60,.61)` | 날짜, 보조 레이블 |
| 3차 전경 | `--fg-tertiary` | `rgba(55,56,60,.35)` | 빈 상태 텍스트, placeholder |
| 브랜드 링크 | `--fg-brand` | `#0066ff` | 외부 링크, 텍스트 앵커 |
| 양성(초록) | `--fg-positive` | `#16a34a` | GPS 인증 배지 텍스트 |
| 음성(빨강) | `--fg-negative` | `#dc2626` | SLA 초과 배지 텍스트, 에러 텍스트 |
| 표면 | `--bg-surface` | `#ffffff` | 카드 배경 |
| 표면2 | `--bg-surface-2` | `#f4f4f5` | 테이블 헤더, 댓글 구분 배경 |
| 캔버스 | `--bg-canvas` | `#f7f7f8` | 페이지 배경 |
| 양성 틴트 | `--bg-positive-tint` | `#ecfdf5` | GPS 인증 배지 배경 |
| 음성 틴트 | `--bg-negative-tint` | `#fef2f2` | SLA 초과 배지 배경, 에러 틴트 |
| 주의 틴트 | `--bg-cautionary-tint` | `#fffbeb` | SLA 임박 배지 배경 |
| 라인 기본 | `--line-default` | `rgba(112,115,124,.22)` | 카드 테두리, 구분선 |
| 라인 미세 | `--line-subtle` | `rgba(112,115,124,.12)` | 댓글 구분선, 행간 구분선 |

**GPS 배지 색상 (색맹 안전):**
- 인증됨: `--bg-positive-tint` 배경 + `--fg-positive` 텍스트 + "GPS 인증" 레이블 (색에만 의존하지 않음)
- 미인증: 배지 없음 (침묵이 기본값)

**SLA 배지 3단계:**
- 정상 (0~16h): `--bg-surface-2` 배경 + `--fg-sec` 텍스트
- 임박 (16~24h): `--bg-cautionary-tint` 배경 + `#d97706` 텍스트
- 초과 (24h+): `--bg-negative-tint` 배경 + `--fg-negative` 텍스트

### Typography

기존 `--font-sans` (Pretendard) 단일 폰트를 사용한다.

| 역할 | 크기/굵기/행간 | 사용처 |
|------|--------------|--------|
| 페이지 제목 | `700 22px/1.3` | /presale 페이지 h1, 섹션 제목 |
| 섹션 제목 | `700 16px/1.4` | 카드 내 소제목, 시설 탭 헤더 |
| 본문 | `500 13px/1.6` | 댓글 내용, 분양 카드 설명 |
| 소형 | `500 11px/1` | 배지, 칩, 테이블 헤더, 날짜, 캐릭터 카운트, 보조 레이블 |

**굵기 2단계만 사용:** `700` (제목: 22px, 16px) + `500` (본문·소형·배지·버튼 전부). `600` 사용 금지.
GPS 배지 `10px`은 기존 코드 호환 특수값 — Typography 표 최소(11px) 아래 유일한 예외.

숫자(가격, 세대수): `tnum` 클래스 (tabular-nums) 적용 필수.
레터스페이싱: 제목은 `-0.02em`, 본문은 기본값.

### Spacing & Layout

8포인트 그리드 기반. 예외 없음.

| 토큰명 | 값 | 사용처 |
|--------|-----|--------|
| `space-4` | 4px | 배지 내부 padding, 아이콘-텍스트 gap |
| `space-8` | 8px | 인라인 요소 gap, 댓글 행간 |
| `space-12` | 12px | 버튼 padding, 폼 요소 gap |
| `space-16` | 16px | 카드 내부 padding (소형), 섹션 내 요소 gap |
| `space-20` | 20px | 카드 내부 padding (표준) — 4의 배수, 16px과 24px 사이 중간값 필요 시 사용 |
| `space-24` | 24px | 카드 내부 padding (표준 large) |
| `space-32` | 32px | 페이지 padding, 섹션 간 gap |
| `space-48` | 48px | 빈 상태 수직 padding |

**그리드:**
- 랜딩 분양 섹션: `grid-template-columns: repeat(3, 1fr)` (≥1024px), `repeat(2, 1fr)` (≥640px), `1fr` (<640px)
- /presale 페이지: 2열 그리드 + 우측 필터 패널 패턴 (총 `max-width: 1100px`)
- 프로필 페이지 알림 토픽: 단일 컬럼, `max-width: 640px`

**반응형 breakpoint:**
- Mobile: `< 640px`
- Tablet: `640px ~ 1023px`
- Desktop: `>= 1024px`

---

## 3. Component Specifications

### 3-1. CommentSection

**위치:** `src/components/reviews/CommentSection.tsx` (신규 Client Component)
**역할:** ReviewList 내 각 후기 카드 하단에 인라인 댓글 표시 + 토글

**레이아웃:**
```
[ 후기 내용 (ReviewList 기존) ]
─────────────────── (line-subtle 구분선)
[ 댓글 3개 (기본 표시) ]
[ "댓글 N개 더 보기" 텍스트 링크 ] ← N > 3일 때
[ 댓글 작성 폼 ] ← 로그인 사용자만
```

**댓글 아이템 구조:**
- 상단 행: 익명 닉네임(email 앞 5자 + "***") + 날짜 (`--fg-tertiary`, `500 11px/1`)
- 내용: `500 13px/1.55 --fg-pri`
- 신고 버튼: 우상단, 기존 `ReportButton` 컴포넌트 재사용 (`target_type='comment'`)
- 아이템 간격: `padding: 10px 0`, `borderBottom: 1px solid var(--line-subtle)` (마지막 제외)

**빈 상태:**
```
댓글이 없습니다. 첫 번째 의견을 남겨보세요.
```
색상: `--fg-tertiary`, 크기: `500 11px/1.4`, 정렬: left (중앙 정렬 금지)

**에러 상태:**
```
댓글을 불러오지 못했습니다. 페이지를 새로고침해 주세요.
```

**토글 더 보기 텍스트:**
- 닫힘: `댓글 {N}개 더 보기 ↓` (`500 11px/1 --dj-orange`)
- 열림: `댓글 접기 ↑` (`500 11px/1 --fg-sec`)
- 배경 없음, 밑줄 없음, 커서 pointer

**접근성:**
- `aria-expanded` 토글 버튼
- 각 댓글 아이템: `role="article"`, `aria-label="댓글"`

---

### 3-2. CommentForm

**위치:** `src/components/reviews/CommentSection.tsx` 내부 (별도 파일 불필요, 100줄 이하)
**조건:** 로그인 사용자만 렌더. 미로그인 시 "로그인하면 댓글을 달 수 있어요." 텍스트 + 로그인 링크.

**구조 (ReviewForm 패턴 참조):**
```
[ textarea: 10자 이상 500자 이하, rows=2 ]
[ {content.length}/500 ]   [ 등록 버튼 ]
```

**textarea 스타일:**
- 기존 `.input` 클래스 사용 (높이: `auto`, `resize: none`)
- `padding: 8px 10px`
- `font: 500 13px/1.55 var(--font-sans)`
- focus: `border-color: var(--dj-orange)`, `box-shadow: 0 0 0 4px rgba(234,88,12,.12)`

**캐릭터 카운트:**
- 10자 미만: `color: #dc2626` (`--fg-negative`)
- 10자 이상: `color: var(--fg-tertiary)`

**등록 버튼:**
- 클래스: `btn btn-sm btn-orange`
- 비활성: `content.length < 10` 또는 `pending`
- 레이블: "댓글 등록" (pending 시 "등록 중…")

**에러 표시:**
- 폼 하단 전체 너비 span: `color: #dc2626`, `font: 500 11px/1 var(--font-sans)`
- 위치: 캐릭터 카운트와 버튼 사이 flex row

**접근성:**
- `<textarea aria-label="댓글 작성" aria-required="true">`
- `<form>` 제출 시 `aria-live="polite"` 영역에 성공/실패 메시지 출력

---

### 3-3. GPS Authentication Button

**위치:** `src/components/reviews/ReviewForm.tsx` 수정 (GPS 버튼 추가)
**위치 (UI):** textarea 아래, 캐릭터카운트/버튼 행 위 (별도 행)

**버튼 스타일 (4가지 상태):**

| 상태 | 배경 | 텍스트 색상 | 테두리 | 레이블 |
|------|------|------------|--------|--------|
| idle | `--dj-orange-tint` | `--dj-orange` | `1px solid rgba(234,88,12,.3)` | "현재 위치로 인증" |
| loading | `--bg-surface-2` | `--fg-sec` | `1px solid var(--line-default)` | "위치 확인 중…" |
| verified | `--bg-positive-tint` | `--fg-positive` | `1px solid rgba(22,163,74,.3)` | "인증 완료 ✓" |
| failed | `--bg-cautionary-tint` | `#d97706` | `1px solid rgba(217,119,6,.3)` | "단지 반경 밖입니다" |
| denied | `--bg-negative-tint` | `--fg-negative` | `1px solid rgba(220,38,38,.3)` | "위치 권한이 거부됨" |

**크기:** `height: 36px`, `padding: 0 14px`, `border-radius: var(--radius-md)`, `font: 500 13px/1`
**아이콘:** 핀 SVG 아이콘 (16×16, currentColor). 기존 SVG 인라인 패턴 사용.
**선택사항:** 버튼 옆 `(선택)` 레이블 (`500 11px/1 --fg-tertiary`)

**비즈니스 로직 (UI 전달):**
- verified 상태에서도 후기 제출 시 서버에서 다시 검증 (lat/lng를 Server Action에 전달)
- failed/denied 상태: 인증 없이 제출 허용 (`gps_verified=false`)

**접근성:**
- `type="button"` (폼 제출 방지)
- `aria-label="현재 위치로 GPS 인증 (선택사항)"`
- 상태 변경 시 `aria-live="polite"` 메시지

---

### 3-4. GPS Verification Badge

**위치:** `src/components/reviews/ReviewList.tsx` line 78 기존 코드 유지 + 스타일 확정

**기존 코드 (이미 존재):**
```tsx
{r.gps_verified && (
  <span style={{
    font: '500 10px/1 var(--font-sans)',
    color: '#16a34a',
    background: '#dcfce7',
    padding: '2px 6px',
    borderRadius: 4,
  }}>
    GPS 인증
  </span>
)}
```

**확정 스타일 (토큰 정합성 수정):**
- `background`: `var(--bg-positive-tint)` (`#ecfdf5`, 기존 `#dcfce7`와 유사 → 토큰 사용으로 변경)
- `color`: `var(--fg-positive)` (`#16a34a`)
- `font`: `500 10px/1 var(--font-sans)`
- `padding`: `2px 6px`
- `border-radius`: `4px`
- 텍스트: `"GPS 인증"` (색+아이콘 없이 텍스트만, 색맹 안전)
- 추가: `aria-label="GPS 위치 인증 완료된 후기"`

---

### 3-5. Cafe External Link

**위치:** 단지 상세 페이지 내 후기 섹션 상단 고정 (ReviewList 컴포넌트 바로 위)
**구현 파일:** `src/components/reviews/ReviewList.tsx` 또는 단지 상세 page.tsx에서 ReviewList 위 렌더

**URL 패턴:**
```
https://cafe.naver.com/ArticleSearchList.nhn?search.query={단지명}
```
단지명은 `encodeURIComponent()` 처리 필수.

**UI 구조:**
```
네이버 카페에서 {단지명} 이웃 글 보기 →
```

**스타일:**
- `font: 500 11px/1 var(--font-sans)`
- `color: var(--fg-brand)` (`#0066ff`)
- `text-decoration: none`
- hover: `text-decoration: underline`
- 외부 링크 아이콘: `↗` 또는 인라인 SVG (12×12) — `target="_blank" rel="noopener noreferrer"`
- 컨테이너: `padding: 8px 0 12px`, `borderBottom: 1px solid var(--line-subtle)` (후기 목록과 구분)

**접근성:**
- `aria-label="네이버 카페에서 {단지명} 이웃 글 보기 (새 탭에서 열림)"`
- `<a>` 요소 사용 (`<button>` 아님)

---

### 3-6. SLA Status Badge (Admin)

**위치:** `src/app/admin/reports/page.tsx` 테이블에 "SLA" 컬럼 추가 (기존 컬럼들 사이: 상태 컬럼 뒤)

**3단계 SLA 배지:**

| 단계 | 조건 | 배경 | 텍스트 색상 | 레이블 |
|------|------|------|------------|--------|
| 정상 | `< 16h` 경과 | `--bg-surface-2` | `--fg-sec` | `{N}h 전` |
| 임박 | `16h ~ 24h` | `--bg-cautionary-tint` | `#d97706` | `{N}h — 임박` |
| 초과 | `> 24h` | `--bg-negative-tint` | `--fg-negative` | `{N}h — 초과` |

**스타일 (기존 `reports/page.tsx` 인라인 스타일 패턴 준수):**
```tsx
<span style={{
  display: 'inline-block',
  padding: '3px 8px',
  borderRadius: 4,
  font: '500 11px/1 var(--font-sans)',
  background: slaBg,
  color: slaColor,
}}>
  {slaLabel}
</span>
```

**계산 로직 (서버 컴포넌트에서):**
```typescript
function getSlaState(createdAt: string): 'ok' | 'warning' | 'overdue' {
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  if (hours > 24) return 'overdue'
  if (hours > 16) return 'warning'
  return 'ok'
}
```

**테이블 헤더:** `"SLA"` (기존 헤더 배열에 추가)
**열 너비:** `white-space: nowrap`, 최소 `80px`

---

### 3-7. Presale Page (/presale)

**위치:** `src/app/presale/page.tsx` (신규 ISR 페이지)
**ISR:** `export const revalidate = 3600` (1시간)

**페이지 레이아웃:**
```
[ Nav — 기존 랜딩 페이지 Nav 패턴 동일 ]
[ main: max-width 1100px, padding 32px 48px ]
  [ 페이지 헤더 ]
    h1: "창원·김해 신축 분양"  (700 22px/1.3)
    p:  "MOLIT 분양권전매 데이터 기준"  (500 13px/1.4 --fg-sec)
  [ 분양 카드 그리드 ]
  [ 빈 상태 (데이터 없을 때) ]
```

**그리드 규격:**
- Desktop (≥1024px): `grid-template-columns: repeat(3, 1fr)`, `gap: 20px`
- Tablet (640~1023px): `grid-template-columns: repeat(2, 1fr)`, `gap: 16px`
- Mobile (<640px): `grid-template-columns: 1fr`, `gap: 12px`

**빈 상태:**
```
아직 등록된 분양 정보가 없습니다.
국토부 데이터가 업데이트되면 표시됩니다.
```
스타일: `padding: 64px 0`, `textAlign: center`, `color: var(--fg-tertiary)`, `font: 500 13px/1.6`

**페이지 제목 (SEO):**
```typescript
export const metadata: Metadata = {
  title: '신축 분양 | 단지온도',
  description: '창원·김해 신축 분양 정보. 분양가, 세대수, 입주예정일을 확인하세요.',
}
```

---

### 3-8. Presale Card

**위치:** `src/components/presale/PresaleCard.tsx` (신규)
**사용처:** /presale 페이지 그리드 + 랜딩 페이지 분양 섹션 (동일 컴포넌트 재사용)

**카드 해부:**
```
┌──────────────────────────────────────┐
│ [ 지역 chip ]  [ 입주예정일 badge ]    │  상단 메타
│                                       │
│ 단지명                                 │  700 16px/1.3 (주 정보)
│ 분양가 X.X억 ~ Y.Y억                  │  700 22px/1.2 dj-orange (강조 — h1과 동크기, 색상으로 차별화)
│                                       │
│ 총 {N}세대    전용 {M}㎡             │  보조 정보 행
└──────────────────────────────────────┘
```

**스타일:**
- 컨테이너: `card-flat` 클래스 (`background: --bg-surface`, `border: 1px solid --line-default`, `border-radius: --radius-2xl`, `padding: 20px`)
- hover: `border-color: var(--dj-orange)`, `box-shadow: var(--shadow-xs)`, `transition: 120ms ease`
- 커서: `cursor: pointer` (단지 상세로 링크, `complex_id` 있을 때만)

**지역 chip:**
- 클래스: `chip sm outlined`
- 색: 기본 (gray), 창원: 기본, 김해: 기본 (지역별 색 차이 없음)

**입주예정일 badge:**
- 클래스: `badge neutral`
- 포맷: `YYYY.MM` (날짜 축약)
- 미정일 때: `"입주일 미정"` badge

**분양가:**
- 단위: 만원 → 억 변환 (`Math.floor(price / 10000)` + `.toFixed(1)`)
- 범위: `{min}억 ~ {max}억` 또는 단일가일 때 `{min}억`
- 클래스: `tnum`

**세대수:** `{N}세대` (`tnum`)

**스켈레톤 로더:**
- `background: var(--bg-surface-2)`, `border-radius: var(--radius-2xl)`, `height: 140px`
- 애니메이션: CSS `@keyframes pulse` (opacity 1→0.5→1, 1.5s infinite) — glow 없음

**접근성:**
- `<article aria-label="{단지명} 분양 정보">`
- 분양가에 `aria-label="{min}억원에서 {max}억원"`

---

### 3-9. Facilities Tab (시설 탭)

**위치:** 단지 상세 페이지 내 기존 탭 구조에 "시설" 탭 추가
**파일:** 단지 상세 `page.tsx` 또는 `ComplexTabs.tsx` (기존 탭 컴포넌트 위치 확인 후 추가)

**탭 위치:** 기존 탭들 (거래 내역 / 후기) 사이 또는 끝에 "시설" 탭 추가
**탭 스타일:** 기존 `.tabs` / `.tab` CSS 클래스 사용

**시설 탭 내부 레이아웃:**
```
[ K-apt 출처 표기 ]   ← "K-apt 공동주택 데이터 기준" (--fg-tertiary, 11px)
[ 시설 아이템 목록 ]
```

**시설 아이템:**
```
[ 아이콘 24×24 ]  [ 시설명 ]        [ 값 ]
                   주차대수           세대당 X대
                   세대수             N세대
                   동수               N개동
                   난방방식           지역난방
                   관리방식           위탁관리
```
- 아이콘: 인라인 SVG (`stroke="currentColor"`, `color: --fg-sec`)
- 시설명: `500 13px/1 --fg-sec`
- 값: `500 13px/1 --fg-pri` (오른쪽 정렬)
- 아이템: `display: flex`, `justifyContent: space-between`, `padding: 10px 0`, `borderBottom: 1px solid var(--line-subtle)`

**빈 상태:**
```
시설 정보가 아직 수집되지 않았습니다.
```
`color: --fg-tertiary`, `padding: 32px 0`, `textAlign: center`

**데이터 없을 때 탭 표시 여부:** 탭은 항상 표시. 내부 빈 상태 메시지로 처리.

---

### 3-10. Notification Topic Settings

**위치:** `src/app/profile/page.tsx` 기존 "알림 설정" 카드 하단에 토픽 선택 UI 추가
**카드:** 기존 `<div className="card">` 패턴, `marginBottom: 16`

**구조:**
```
알림 설정
  [ 웹 푸시 알림 ] ← 기존 PushToggle 컴포넌트 유지
  ───────────────  (--line-subtle 구분선, margin: 16px 0)
  알림 받을 항목
  [ 신고가 알림 ]    ← 토픽 toggle row
  [ 신축 분양 알림 ] ← 토픽 toggle row
  [ 단지 업데이트 ]  ← 토픽 toggle row
```

**토픽 토글 행 구조:**
```
[ 토픽명 (700 13px/1 --fg-pri) ]    [ 설명 (500 11px/1.3 --fg-tertiary) ]    [ 토글 버튼 ]
```
- 레이아웃: `display: flex`, `alignItems: center`, `justifyContent: space-between`, `gap: 12px`, `padding: 10px 0`

**토픽 정의:**

| topic | 표시명 | 설명 |
|-------|--------|------|
| `high_price` | 신고가 알림 | 관심 단지 신고가 갱신 시 |
| `presale` | 신축 분양 알림 | 창원·김해 신규 분양 등록 시 |
| `complex_update` | 단지 업데이트 | 관심 단지 정보 변경 시 |

**토글 버튼 (체크박스 대신 pill 토글):**
- 구현: `<button type="button" role="switch" aria-checked={isActive}`
- 선택됨: `background: var(--dj-orange)`, `width: 40px`, `height: 22px`, `borderRadius: 11px`
- 미선택: `background: var(--line-default)`, 동일 크기
- 내부 원: `width: 18px`, `height: 18px`, `background: #fff`, 선택 시 `translateX(18px)`
- `transition: 150ms ease`

**에러 상태:** 토픽 저장 실패 시 `aria-live="polite"` 영역에 "저장에 실패했습니다. 다시 시도해 주세요."

**접근성:**
- `role="group"` + `aria-labelledby="topic-section-title"`
- 각 토글: `aria-label="{토픽명} 알림 {켜기/끄기}"`

---

## 4. Interaction Patterns

### 4-1. Comment Toggle

```
초기 상태: 댓글 최대 3개 표시
  ↓ 댓글이 3개 초과이고 토글 닫힘 상태
"댓글 {N-3}개 더 보기 ↓" 클릭
  ↓ Client State: showAll = true
모든 댓글 표시 (서버에서 이미 join된 데이터 사용, 추가 fetch 없음)
  ↓
"댓글 접기 ↑" 클릭
  ↓ Client State: showAll = false
다시 3개만 표시
```
- 애니메이션: 없음 (즉시 전환) — 댓글 수가 적으므로 부드러운 전환 불필요
- 스크롤: 접힘 후 댓글 섹션 상단으로 자동 스크롤 없음

### 4-2. GPS Flow

```
[idle] 버튼 클릭
  ↓
브라우저 위치 권한 요청 팝업
  ↓
[권한 거부]                    [권한 허용]
  ↓                              ↓
[denied] 상태                 navigator.geolocation.getCurrentPosition()
버튼 레이블 변경               [loading] 상태 (버튼 비활성)
후기 제출 허용(gps=false)        ↓
                              lat/lng 획득 성공
                                ↓
                              [verified] 상태
                              lat/lng를 form state에 저장
                              후기 제출 시 Server Action에 전달
                                ↓ (위치 획득 실패)
                              [failed] 상태
                              버튼 레이블 변경
                              후기 제출 허용(gps=false)
```
- 타임아웃: `getCurrentPosition()` 옵션: `{ timeout: 10000, maximumAge: 30000 }`
- 재시도: failed/denied 상태에서 버튼 재클릭 시 idle로 돌아가 재시도 가능

### 4-3. Presale Card Hover

```
기본 상태: border-color: var(--line-default)
  ↓ 마우스 오버
border-color: var(--dj-orange)
box-shadow: var(--shadow-xs)
transition: border-color 120ms ease, box-shadow 120ms ease
```
`transform` 없음 — 레이아웃 안정성 유지.

### 4-4. Notification Topic Toggle

```
[미선택] 클릭
  ↓ optimistic update: UI 즉시 선택 상태로 변경
  ↓ Server Action: notification_topics INSERT
  ↓ 성공: 상태 유지
  ↓ 실패: rollback (미선택 상태로 복원) + 에러 메시지

[선택됨] 클릭
  ↓ optimistic update: UI 즉시 미선택 상태로 변경
  ↓ Server Action: notification_topics DELETE
  ↓ 성공: 상태 유지
  ↓ 실패: rollback (선택 상태로 복원) + 에러 메시지
```

---

## 5. Responsive Behavior

### CommentSection

| Breakpoint | 동작 |
|-----------|------|
| Mobile (<640px) | 전체 너비, 댓글 폼 textarea rows=2 유지, 등록 버튼 폼 하단 우측 |
| Tablet (640~1023px) | 동일 |
| Desktop (≥1024px) | 동일 (CommentSection은 단지 상세 내 섹션 너비를 따름) |

### GPS Button (ReviewForm)

| Breakpoint | 동작 |
|-----------|------|
| Mobile | 버튼 전체 너비(`width: 100%`), 텍스트 줄임 없음 |
| Desktop | `width: auto`, inline 정렬 |

### Presale Page

| Breakpoint | 그리드 | Padding |
|-----------|--------|---------|
| Mobile (<640px) | 1열 | `16px 16px` |
| Tablet (640~1023px) | 2열 | `24px 24px` |
| Desktop (≥1024px) | 3열 | `32px 48px` |

### Notification Topic Settings

| Breakpoint | 동작 |
|-----------|------|
| Mobile | 토픽 설명 숨김 (`display: none`), 토픽명 + 토글만 표시 |
| Tablet+ | 설명 포함 전체 표시 |

### Facilities Tab

| Breakpoint | 동작 |
|-----------|------|
| Mobile | 탭 스크롤 가능 (`overflow-x: auto`), 탭 레이블 축약 없음 |
| Desktop | 탭 전체 표시 |

---

## 6. Accessibility Requirements

### 전체 기준: WCAG 2.1 AA

**키보드 탐색:**
- 댓글 "더 보기" 버튼: `Tab` 접근, `Enter`/`Space` 토글
- GPS 인증 버튼: `Tab` 접근, `Enter` 실행
- 분양 카드: `Tab` 접근, `Enter` 단지 상세 이동 (링크가 있는 경우)
- 알림 토픽 토글: `Tab` 접근, `Enter`/`Space` 전환

**포커스 표시:**
- 기존 `.input:focus` 패턴 (`border-color: --dj-orange`, `box-shadow: 0 0 0 4px rgba(234,88,12,.12)`) 모든 인터랙티브 요소에 동일 적용
- `:focus-visible` 사용 (마우스 클릭 시 포커스 링 숨김)

**스크린 리더 레이블:**

| 컴포넌트 | aria 레이블 |
|----------|------------|
| GPS 버튼 | `aria-label="현재 위치로 GPS 인증 (선택사항)"` |
| GPS 배지 | `aria-label="GPS 위치 인증 완료된 후기"` |
| 댓글 토글 | `aria-expanded={showAll}` `aria-controls="comment-list-{reviewId}"` |
| 카페 외부 링크 | `aria-label="네이버 카페에서 {단지명} 이웃 글 보기 (새 탭에서 열림)"` |
| SLA 배지 | `aria-label="신고 접수 후 {N}시간 경과 — {상태}"` |
| 알림 토픽 토글 | `role="switch"` `aria-checked={isActive}` `aria-label="{토픽명} 알림"` |
| 분양 카드 | `role="article"` `aria-label="{단지명} 분양 정보"` |

**색맹 안전:**
- GPS 배지: 색 외에 "GPS 인증" 텍스트 레이블 필수
- SLA 배지: 색 외에 "임박"/"초과" 텍스트 레이블 필수
- 분양 카드 hover: 테두리 색 변경만 (색에만 의존하지 않음, 키보드 포커스 링 별도)

**최소 터치 영역:**
- 댓글 "더 보기" 버튼: `min-height: 44px` (padding으로 확보)
- GPS 버튼: `height: 36px` → 감싸는 `div min-height: 44px`로 보정
- 알림 토픽 토글: `min-height: 44px` (행 padding으로 확보)

**reduced-motion:**
- 스켈레톤 pulse 애니메이션: `@media (prefers-reduced-motion: reduce) { animation: none }`
- 토글 transition: `@media (prefers-reduced-motion: reduce) { transition: none }`

---

## 7. Copywriting Contract

### CTA 레이블

| 액션 | 레이블 | 비고 |
|------|--------|------|
| 댓글 등록 | "댓글 등록" | pending: "등록 중…" |
| GPS 인증 실행 | "현재 위치로 인증" | — |
| GPS 인증 완료 | "인증 완료 ✓" | — |
| GPS 인증 실패 | "단지 반경 밖입니다" | — |
| 토픽 토글 켜기 | (토글 UI, 텍스트 없음) | aria-label로 처리 |
| 카페 검색 링크 | "네이버 카페에서 {단지명} 이웃 글 보기 →" | — |
| 댓글 더 보기 | "댓글 {N}개 더 보기 ↓" | — |
| 댓글 접기 | "댓글 접기 ↑" | — |

### 빈 상태 카피

| 컴포넌트 | 빈 상태 메시지 |
|----------|--------------|
| CommentSection | "댓글이 없습니다. 첫 번째 의견을 남겨보세요." |
| Presale Page | "아직 등록된 분양 정보가 없습니다.\n국토부 데이터가 업데이트되면 표시됩니다." |
| Facilities Tab | "시설 정보가 아직 수집되지 않았습니다." |
| Admin Reports (기존 유지) | "접수된 신고가 없습니다." |

### 에러 상태 카피

| 에러 | 메시지 |
|------|--------|
| 댓글 등록 실패 (미로그인) | "로그인이 필요합니다." |
| 댓글 등록 실패 (너무 짧음) | "댓글은 10자 이상 500자 이하로 작성해주세요." |
| 댓글 등록 실패 (서버 오류) | "댓글 등록에 실패했습니다. 다시 시도해 주세요." |
| GPS 권한 거부 | "위치 권한이 거부됨" (버튼 레이블) |
| GPS 범위 밖 | "단지 반경 밖입니다" (버튼 레이블) |
| 토픽 저장 실패 | "저장에 실패했습니다. 다시 시도해 주세요." |
| 댓글 로딩 실패 | "댓글을 불러오지 못했습니다. 페이지를 새로고침해 주세요." |

### 미로그인 상태

```
댓글 작성 폼 자리: "로그인하면 댓글을 달 수 있어요." + [로그인] 링크 (--dj-orange)
알림 토픽: 프로필 페이지는 로그인 필수(redirect), 별도 처리 없음
```

---

## 8. Implementation Notes

### 신규 생성 파일

| 파일 | 역할 |
|------|------|
| `src/components/reviews/CommentSection.tsx` | 댓글 목록 + CommentForm + 토글 |
| `src/components/presale/PresaleCard.tsx` | 분양 카드 (랜딩 + /presale 공용) |
| `src/app/presale/page.tsx` | /presale ISR 페이지 |

### 수정 대상 파일

| 파일 | 수정 내용 |
|------|----------|
| `src/components/reviews/ReviewForm.tsx` | GPS 버튼 추가 (lat/lng state + Server Action 연동) |
| `src/components/reviews/ReviewList.tsx` | GPS 배지 토큰 정합, 카페 외부 링크 추가, CommentSection 연결 |
| `src/app/admin/reports/page.tsx` | SLA 배지 컬럼 추가, `ReportRow.target_type`에 `'comment'` 추가 |
| `src/app/profile/page.tsx` | 알림 토픽 설정 UI 추가 (PushToggle 카드 내부 확장) |
| `src/app/page.tsx` | nav 분양 링크 `href="#"` → `href="/presale"`, 분양 섹션 추가 (선택) |

### 디자인 시스템 통합

**기존 클래스 재사용 목록:**
- `.card`, `.card-flat` — 분양 카드, 프로필 섹션
- `.btn`, `.btn-sm`, `.btn-orange` — 댓글 등록 버튼
- `.badge`, `.badge.pos`, `.badge.caut`, `.badge.neg`, `.badge.neutral` — SLA 배지
- `.chip`, `.chip.sm`, `.chip.outlined` — 지역 chip, 대상 chip
- `.tabs`, `.tab`, `.tab.active` — 시설 탭
- `.input` — 댓글 textarea

**신규 CSS 없음:** 모든 Phase 4 컴포넌트는 기존 `globals.css` 토큰과 유틸리티 클래스로 구현 가능. 별도 CSS 파일 추가 불필요.

**Tailwind 사용:** 반응형 breakpoint가 필요한 경우 Tailwind 클래스 사용 (`sm:`, `lg:` prefix). 단, 색상·간격·타이포그래피는 CSS 토큰 우선.

---

## 9. Quality Gate Check

- [x] AI 슬롭 없음: backdrop-blur, gradient-text, glow, 보라/인디고, gradient orb 미사용
- [x] 특정 스타일 방향: Swiss/Editorial Data-First (장식 없음, 데이터 위계 중심)
- [x] 디자인 품질 필라 4개 이상 충족:
  - [x] 1. 명확한 시각적 위계 (분양가 강조 크기, 배지 3단계 SLA)
  - [x] 3. 깊이감 (카드 border, shadow-xs hover, 구분선 레이어)
  - [x] 5. 의미 있는 색상 (GPS=초록, SLA 3단계=회/주황/빨강, 브랜드=오렌지)
  - [x] 6. 디자인된 hover/focus/active 상태 (카드 hover, 버튼 상태, input focus)
- [x] GPS 배지: 색맹 안전 (텍스트 레이블 포함)
- [x] SLA 배지: 3단계 의미적 색상
- [x] 분양 페이지: 균일 그리드 탈피 (지역 chip + 입주예정일 + 가격 위계)
- [x] 모바일 우선 반응형 명세 포함
- [x] 접근성 요건 명세 (WCAG 2.1 AA)
- [x] 기존 코드베이스 패턴 일치 (Tailwind 클래스, inline style 패턴, CSS 토큰)
- [x] 10개 UI 컴포넌트 전체 명세 완료
- [x] 타이포그래피 4단계 이하: 22/16/13/11px (12px 보조 제거, 소형으로 통합)
- [x] 폰트 굵기 2단계: 700(제목) + 500(본문·소형·배지) — 600 제거됨
- [x] `--fg-brand` 토큰 Color System 표에 추가 (#0066ff)
- [x] CTA 레이블: "등록" → "댓글 등록" (명사 포함)
- [x] 60/30/10 색상 비율 선언 (Color System 상단)

---

*Source: CONTEXT.md (D-01~D-12, Claude's Discretion), RESEARCH.md, 기존 ReviewForm.tsx / ReviewList.tsx / admin/reports/page.tsx / profile/page.tsx / globals.css 직접 확인*
*Phase: 4-커뮤니티-기초*
*UI-SPEC 작성일: 2026-05-07*
