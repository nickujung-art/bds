# UI 디자인 가이드

> 프로토타입 참고: Claude Design으로 작성된 가설 검증 프로토타입(2026-04-30)을 바탕으로 업데이트됨.  
> 기반 디자인 시스템: **Wanted Design System** (Pretendard + Wanted Sans)

## 디자인 원칙
1. 도구처럼 보여야 한다 — 매일 쓰는 대시보드, 마케팅 페이지 아님
2. "보이는 즉시 이해" — 일러스트·블로그 사진·마케팅 카피 금지
3. 호갱노노·직방형 정보 밀도 + Linear·Vercel형 도구 미니멀

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| `backdrop-filter: blur()` | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 `rounded-2xl` | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (`blur-3xl` 원형) | 모든 AI 랜딩 페이지에 있는 장식 |

---

## 색상 시스템

> 아래 값은 Wanted Design System 토큰과 단지온도 커스텀 토큰을 함께 정의한다.  
> 구현 시 CSS custom property로 선언하고, Tailwind `theme.extend.colors`에 매핑한다.

### 브랜드 (단지온도)
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--dj-orange` | `#ea580c` | 메인 액센트 — 신고가·CTA |
| `--dj-orange-tint` | `#FFF1E8` | 오렌지 배경 (뱃지·하이라이트) |
| `--dj-orange-dark` | `#c2410c` | 오렌지 hover |

### 기본 배경
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--bg-canvas` | `#F7F7F8` | 페이지 배경 (cool-99) |
| `--bg-surface` | `#FFFFFF` | 카드 |
| `--bg-surface-2` | `#F4F4F5` | 선택된 항목·sunken 영역 |
| `--bg-brand-tint` | `#EAF2FE` | 파란색 강조 배경 |

### 텍스트(Foreground)
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--fg-pri` | `#171719` | 제목·본문 강조 (cool-10) |
| `--fg-sec` | `rgba(55,56,60,0.61)` | 보조 텍스트 |
| `--fg-tertiary` | `rgba(55,56,60,0.43)` | 부가 정보·placeholder |
| `--fg-dis` | `rgba(55,56,60,0.28)` | 비활성 |
| `--fg-brand` | `#0066FF` | 링크·primary 액션 |
| `--fg-positive` | `#00BF40` | 시세 상승 |
| `--fg-negative` | `#FF4242` | 시세 하락·에러 |
| `--fg-cautionary` | `#FF9200` | 경고 |

### 보더
| 토큰 | 값 | 용도 |
|------|-----|------|
| `--line-default` | `rgba(112,115,124,0.22)` | 카드·입력·탭 기본 선 |
| `--line-subtle` | `rgba(112,115,124,0.12)` | 목록 구분선 |
| `--line-strong` | `rgba(112,115,124,0.35)` | 강조 구분선 |

### 시맨틱 (데이터 표시용)
| 용도 | 배경 | 텍스트 |
|------|------|--------|
| 신고가/상승 | `#D9FFE6` (`bg-positive-tint`) | `#00BF40` |
| 하락/오류 | `#FEECEC` (`bg-negative-tint`) | `#FF4242` |
| 경고/추정 | `#FEF4E6` (`bg-cautionary-tint`) | `#FF9200` |
| AI 추정값 | `#fef3c7` | `#92400e` |
| 광고 라벨 | `#F4F4F5` | `rgba(55,56,60,0.61)` |

---

## 타이포그래피

### 폰트
- **본문**: `Pretendard` (정적 웹폰트, 100~900 weight)
- **Display/브랜드**: `Wanted Sans Variable` (가변 웹폰트)
- **숫자/금액**: `font-variant-numeric: tabular-nums` + Pretendard (등폭 숫자)
- 시스템 fallback: `-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`

> 이전 가이드의 "JetBrains Mono" 숫자 폰트는 프로토타입에서 채택되지 않았다.  
> `tabular-nums` CSS 속성으로 가격 정렬을 해결한다.

### 타입 스케일 (Wanted DS 기준)
| 클래스 | 크기 | 행간 | 자간 | 굵기 | 용도 |
|--------|------|------|------|------|------|
| display-3 | 36px | 1.334 | -0.027em | 700 | 섹션 대제목 |
| title-1 | 32px | 1.375 | -0.025em | 700 | 페이지 제목 |
| title-2 | 28px | 1.358 | -0.024em | 700 | 서브 제목 |
| title-3 | 24px | 1.334 | -0.023em | 700 | 카드 대제목 |
| heading-1 | 22px | 1.364 | -0.019em | 700 | 섹션 헤더 |
| heading-2 | 20px | 1.400 | -0.012em | 700 | 카드 제목 |
| headline-1 | 18px | 1.445 | -0.002em | 600 | 목록 항목 강조 |
| body-1n | 16px | 1.500 | +0.006em | 500 | 본문 |
| body-2n | 15px | 1.467 | +0.010em | 500 | 보조 본문 |
| label-1n | 14px | 1.429 | +0.015em | 500 | 레이블·버튼 |
| label-2 | 13px | 1.385 | +0.019em | 500 | 작은 레이블 |
| caption-1 | 12px | 1.334 | +0.025em | 500 | 캡션·날짜 |
| caption-2 | 11px | 1.273 | +0.031em | 500 | 최소 텍스트 |

**가격 표시 (강조)**: 22~28px, weight 700, `tabular-nums`, `#171719`  
**갱신폭 (액센트)**: 13~16px, weight 600, `#ea580c`

---

## 간격 (4pt Grid)

```
2px / 4px / 6px / 8px / 10px / 12px / 14px / 16px
20px / 24px / 28px / 32px / 40px / 48px / 64px / 80px
```

Tailwind 기본 간격 scale 사용 가능 (2=8px → 주의: Tailwind는 1=4px 기준).

---

## 모서리 반경 (Radius)

| 토큰 | 값 | 용도 |
|------|-----|------|
| `radius-xs` | 4px | 뱃지·미니 칩 |
| `radius-sm` | 6px | 코드·태그 |
| `radius-md` | 8px | 소형 버튼 |
| `radius-lg` | 10px | 중형 버튼·입력 |
| `radius-xl` | 12px | 대형 버튼·목록 셀 |
| `radius-2xl` | 16px | 소형 카드 |
| `radius-3xl` | 24px | **카드 기본** |
| `radius-4xl` | 32px | 모달·바텀시트 |
| `radius-full` | 9999px | 칩·배지·핀 |

---

## 컴포넌트

### 로고
```
[단] 단지온도
```
- `[단]`: 20×20px, border-radius 6px, `bg-[#ea580c]`, 흰색 텍스트 800 weight 12px
- 텍스트: 19px, weight 800, letter-spacing -0.025em, `#171719`
- 로고 옆 nav 항목 — 현재 페이지: `#ea580c`, 나머지: `var(--fg-sec)`

### 글로벌 네비게이션 (데스크톱)
```
height: 60px
border-bottom: 1px solid var(--line-default)
padding: 0 32px
background: #fff
```
구성: `로고` → `nav 링크` → `검색바(flex-1, max 480px)` → `알림 아이콘` → `로그인 버튼`

### 버튼
```css
/* 공통 */
.btn {
  display: inline-flex; align-items: center; gap: 6px;
  border-radius: var(--radius-md); font-weight: 600;
  letter-spacing: -0.012em; transition: 120ms ease;
}

/* 크기 */
.btn-sm  { height: 32px; padding: 0 12px; font-size: 13px; }
.btn-md  { height: 40px; padding: 0 16px; font-size: 14px; border-radius: var(--radius-lg); }
.btn-lg  { height: 48px; padding: 0 20px; font-size: 16px; border-radius: var(--radius-xl); }

/* 종류 */
.btn-orange    { background: #ea580c; color: #fff; }       /* 메인 CTA */
.btn-dark      { background: #171719; color: #fff; }       /* 확인·제출 */
.btn-secondary { background: #fff; border: 1px solid var(--line-default); color: var(--fg-pri); }
.btn-ghost     { background: transparent; color: var(--fg-pri); }
.btn-brand     { background: #0066FF; color: #fff; }       /* 카카오/네이버 대안 */
```

### 입력 필드
```css
.input {
  height: 44px; border-radius: var(--radius-lg);
  border: 1px solid var(--line-default); background: #fff;
  padding: 0 14px; font: 500 15px/1.4 var(--font-sans);
  color: var(--fg-pri);
}
.input:focus {
  border-color: #ea580c;
  box-shadow: 0 0 0 4px rgba(234,88,12,0.12);
}
```
- 검색창 활성 상태: 오렌지 포커스 링

### 카드
```css
/* 일반 카드 */
.card {
  background: #fff; border: 1px solid var(--line-default);
  border-radius: 24px; padding: 24px;
}

/* 플랫 카드 (목록형) */
.card-flat {
  background: #fff; border-radius: 16px;
  padding: 16px; border: 1px solid var(--line-default);
}
```

### 칩 (Chip)
```css
.chip {
  height: 28px; padding: 0 12px; border-radius: 9999px;
  background: var(--bg-surface-2); font: 600 13px/1 var(--font-sans);
}
.chip.selected { background: #171719; color: #fff; }
.chip.outlined { background: #fff; border: 1px solid var(--line-default); }
.chip.orange   { background: #FFF1E8; color: #ea580c; }
.chip.sm       { height: 24px; padding: 0 10px; font-size: 12px; }
```

### 배지 (Badge)
```css
.badge {
  height: 22px; padding: 0 8px; border-radius: 6px;
  font: 600 11px/1 var(--font-sans); letter-spacing: 0.02em;
  display: inline-flex; align-items: center; gap: 4px;
}
/* 종류 */
.badge.orange  { background: #FFF1E8; color: #ea580c; }    /* 신고가 🔥 */
.badge.pos     { background: #D9FFE6; color: #00BF40; }    /* 상승 */
.badge.neg     { background: #FEECEC; color: #FF4242; }    /* 하락 */
.badge.neutral { background: var(--bg-surface-2); color: var(--fg-pri); } /* 연식·세대수 */
.badge.dark    { background: #171719; color: #fff; }       /* 강조 */
.badge.ai      { background: #fef3c7; color: #92400e; }    /* AI 추정 */
```

### 탭 (Tab)
```css
.tabs { display: flex; border-bottom: 1px solid var(--line-default); }
.tab  { padding: 12px 16px; font: 600 14px/1 var(--font-sans); color: var(--fg-sec); border-bottom: 2px solid transparent; margin-bottom: -1px; }
.tab.active        { color: var(--fg-pri); border-bottom-color: var(--fg-pri); }
.tab.orange-active { color: #ea580c; border-bottom-color: #ea580c; }
```

### 지도 핀
```css
/* 지도 위 가격 라벨 핀 */
.map-pin .pill {
  background: #fff; border: 1px solid var(--line-strong);
  border-radius: 9999px; padding: 4px 10px;
  font: 700 12px/1 var(--font-sans);
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
}
.map-pin .pill.hot   { background: #ea580c; color: #fff; border-color: #ea580c; } /* 신고가 단지 */
.map-pin .pill.brand { background: #0066FF; color: #fff; border-color: #0066FF; } /* 선택 단지 */
.map-pin .stem { width: 2px; height: 6px; background: var(--line-strong); }
```

---

## 핵심 도메인 컴포넌트

### 신고가 카드 (Today's High)
4열 그리드 카드. 우선 정보 순서:
1. `badge.orange` 🔥신고가 + 날짜 (우측)
2. 단지명 (16px weight 700) + 지역·평형 (12px sec)
3. 거래가 (22px weight 700 tabular-nums) + "만원"
4. 갱신폭 (13px weight 600 오렌지): `▲ +3,500만 (+4.3%)`

### 순위 목록
- 순위 번호: 24px 고정 폭, 1~3위 `#ea580c`, 나머지 `var(--fg-tertiary)`
- 구분선: `border-bottom: 1px solid var(--line-subtle)`, padding 14px 0
- 우측 정렬: 등락률(오렌지) + 가격(fg-sec)

### 검색 자동완성
- 검색어 매칭 하이라이트: `<mark style="background:#FFF1E8; color:#ea580c">`
- 결과 행: 40px 핀 아이콘 컨테이너 + 단지명/서브텍스트 + 우측 최근 거래가
- 서브 패널: 최근 검색(칩) + 실시간 인기 검색어(흰 카드)

### 10년 가격 차트 (PriceChart)
- 라인: `stroke: #ea580c, strokeWidth: 2`
- 영역: 오렌지 gradient fill (opacity 0.18 → 0)
- 신고가 마커: 오렌지 점 + 흰 테두리 + "신고가" 다크 토스트
- Y축 레이블: 억 단위 (`v/10000.toFixed(1)억`), 10px Pretendard, sec 색상
- X축: `'YY` 형식

### 단지 상세 레이아웃 (데스크톱)
```
[전체 1280px]
└── 좌측 (1fr): 헤더카드 / 차트카드 / 시설카드
└── 우측 (360px 고정): 동네의견/알림 사이드바
```

### 모바일 단지 상세 레이아웃
```
Phone frame: 360px × 820px
StatusBar: 44px (9:41, 신호/배터리)
스크롤 본문: 상단 고정 헤더 + 가격 + 탭 + 콘텐츠
```

### AI 추정 라벨
- 황색 배너: `background: #fef3c7; color: #92400e`
- 문구: "AI가 자동 추정한 값입니다 — 정확하지 않을 수 있어요"
- 참고 단지 링크 최대 3개

### 데이터 기준일 라벨
- 각 섹션 우상단: `caption-1` (12px), `var(--fg-tertiary)` "기준: YYYY-MM-DD"
- SLA 초과: `color: #FF4242` + "⚠ 갱신 지연"

### 카페 유입 배너
- 카페에서 진입 시 (`?from=cafe`): 파란 tint 배너
- `background: #EAF2FE; color: #0066FF; border-radius: 10px; padding: 10px 14px`
- 문구: "창원맘카페에서 오셨네요 — 카페 회원 베타 혜택이 적용됩니다"

### 네이버 로그인 버튼
```css
background: #03C75A; color: #fff;
/* 아이콘: 네이버 N 로고 (흰색 SVG) */
```

---

## 레이아웃

### 데스크톱 (1280px 기준)
- 네비게이션: 60px 높이, 좌우 32px 패딩
- 본문 영역: `padding: 24px 32px` 또는 `padding: 32px 48px`
- 카드 그리드: 4열 (`repeat(4, 1fr)`) / 2열 (`1fr 360px`)
- 섹션 간격: 24~32px

### 모바일 (360px)
- 상태바: 44px
- 하단 탭바: 56px
- 콘텐츠 패딩: 16~20px
- 카드: 좌우 16px 여백

### 정렬 원칙
- 좌측 정렬 기본
- 중앙 정렬: 모달·빈 상태(Empty State)만 허용
- 우측 정렬: 가격·수치 (tabular-nums)

---

## 그림자

```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
--shadow-sm: 0 2px 8px rgba(23,23,23,0.06);
--shadow-md: 0 4px 16px rgba(23,23,23,0.07);
--shadow-lg: 0 8px 24px rgba(23,23,23,0.10);
--shadow-xl: 0 16px 40px rgba(0,0,0,0.12);
```
카드는 그림자 최소화 (border만으로 구분). 모달·드롭다운만 `shadow-lg`.

---

## 애니메이션
- `fade-in`: opacity 0→1, 0.2s ease-out
- `slide-up`: translateY 8px→0 + fade-in, 0.3s ease-out
- 그 외 모든 애니메이션 금지 (pulse·bounce·spin은 로딩 스피너 전용만 예외)
- 인터랙션 전환: `transition: 120ms ease` (버튼·호버 등)

---

## 아이콘
- **Lucide React** — `strokeWidth={1.75}` 기본
- 크기: 16px (인라인/버튼), 18px (목록 행), 20px (섹션 아이콘), 24px (네비게이션)
- 아이콘 컨테이너(둥근 배경 박스): **검색 결과 목록의 단지 아이콘에만** 허용 (40×40px, radius 10px, `bg-surface-2`)
- 그 외에는 단독 아이콘 사용 (배경 박스 금지)

---

## Persona별 화면 특성

### Persona A — 실수요자 (데스크톱)
- 뷰포트: 1280×820px
- 정보 밀도 최고, 4열 카드, 10년 그래프
- 좌우 2열 레이아웃 (메인 + 사이드바)

### Persona B — 임장러 (모바일)
- 뷰포트: 360×820px
- 지도 중심, 핀 클릭 미리보기 바텀시트
- 다크 상태바 (지도 전체화면)

### Persona C — 신혼/청년 (모바일 SEO)
- 뷰포트: 360×820px
- 비회원 SEO 유입 → 네이버 OAuth 전환
- 분양 피드·알림 신청 중심

---

## 벤치마크
- 정보 밀도: 호갱노노, 직방, 부동산플래닛
- 도구 미니멀: Linear, Vercel Dashboard, Stripe
- 지역 깊이: Zillow (미국), Redfin
- 디자인 시스템: Wanted Design System (Pretendard)
