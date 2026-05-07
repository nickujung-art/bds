# Phase 5: 데이터 확장·운영 안정성 — UI Design Contract

**Created:** 2026-05-07
**Status:** Ready for planning
**Phase:** 5 — 데이터 확장·운영 안정성 (V1.5)

---

## 1. Visual Direction

### Style Statement

**Swiss / Editorial Data-First** — Phase 4와 동일한 스위스 국제 타이포그래피 원칙을 확장한다.
Phase 5에서 새로 추가되는 4개 UI 표면(RedevelopmentTimeline, ValueQuadrantChart, 어드민 재건축 입력, 어드민 매물가 입력)은 모두 기존 단지 상세·어드민 페이지 패턴을 그대로 계승한다.

**이 Phase의 UI 목표:**
- 재건축 단계를 한눈에 파악할 수 있는 수평 타임라인 — 현재 단계 위치와 전후 맥락을 동시에 보여준다.
- 가성비 분석 산점도 — 같은 시·구 내 어느 위치인지 즉각적으로 파악할 수 있는 컨텍스트 차트.
- 어드민 입력 폼 — 기존 reports/page.tsx와 구분 불가능한 일관성.

**왜 이 방향인가:**
- 타임라인·차트는 데이터 시각화 도구다. 인포그래픽이 아니라 데이터 읽기 도구로 설계한다.
- 새 CSS 변수 0개 — 기존 토큰이 이미 충분하다.
- 어드민은 운영 효율이 우선이다. 장식은 방해가 된다.

### Design Principles

1. **타임라인은 현재 위치가 주인공이다.** 완료 단계, 현재 단계, 미래 단계를 즉각 구분할 수 있어야 한다. 시각적 강조는 `--dj-orange` 하나.
2. **차트는 데이터를 두 번 말하지 않는다.** 라벨과 데이터 포인트가 중복 정보를 만들지 않는다. 4분면 레이블(가성비/프리미엄/현실적/주의)은 영역 설명일 뿐, 개별 단지를 판단하지 않는다.
3. **기존 토큰 위에 쌓는다.** Phase 5에서 신규 CSS 변수를 추가하지 않는다.
4. **어드민은 기존 패턴과 구분 불가능해야 한다.** reports/page.tsx와 동일한 인라인 스타일, 동일한 카드·테이블 패턴.
5. **Recharts에 브랜드 색상을 그대로 쓴다.** `#ea580c`(`--dj-orange`)와 `#d1d5db`(회색)만 사용한다.

### Anti-patterns (This Phase)

- `backdrop-blur` — 절대 금지 (CLAUDE.md)
- `gradient-text` — 절대 금지 (CLAUDE.md)
- glow 애니메이션 — 절대 금지 (CLAUDE.md)
- 보라/인디고 색상 — 절대 금지 (CLAUDE.md)
- 배경 gradient orb — 절대 금지 (CLAUDE.md)
- 타임라인을 세로 방향으로 구현하는 것 — 수평 진행 방향이 한국 사용자 맥락에 자연스럽다
- 4분면 라벨을 Recharts SVG 좌표계 내부에 배치하는 것 — 절대 위치 오버레이 div 사용
- 차트 배경점에 여러 색상을 사용하는 것 — `#d1d5db` 단일 회색만
- `ResponsiveContainer height="100%"` 미설정 — 고정 `height={280}` 사용 필수 (height=0 pitfall 방지)
- 어드민 폼에 shadcn UI 컴포넌트 추가하는 것 — 기존 `.input`, `.btn`, `.card` 클래스 사용

---

## 2. Design Tokens

### Color System

Phase 4와 동일. **신규 토큰 없음.** 기존 `globals.css` 토큰만 사용한다.

**색상 비율 (60/30/10 원칙):**
- 캔버스(`--bg-canvas`) + 표면(`--bg-surface`): ~60% — 페이지 배경, 카드 배경
- 중립(`--bg-surface-2`, 라인, 보조 전경): ~30% — 구분선, 미래 단계 스텝, 배경 산점 데이터
- 브랜드(`--dj-orange`): ~10% — 현재 재건축 단계 강조, 차트 target 포인트

| 역할 | 토큰 | 값 | Phase 5 사용처 |
|------|------|-----|---------------|
| 브랜드 주색 | `--dj-orange` | `#ea580c` | 현재 재건축 단계 원, target 산점 포인트, 어드민 저장 버튼 |
| 브랜드 틴트 | `--dj-orange-tint` | `#fff1e8` | 타임라인 섹션 배경 (선택적), 재건축 배지 배경 |
| 기본 전경 | `--fg-pri` | `#171719` | 타임라인 단계명, 폼 레이블, 테이블 데이터 |
| 보조 전경 | `--fg-sec` | `rgba(55,56,60,.61)` | 완료된 단계명, 차트 축 텍스트 보조 |
| 3차 전경 | `--fg-tertiary` | `rgba(55,56,60,.35)` | 미래 단계명, 차트 빈 상태, 폼 placeholder |
| 표면 | `--bg-surface` | `#ffffff` | 카드 배경, 폼 입력 배경 |
| 표면2 | `--bg-surface-2` | `#f4f4f5` | 미래 단계 원 배경, 테이블 헤더, 타임라인 연결선 |
| 캔버스 | `--bg-canvas` | `#f7f7f8` | 페이지 배경 |
| 양성 틴트 | `--bg-positive-tint` | `#ecfdf5` | 완공(`completed`) 단계 배지 |
| 음성 틴트 | `--bg-negative-tint` | `#fef2f2` | 취소(`cancelled`) 상태 배지 |
| 라인 기본 | `--line-default` | `rgba(112,115,124,.22)` | 카드 테두리, 테이블 헤더 구분선 |
| 라인 미세 | `--line-subtle` | `rgba(112,115,124,.12)` | 타임라인 연결선, 테이블 행 구분선 |
| 양성 | `--fg-positive` | `#16a34a` | 완공 단계 체크 색상 |
| 음성 | `--fg-negative` | `#dc2626` | 취소 상태 텍스트, 에러 메시지 |

**Recharts 전용 값 (CSS 변수 사용 불가 — Recharts props는 literal 값 요구):**
- 배경 단지 (scatter): `fill="#d1d5db"`, `opacity={0.6}`
- target 단지 (scatter): `fill="#ea580c"`, `r={6}`
- 구분선 (ReferenceLine): `stroke="#d1d5db"`, `strokeDasharray="4 2"`
- CartesianGrid: `stroke="#f0f0f0"`, `strokeDasharray="3 3"`

### Typography

Phase 4와 동일. 폰트: Pretendard (`--font-sans`). **신규 크기·굵기 없음.**

| 역할 | 크기/굵기/행간 | Phase 5 사용처 |
|------|--------------|---------------|
| 페이지 제목 | `700 22px/1.3` | 어드민 페이지 h1 |
| 섹션 제목 | `700 16px/1.4` | 차트 섹션 헤더 "단지 가성비 분석", 타임라인 섹션 헤더 |
| 본문 | `500 13px/1.6` | 타임라인 단계명, 폼 입력값, 테이블 셀 |
| 소형 | `500 11px/1` | 차트 축 tick, 4분면 라벨 텍스트, 배지, 날짜, 피드백 메시지 |

**굵기 2단계만 사용:** `700` (제목) + `500` (본문·소형·배지·버튼 전부). `600` 사용 금지.
숫자(평당가, 만원 단위): `tnum` 클래스 적용 필수.

### Spacing & Layout

Phase 4와 동일한 8포인트 그리드. **예외 없음.**

| 토큰명 | 값 | Phase 5 사용처 |
|--------|-----|--------------|
| `space-4` | 4px | 타임라인 스텝 원 내 아이콘 padding, 배지 내부 padding |
| `space-8` | 8px | 타임라인 단계명 margin-top, 어드민 폼 input gap |
| `space-12` | 12px | 타임라인 섹션 내부 padding (수직), 폼 label → input gap |
| `space-16` | 16px | 차트 섹션 헤더 margin-bottom, 어드민 폼 field gap |
| `space-20` | 20px | 카드 padding (어드민 폼 카드) |
| `space-24` | 24px | 카드 padding (차트 카드), 어드민 페이지 padding |
| `space-32` | 32px | 어드민 페이지 최대 너비 padding |
| `space-48` | 48px | 차트 빈 상태 수직 padding |

---

## 3. Component Specifications

### 3-1. RedevelopmentTimeline

**파일:** `src/components/complex/RedevelopmentTimeline.tsx`
**유형:** RSC (React Server Component) — `'use client'` 불필요. 인터랙션 없음.
**조건부 렌더링:** `complex.status === 'in_redevelopment'` 일 때만 단지 상세 페이지에 표시.
**삽입 위치:** `src/app/complexes/[id]/page.tsx` — "시설" 카드(`facilityKapt` 카드)와 "동네 의견" 카드 사이.

**단계 정의 (10단계 enum → 9단계 표시 — `cancelled` 별도 처리):**

```
rumor         → 재건축 소문
proposed      → 추진 제안
committee_formed → 추진위 구성
safety_eval   → 안전진단
designated    → 구역 지정
business_approval → 사업 승인
construction_permit → 착공 허가
construction  → 공사 중
completed     → 완공
cancelled     → [별도 배지 처리 — 타임라인 미표시]
```

**레이아웃 다이어그램:**

```
┌──────────────────────────────────────────────────────────────────┐
│  재건축 진행 단계                        [재건축 진행 중] 배지      │
│                                                                  │
│  ●─────●─────●─────◉─────○─────○─────○─────○─────○            │
│  소문  제안  추진위  안진  지정  사업  착공  공사  완공           │
│               완료  ← 현재 →                                     │
│                                                                  │
│  [ notes 텍스트 (있을 때만) ]                                    │
└──────────────────────────────────────────────────────────────────┘
```

**스텝 3가지 시각 상태:**

| 상태 | 조건 | 원 배경 | 원 테두리 | 내부 | 단계명 색상 |
|------|------|---------|----------|------|------------|
| 완료 | `stepIndex < currentIndex` | `--dj-orange` | 없음 | 체크마크 SVG (12px, #fff) | `--fg-sec` |
| 현재 | `stepIndex === currentIndex` | `--dj-orange` | `3px solid --dj-orange-dark` | 없음 | `--fg-pri` (700 13px) |
| 미래 | `stepIndex > currentIndex` | `--bg-surface-2` | `1px solid --line-default` | 없음 | `--fg-tertiary` |

**스텝 원 크기:** `width: 28px`, `height: 28px`, `borderRadius: 50%`
**연결선:** `height: 2px`, `flex: 1`, `minWidth: 12px`, `maxWidth: 32px`, `background: var(--line-subtle)` (완료 구간은 `--dj-orange`)
**단계명:** `font: 500 11px/1 var(--font-sans)`, `marginTop: 6px`, `textAlign: center`, `whiteSpace: nowrap`

**섹션 헤더:**
```
재건축 진행 단계  [재건축 진행 중] 배지
```
- 헤더: `font: 700 16px/1.4 var(--font-sans)`
- 배지: `badge orange` 클래스, 텍스트 "재건축 진행 중"

**notes 표시 (있을 때만):**
- `font: 500 13px/1.6 var(--font-sans)`, `color: var(--fg-sec)`, `margin: 12px 0 0`
- 텍스트 앞: `"비고: "` (500 11px/1 --fg-tertiary)

**cancelled 상태:**
```
[ 재건축 취소 ] 배지  ← badge neg 클래스
재건축이 취소되었습니다.  ← 500 13px/1.4 --fg-tertiary
[ notes 텍스트 ]
```
타임라인 스텝 시퀀스는 표시하지 않음.

**카드 컨테이너:** `className="card"`, `padding: 20px`

**접근성:**
- `<section aria-label="재건축 진행 단계">`
- `<ol>` 사용 (순서 있는 단계 목록)
- 각 `<li>`: `aria-label="{단계명} — {완료|현재 진행 중|예정}"`
- 현재 단계: `aria-current="step"`

**정밀 스타일 예시 (현재 단계 원):**
```css
width: 28px;
height: 28px;
border-radius: 50%;
background: var(--dj-orange);
border: 3px solid var(--dj-orange-dark);
box-shadow: 0 0 0 3px var(--dj-orange-tint);
```

---

### 3-2. ValueQuadrantChart

**파일:** `src/components/complex/ValueQuadrantChart.tsx`
**유형:** `'use client'` 필수 (Recharts DOM 의존)
**삽입 위치:** `src/app/complexes/[id]/page.tsx` — "실거래가 추이" 차트 카드 바로 아래, 새 카드로 추가.
**데이터 전달:** RSC(page.tsx)에서 `getQuadrantData()` 호출 → `<ValueQuadrantChart data={...} medianX={...} medianY={...} />` props 전달.

**레이아웃 다이어그램:**

```
┌──────────────────────────────────────────────────────────────────┐
│  단지 가성비 분석                                                  │
│  창원 의창구 내 단지 비교  ← 500 11px --fg-tertiary               │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 가성비          │         프리미엄                        │    │
│  │  (저가+고학군)  │  (고가+고학군)                         │    │
│  │                ·  · ·  ·    ★ (현재 단지)               │    │
│  │────────────────┼────────────── (medianX ReferenceLine)  │    │
│  │  현실적        │         주의                            │    │
│  │  (저가+저학군) │  (고가+저학군)                         │    │
│  └──────────────────────────────────────────────────────────┘    │
│  X: 평당가 (만원/평)   Y: 학군점수 (0-100)                       │
└──────────────────────────────────────────────────────────────────┘
```

**Props 인터페이스:**
```typescript
interface QuadrantPoint {
  complexId: string
  complexName: string
  x: number        // 평당가 (만원/평)
  y: number        // 학군점수 (0~100)
  isTarget: boolean
}

interface ValueQuadrantChartProps {
  data: QuadrantPoint[]
  medianX: number  // 시·구 평당가 중앙값
  medianY: number  // 시·구 학군점수 중앙값
  regionLabel: string  // "창원 의창구" 등 차트 부제목에 사용
}
```

**Recharts 구조:**
```
ResponsiveContainer (width="100%", height={280})
  └─ ScatterChart (margin: { top: 24, right: 24, bottom: 24, left: 8 })
      ├─ CartesianGrid (strokeDasharray="3 3", stroke="#f0f0f0")
      ├─ XAxis (dataKey="x", name="평당가", type="number",
      │         tickFormatter={v => `${Math.round(v/10000)}만`},
      │         tick={{ fontSize: 11, fill: "#9ca3af" }})
      ├─ YAxis (dataKey="y", name="학군점수", type="number",
      │         tick={{ fontSize: 11, fill: "#9ca3af" }}, width={32})
      ├─ Tooltip (formatter, contentStyle: { fontSize: 12, fontFamily: '--font-sans' })
      ├─ ReferenceLine (x={medianX}, stroke="#d1d5db", strokeDasharray="4 2", strokeWidth={1.5})
      ├─ ReferenceLine (y={medianY}, stroke="#d1d5db", strokeDasharray="4 2", strokeWidth={1.5})
      ├─ Scatter (name="배경단지", data={backgroundPoints}, fill="#d1d5db", opacity={0.6})
      └─ Scatter (name="현재단지", data={targetPoints}, fill="#ea580c", r={6})
```

**4분면 라벨 (절대 위치 div 오버레이 — Recharts SVG 외부):**
```
relative wrapper div (position: relative)
  │
  ├─ ResponsiveContainer (기존 그대로)
  │
  ├─ 좌상단 overlay: position absolute, top: 28px, left: 12px
  │   "가성비"  font: 500 11px/1, color: var(--fg-tertiary)
  │
  ├─ 우상단 overlay: position absolute, top: 28px, right: 12px
  │   "프리미엄"  font: 500 11px/1, color: var(--fg-tertiary)
  │
  ├─ 좌하단 overlay: position absolute, bottom: 28px, left: 12px
  │   "현실적"  font: 500 11px/1, color: var(--fg-tertiary)
  │
  └─ 우하단 overlay: position absolute, bottom: 28px, right: 12px
      "주의"  font: 500 11px/1, color: var(--fg-tertiary)
```

**섹션 헤더 (카드 내부, 차트 위):**
```
단지 가성비 분석                         ← 700 16px/1.4
창원 의창구 내 단지 비교 (N개 단지)      ← 500 11px/1 --fg-tertiary, margin-bottom: 16px
```

**Tooltip 포맷:**
- formatter: `(value, name) => name === '평당가' ? [`${Math.round(value/10000)}만원/평`, '평당가'] : [`${value}점`, '학군점수']`
- label: 단지명 표시 (`complexName`)

**카드 컨테이너:** `className="card"`, `padding: 24px`

**빈 상태 (data.length === 0 또는 유효한 포인트 < 3개):**
```
이 지역 단지 데이터가 부족하여 차트를 표시할 수 없습니다.
```
- `height: 280px`, `display: flex`, `alignItems: center`, `justifyContent: center`
- `font: 500 13px/1.6 var(--font-sans)`, `color: var(--fg-tertiary)`

**학군점수 null 처리:** `y` 값이 null인 포인트는 차트 데이터에서 필터링 후 제외. 제외된 단지 수는 표시하지 않음.

**접근성:**
- 차트 wrapper: `aria-label="단지 가성비 분석 산점도 — {regionLabel} 내 단지 평당가와 학군점수 비교"`
- `role="img"` on wrapper (chart는 이미지로 취급)
- 스크린 리더 전용 요약: `<p className="sr-only">현재 단지는 {regionLabel} 내 {totalCount}개 단지 중 평당가 {rank}위, 학군점수 {schoolRank}위입니다.</p>`

---

### 3-3. Admin Redevelopment Page

**파일:** `src/app/admin/redevelopment/page.tsx`
**유형:** RSC + Server Action
**접근 제어:** `reports/page.tsx`와 동일한 admin role guard 패턴
**레이아웃:** `reports/page.tsx`와 동일한 전체 페이지 구조

**페이지 구조:**

```
┌──────────────────────────────────────────────────────────────────┐
│  [Nav] 단지온도 · 관리자 · 재건축 단계 관리                        │
├──────────────────────────────────────────────────────────────────┤
│  재건축 단계 관리                     ← h1 700 22px/1.3           │
│                                                                  │
│  ┌── 단계 입력 ─────────────────────────────────────────┐        │
│  │  단지 검색                                           │        │
│  │  [ 입력창 (단지명으로 검색) ]                         │        │
│  │                                                     │        │
│  │  단지  [ 검색 결과 드롭다운 또는 select ]             │        │
│  │                                                     │        │
│  │  진행 단계                                           │        │
│  │  [ <select> — 9단계 옵션 + cancelled ]               │        │
│  │                                                     │        │
│  │  비고 (선택)                                         │        │
│  │  [ <textarea> rows=3 ]                              │        │
│  │                                                     │        │
│  │  [저장]  ← btn btn-sm btn-orange                    │        │
│  │  [성공/에러 인라인 메시지]                            │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌── 현재 재건축 단지 목록 ─────────────────────────────┐        │
│  │  테이블: 단지명 | 지역 | 진행 단계 | 수정일 | 비고   │        │
│  └─────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

**상세 스타일 (reports/page.tsx 인라인 스타일 패턴 준수):**

헤더 Nav:
- `height: 60`, `background: '#fff'`, `borderBottom: '1px solid var(--line-default)'`
- `padding: '0 32px'`, `gap: 24`, `position: 'sticky'`, `top: 0`, `zIndex: 50`
- 타이틀 span: `font: '500 13px/1 var(--font-sans)'`, `color: 'var(--fg-sec)'` → `"관리자 · 재건축 단계 관리"`

페이지 본문:
- `maxWidth: 1100`, `margin: '0 auto'`, `padding: '28px 32px'`
- h1: `font: '700 22px/1.3 var(--font-sans)'`, `letterSpacing: '-0.02em'`, `margin: '0 0 20px'`

입력 폼 카드:
- `className="card"`, `padding: 24px`, `marginBottom: 20px`
- 폼 제목: `font: '700 16px/1.4 var(--font-sans)'`, `margin: '0 0 16px'`

폼 필드 구조:
```
label: font: '500 11px/1 var(--font-sans)', color: 'var(--fg-sec)', marginBottom: 6px, display: block
input/select/textarea: className="input" (또는 textarea: className="input", height: auto, padding: '10px 14px')
필드 gap: marginBottom: 16px
```

단지 검색 인터랙션:
- `<input>` 단지명 입력 → 서버에서 단지 목록 제공 (초기 로드 또는 별도 fetch)
- `<select>` complex_id 선택 (단지명 + 시·구 표시)

진행 단계 select:
```
<select className="input">
  <option value="">단계 선택</option>
  <option value="rumor">재건축 소문</option>
  <option value="proposed">추진 제안</option>
  <option value="committee_formed">추진위 구성</option>
  <option value="safety_eval">안전진단</option>
  <option value="designated">구역 지정</option>
  <option value="business_approval">사업 승인</option>
  <option value="construction_permit">착공 허가</option>
  <option value="construction">공사 중</option>
  <option value="completed">완공</option>
  <option value="cancelled">취소</option>
</select>
```

저장 버튼:
- `className="btn btn-sm btn-orange"`
- `type="submit"`
- pending 상태: "저장 중…" (비활성)

**Server Action 피드백 (인라인 — 별도 모달 없음):**
- 성공: `color: 'var(--fg-positive)'`, `font: '500 11px/1 var(--font-sans)'` → "저장되었습니다."
- 에러: `color: 'var(--fg-negative)'`, `font: '500 11px/1 var(--font-sans)'` → 에러 메시지 (아래 Copywriting Contract 참조)
- 피드백 위치: 버튼 오른쪽 또는 버튼 아래 (동일 행 `display: flex`, `alignItems: center`, `gap: 12`)

**재건축 단지 목록 테이블:**
- `className="card"`, `padding: 0`, `overflow: 'hidden'`
- 테이블 헤더: `['단지명', '지역', '진행 단계', '최종 수정', '비고']`
- 헤더 스타일: `background: 'var(--bg-surface-2)'`, `font: '500 11px/1 var(--font-sans)'`, `padding: '10px 16px'`
- 행: `borderBottom: '1px solid var(--line-subtle)'`
- 진행 단계 셀: `badge neutral` 클래스 + 한국어 단계명
  - `completed` 단계: `badge pos` 클래스
  - `cancelled` 단계: `badge neg` 클래스
- 최종 수정: `500 12px/1 --fg-tertiary`, `whiteSpace: nowrap`
- 비고: `maxWidth: 200`, `overflow: hidden`, `textOverflow: ellipsis`, `whiteSpace: nowrap`

**빈 상태:**
```
등록된 재건축 단지가 없습니다.
```
`className="card"`, `padding: 40`, `textAlign: center`, `font: '500 14px/1.6 var(--font-sans)'`, `color: 'var(--fg-tertiary)'`

**접근성:**
- `<form aria-label="재건축 단계 입력">`
- `<label htmlFor="complex-select">단지</label>` + `<select id="complex-select">`
- `<label htmlFor="phase-select">진행 단계</label>` + `<select id="phase-select">`
- `<label htmlFor="notes-textarea">비고 (선택)</label>` + `<textarea id="notes-textarea">`
- Server Action 피드백: `aria-live="polite"` wrapper

**메타데이터:**
```typescript
export const metadata: Metadata = { title: '관리자 · 재건축 단계 관리' }
```

---

### 3-4. Admin Listing Prices Page

**파일:** `src/app/admin/listing-prices/page.tsx`
**유형:** RSC + Server Action
**접근 제어:** `reports/page.tsx`와 동일한 admin role guard 패턴

**페이지 구조:**

```
┌──────────────────────────────────────────────────────────────────┐
│  [Nav] 단지온도 · 관리자 · 매물가 입력                             │
├──────────────────────────────────────────────────────────────────┤
│  매물가 입력                          ← h1 700 22px/1.3           │
│  KB시세 등 외부 매물가를 수동으로 기록합니다.  ← 500 13px --fg-sec  │
│                                                                  │
│  ┌── 매물가 등록 ────────────────────────────────────────┐        │
│  │  단지                                                │        │
│  │  [ <select> — complex_id 선택 ]                      │        │
│  │                                                     │        │
│  │  평당가 (만원)                                        │        │
│  │  [ <input type="number" min="100" max="99999"> ]     │        │
│  │                                                     │        │
│  │  기준일                                              │        │
│  │  [ <input type="date"> ]                            │        │
│  │                                                     │        │
│  │  출처                                               │        │
│  │  [ <input type="text" placeholder="KB시세, 직방 등"> ] │      │
│  │                                                     │        │
│  │  [등록]  ← btn btn-sm btn-orange                    │        │
│  │  [성공/에러 메시지]                                   │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                  │
│  ┌── 최근 입력 내역 (최근 20건) ─────────────────────────┐        │
│  │  테이블: 단지명 | 평당가 | 기준일 | 출처 | 등록자 | 삭제 │      │
│  └─────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

**상세 스타일 (reports/page.tsx 인라인 스타일 패턴 준수):**

헤더 Nav:
- reports/page.tsx와 동일. 타이틀: `"관리자 · 매물가 입력"`

페이지 본문:
- `maxWidth: 1100`, `margin: '0 auto'`, `padding: '28px 32px'`

입력 폼 카드:
- `className="card"`, `padding: 24px`, `marginBottom: 20px`
- 폼 제목: `font: '700 16px/1.4 var(--font-sans)'`, `margin: '0 0 16px'`

평당가 입력:
- `className="input"`, `type="number"`, `min="100"`, `max="99999"`, `step="1"`
- placeholder: `"예: 1850"` (만원 단위 숫자)
- 입력창 오른쪽 단위 레이블: `"만원/평"` (`500 11px/1 --fg-tertiary`)

기준일 입력:
- `className="input"`, `type="date"`

출처 입력:
- `className="input"`, `type="text"`
- placeholder: `"KB시세, 직방, 네이버 부동산 등"`
- maxlength: 100

저장 버튼:
- `className="btn btn-sm btn-orange"`, `type="submit"`
- pending: "등록 중…" (비활성)

**최근 입력 내역 테이블:**
- 헤더: `['단지명', '평당가', '기준일', '출처', '등록일', '삭제']`
- 평당가 셀: `tnum` 클래스, `{price.toLocaleString()}만원/평`
- 기준일 셀: `YYYY.MM.DD` 포맷, `500 12px/1 --fg-tertiary`
- 삭제 버튼: `className="btn btn-sm btn-ghost"`, 텍스트 "삭제", `color: 'var(--fg-negative)'`
- 삭제 확인: 별도 모달 없음 — 버튼 클릭 즉시 Server Action (되돌리기 없음 — 이 점을 UI에 명시하지 않음)

**빈 상태:**
```
아직 입력된 매물가가 없습니다.
```
`className="card"`, `padding: 40`, `textAlign: center`

**접근성:**
- `<form aria-label="매물가 등록">`
- 각 필드에 명시적 `<label htmlFor>` 쌍
- 평당가 input: `aria-label="평당가 (만원 단위)"`
- Server Action 피드백: `aria-live="polite"` wrapper

**메타데이터:**
```typescript
export const metadata: Metadata = { title: '관리자 · 매물가 입력' }
```

---

## 4. Interaction Patterns

### 4-1. RedevelopmentTimeline (정적)

타임라인은 순수 표시 컴포넌트다. 인터랙션 없음.
- 스크롤: 모바일에서 타임라인 컨테이너 `overflowX: 'auto'` (수평 스크롤 허용)
- 스크롤 힌트: 오른쪽 끝에 페이드 마스크 불필요 — 단계명이 절단되면 인지 가능
- hover: 없음

### 4-2. ValueQuadrantChart Tooltip

```
[배경 단지 점] 마우스 오버
  ↓
Tooltip: 단지명 + 평당가 + 학군점수
배경: #fff, border: 1px solid var(--line-default), borderRadius: 8px
font: 12px var(--font-sans)

[현재 단지 점] 마우스 오버
  ↓
Tooltip 동일 + 텍스트 "현재 단지" 강조 표시
```

Tooltip은 Recharts 기본 Tooltip 컴포넌트 사용 (커스텀 불필요).
`contentStyle: { fontSize: 12, fontFamily: 'var(--font-sans)', border: '1px solid rgba(112,115,124,.22)', borderRadius: 8 }`

### 4-3. Admin Form — Server Action Flow

**재건축 단계 저장:**
```
[저장] 버튼 클릭
  ↓ pending: 버튼 "저장 중…" + 비활성
  ↓ Server Action: upsertRedevelopmentProject()
  ├─ 성공: "저장되었습니다." 표시, 2초 후 페이지 revalidate → 테이블 갱신
  └─ 실패: 에러 메시지 표시 (비활성 해제)
```

**매물가 등록:**
```
[등록] 버튼 클릭
  ↓ pending: 버튼 "등록 중…" + 비활성
  ↓ Server Action: upsertListingPrice()
  ├─ 성공: "등록되었습니다." 표시 + 폼 초기화, 테이블 갱신
  └─ 실패: 에러 메시지 표시
```

폼 초기화: 성공 후 `select` → 기본값, `number` input → "", `date` input → 오늘 날짜, `text` input → ""

---

## 5. Responsive Behavior

### RedevelopmentTimeline

| Breakpoint | 동작 |
|-----------|------|
| Mobile (<640px) | 타임라인 컨테이너 `overflowX: 'auto'`, 단계명 `fontSize: 10px` |
| Tablet (640~1023px) | 동일 (단계 수가 많아 모바일 스크롤 패턴 유지) |
| Desktop (≥1024px) | `overflowX: 'visible'`, 단계명 `fontSize: 11px`, 전체 표시 |

**스크롤 컨테이너 스타일:**
```css
overflowX: auto;
paddingBottom: 8px;  /* 스크롤바 공간 확보 */
-webkit-overflow-scrolling: touch;
```

### ValueQuadrantChart

| Breakpoint | 동작 |
|-----------|------|
| Mobile (<640px) | `height={240}` (고정값 축소), 4분면 라벨 텍스트 `10px` |
| Tablet/Desktop (≥640px) | `height={280}` (기본값), 라벨 `11px` |

ResponsiveContainer는 항상 `width="100%`를 사용하되 `height`는 고정 픽셀값 지정 (height=0 pitfall 방지).

### Admin Pages (Redevelopment + Listing Prices)

| Breakpoint | 동작 |
|-----------|------|
| Mobile (<640px) | 폼 필드 단일 컬럼, `padding: '16px 16px'` |
| Tablet (640~1023px) | 동일 |
| Desktop (≥1024px) | `maxWidth: 1100`, `padding: '28px 32px'` (reports 패턴 동일) |

테이블: 모바일에서 `overflowX: auto` 래퍼로 수평 스크롤 허용.

---

## 6. Accessibility Requirements

### 전체 기준: WCAG 2.1 AA

**키보드 탐색:**
- RedevelopmentTimeline: 탭 불필요 (표시 전용). 단계 목록 `<ol>` 내부 요소는 포커스 불필요.
- ValueQuadrantChart: Recharts Tooltip은 마우스 전용 — 스크린 리더는 `aria-label` 요약으로 대체.
- Admin 폼: `Tab` 순서 — 단지 select → 단계/평당가 input → 기준일/notes → 저장 버튼.
- Admin 테이블 삭제 버튼: `Tab` 접근, `Enter` 실행.

**포커스 표시:**
- 기존 `.input:focus` 패턴 (`border-color: --dj-orange`, `box-shadow: 0 0 0 4px rgba(234,88,12,.12)`) 모든 폼 요소에 동일 적용.
- `:focus-visible` 사용.

**스크린 리더 레이블:**

| 컴포넌트 | aria 속성 |
|----------|----------|
| RedevelopmentTimeline wrapper | `<section aria-label="재건축 진행 단계">` |
| 현재 단계 li | `aria-current="step"` |
| cancelled 단계 배지 | `aria-label="재건축 취소 상태"` |
| ValueQuadrantChart wrapper | `role="img"`, `aria-label="단지 가성비 분석 산점도"` |
| 스크린 리더 전용 요약 | `className="sr-only"` (숨김 텍스트) |
| Admin 폼 | `aria-label="재건축 단계 입력"` / `"매물가 등록"` |
| Server Action 피드백 | `aria-live="polite"` |
| Admin 테이블 삭제 버튼 | `aria-label="{단지명} 매물가 삭제"` |

**색맹 안전:**
- 타임라인 완료/현재/미래 구분: 색 + 원 내부 체크마크 아이콘 + aria 상태 레이블 (3중 표시).
- 재건축 배지: 색 외에 텍스트 레이블 포함.
- 차트: 배경점(회색)과 target점(주황) — 색 외에 크기(`r`) 차이로 구분 (`r=6` vs 기본 `r=4`).

**최소 터치 영역:**
- Admin 저장/등록 버튼: `btn-sm` (`height: 32px`) → 버튼 주변 `min-height: 44px` wrapper로 확보.
- 테이블 삭제 버튼: `min-height: 44px` transparent wrapper (`display: flex; alignItems: center; justifyContent: center`) 패턴 사용. `btn-sm` height(32px)은 고정이므로 wrapper로 44px 터치 영역 보정.

**reduced-motion:**
- ValueQuadrantChart: Recharts 애니메이션은 `isAnimationActive={false}` (Scatter 컴포넌트에 적용). 별도 CSS 조건 불필요 — 항상 애니메이션 비활성화.
- RedevelopmentTimeline: 애니메이션 없음. 문제 없음.

---

## 7. Copywriting Contract

### CTA 레이블

| 액션 | 레이블 | pending 레이블 |
|------|--------|---------------|
| 재건축 단계 저장 | "저장" | "저장 중…" |
| 매물가 등록 | "등록" | "등록 중…" |
| 매물가 삭제 | "삭제" | (확인 없이 즉시 실행) |

### 빈 상태 카피

| 컴포넌트 | 빈 상태 메시지 |
|----------|--------------|
| ValueQuadrantChart (데이터 부족) | "이 지역 단지 데이터가 부족하여 차트를 표시할 수 없습니다." |
| Admin Redevelopment 목록 | "등록된 재건축 단지가 없습니다." |
| Admin Listing Prices 목록 | "아직 입력된 매물가가 없습니다." |

### 에러 상태 카피

| 에러 상황 | 메시지 |
|---------|--------|
| 재건축 단계 저장 실패 — 단지 미선택 | "단지를 선택해 주세요." |
| 재건축 단계 저장 실패 — 단계 미선택 | "진행 단계를 선택해 주세요." |
| 재건축 단계 저장 실패 — 서버 오류 | "저장에 실패했습니다. 다시 시도해 주세요." |
| 매물가 등록 실패 — 단지 미선택 | "단지를 선택해 주세요." |
| 매물가 등록 실패 — 평당가 범위 오류 | "평당가는 100~99,999만원 범위로 입력해 주세요." |
| 매물가 등록 실패 — 기준일 미입력 | "기준일을 입력해 주세요." |
| 매물가 등록 실패 — 서버 오류 | "등록에 실패했습니다. 다시 시도해 주세요." |
| 매물가 삭제 실패 | "삭제에 실패했습니다. 다시 시도해 주세요." |
| 권한 없음 (admin 아닌 사용자) | redirect('/') — 에러 메시지 미표시 |

### 차트 부제목 패턴

| 컴포넌트 | 부제목 패턴 |
|----------|-----------|
| ValueQuadrantChart | "{si} {gu} 내 단지 비교 ({N}개 단지)" |

### 재건축 단계 한국어 표시명

| enum 값 | 표시명 |
|---------|--------|
| `rumor` | 재건축 소문 |
| `proposed` | 추진 제안 |
| `committee_formed` | 추진위 구성 |
| `safety_eval` | 안전진단 |
| `designated` | 구역 지정 |
| `business_approval` | 사업 승인 |
| `construction_permit` | 착공 허가 |
| `construction` | 공사 중 |
| `completed` | 완공 |
| `cancelled` | 취소 |

---

## 8. Implementation Notes

### 신규 생성 파일

| 파일 | 역할 | 비고 |
|------|------|------|
| `src/components/complex/RedevelopmentTimeline.tsx` | 재건축 수평 스텝 시퀀스 | RSC, 'use client' 없음 |
| `src/components/complex/ValueQuadrantChart.tsx` | Recharts ScatterChart 4분면 | 'use client' 필수 |
| `src/app/admin/redevelopment/page.tsx` | 어드민 재건축 단계 입력 | RSC + Server Action |
| `src/app/admin/listing-prices/page.tsx` | 어드민 매물가 입력 | RSC + Server Action |

### 수정 대상 파일

| 파일 | 수정 내용 |
|------|----------|
| `src/app/complexes/[id]/page.tsx` | ① `getRedevelopmentProject(id, supabase)` 추가, ② `getQuadrantData(complex.si, complex.gu, supabase)` 추가, ③ 차트 카드 아래 `<ValueQuadrantChart>` 삽입, ④ 시설 카드 아래 조건부 `<RedevelopmentTimeline>` 삽입 |
| `src/app/admin/reports/page.tsx` | 헤더 Nav에 `"/admin/redevelopment"`, `"/admin/listing-prices"` 링크 추가 (선택적) |

### 디자인 시스템 통합

**기존 클래스 재사용 목록:**
- `.card` — 모든 신규 카드 컨테이너
- `.btn`, `.btn-sm`, `.btn-orange`, `.btn-ghost` — 어드민 폼 버튼
- `.badge`, `.badge.neutral`, `.badge.pos`, `.badge.neg`, `.badge.orange` — 재건축 단계 배지
- `.chip`, `.chip.sm` — 어드민 테이블 chip
- `.input` — 어드민 폼 모든 입력 요소 (input, select, textarea)
- `.tnum` — 평당가, 날짜 등 숫자 표시

**신규 CSS 없음:** Phase 5의 모든 컴포넌트는 기존 `globals.css` 토큰과 유틸리티 클래스로 구현 가능. 별도 CSS 파일 추가 불필요.

**Recharts 사용 패턴 (TransactionChart.tsx 확장):**
- `'use client'` directive 최상단
- `ResponsiveContainer` 사용 시 `height={280}` 고정값 (height=0 pitfall 방지)
- CSS 변수는 Recharts prop에 사용 불가 — literal hex 값 사용 (`#ea580c`, `#d1d5db`)

**ISR 페이지 + 'use client' 차트 분리 패턴:**
- `page.tsx`는 RSC 유지 (`export const revalidate = 86400`)
- `getQuadrantData()` — `src/lib/data/quadrant.ts`에 구현, page.tsx에서 호출
- `<ValueQuadrantChart>` — `dynamic(() => import('@/components/complex/ValueQuadrantChart'), { ssr: false })` 로 import (SSR 시 window 오류 방지)

**어드민 Server Action 패턴 (기존 패턴 동일):**
```typescript
// src/lib/actions/redevelopment-actions.ts
'use server'
// 1. createSupabaseServerClient()로 user 확인
// 2. profiles에서 role 확인 ('admin' | 'superadmin')
// 3. 권한 없으면 redirect('/')
// 4. createSupabaseAdminClient()로 upsert
// 5. revalidatePath('/admin/redevelopment')
```

---

## 9. Quality Gate Check

- [x] AI 슬롭 없음: backdrop-blur, gradient-text, glow, 보라/인디고, gradient orb 미사용
- [x] 특정 스타일 방향: Swiss/Editorial Data-First 유지 (Phase 4와 동일)
- [x] 디자인 품질 필라 4개 이상 충족:
  - [x] 1. 명확한 시각적 위계 (타임라인 완료/현재/미래 3단계, 차트 target 포인트 크기/색 강조)
  - [x] 3. 깊이감 (카드 border, 산점도 레이어, 타임라인 스텝 원)
  - [x] 5. 의미 있는 색상 (주황=현재/target, 회색=배경/미래, 양성=완공, 음성=취소)
  - [x] 6. 디자인된 포커스/피드백 상태 (폼 focus ring, Server Action 성공/에러 인라인)
- [x] Phase 4 디자인 시스템 계승: 신규 토큰 0개, 기존 클래스 재사용
- [x] Recharts: 'use client' 분리, height 고정값, CSS변수→literal 변환 명세
- [x] ISR 페이지 분리 패턴: dynamic import ssr:false 명세
- [x] 재건축 타임라인: 9단계 표시 + cancelled 별도 처리 명세
- [x] 4분면 라벨: 절대 위치 오버레이 div (SVG 내부 아님) 명세
- [x] 어드민 폼: reports/page.tsx 인라인 스타일 패턴 명세
- [x] 색맹 안전: 타임라인 (색+아이콘+aria), 차트 (색+크기)
- [x] 모바일 반응형: 타임라인 수평 스크롤, 차트 height 축소, 어드민 단일 컬럼
- [x] 접근성 요건 명세 (WCAG 2.1 AA): aria-label, aria-current, role, aria-live
- [x] 4개 컴포넌트 전체 명세 완료
- [x] 타이포그래피 4단계: 22/16/13/11px (Phase 4 동일)
- [x] 폰트 굵기 2단계: 700(제목) + 500(본문·소형·배지) — 600 제거됨
- [x] Copywriting Contract: 10개 enum 한국어 표시명, 8개 에러 메시지, 3개 빈 상태
- [x] 60/30/10 색상 비율 유지

---

*Source: CONTEXT.md (D-01~D-14, Claude's Discretion), RESEARCH.md, 04-UI-SPEC.md (디자인 시스템 베이스라인),*
*TransactionChart.tsx (Recharts 패턴), complexes/[id]/page.tsx (삽입 위치), admin/reports/page.tsx (어드민 패턴), globals.css (토큰)*
*Phase: 5-데이터확장운영안정성*
*UI-SPEC 작성일: 2026-05-07*
