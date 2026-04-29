# UI 디자인 가이드

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

## 색상
### 배경
| 용도 | 값 |
|------|------|
| 페이지 | `#ffffff` |
| 서브 배경 | `#fafafa` |
| 카드 / hover | `#ffffff` / `#f5f5f5` |
| 보더 | `#e5e5e5` |

### 텍스트
| 용도 | 값 |
|------|------|
| heading | `#0a0a0a` |
| body | `#404040` |
| 보조 | `#737373` |
| 비활성 | `#a3a3a3` |

### 데이터/시맨틱 색상
| 용도 | 값 |
|------|------|
| 액센트 (단지온도 오렌지) | `#ea580c` |
| 시세 상승 / 신고가 | `#16a34a` |
| 시세 하락 / 에러 | `#dc2626` |
| 광고 라벨 배경 | `#f3f4f6` |
| 광고 라벨 텍스트 | `#6b7280` |
| AI 추정값 배경 | `#fef3c7` |
| AI 추정값 텍스트 | `#92400e` |

## 타이포그래피
- 한글: **Pretendard Variable**
- 숫자/금액: JetBrains Mono (자릿수 정렬)

| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | `text-3xl font-semibold text-[#0a0a0a]` |
| 섹션 제목 | `text-base font-medium text-[#0a0a0a]` |
| 카드 라벨 | `text-xs font-medium text-[#737373] uppercase tracking-wide` |
| 본문 | `text-sm text-[#404040] leading-relaxed` |
| 거래가 (강조) | `text-4xl font-semibold text-[#0a0a0a] font-mono` |
| 갱신폭 (액센트) | `text-2xl font-semibold text-[#ea580c]` |
| 비활성/보조 | `text-sm text-[#a3a3a3]` |

## 컴포넌트
### 카드
```
rounded-lg bg-white border border-[#e5e5e5] p-4
hover:bg-[#f5f5f5] transition-colors duration-150
```

### 버튼
```
Primary:   rounded-md bg-[#0a0a0a] text-white text-sm px-4 py-2 hover:bg-[#404040]
Secondary: rounded-md border border-[#e5e5e5] text-sm px-4 py-2 hover:bg-[#f5f5f5]
Accent:    rounded-md bg-[#ea580c] text-white text-sm px-4 py-2 hover:bg-[#c2410c]
Text:      text-[#737373] text-sm hover:text-[#404040]
```

### 입력 필드
```
rounded-md border border-[#e5e5e5] bg-white px-3 py-2 text-sm
focus:outline-none focus:ring-2 focus:ring-[#ea580c] focus:border-transparent
```

### 배지
```
광고:     rounded text-xs px-1.5 py-0.5 bg-[#f3f4f6] text-[#6b7280]
AI 추정:  rounded text-xs px-1.5 py-0.5 bg-[#fef3c7] text-[#92400e]
신축:     rounded text-xs px-1.5 py-0.5 bg-[#eff6ff] text-[#1d4ed8]
재건축:   rounded text-xs px-1.5 py-0.5 bg-[#fdf2f8] text-[#9d174d]
```

## 레이아웃
- 전체 너비: `max-w-screen-xl mx-auto px-4` (데스크톱) / `max-w-screen-md` (본문 읽기)
- 정렬: 좌측 정렬 기본. 중앙 정렬 금지 (랜딩 hero 제외)
- 간격: 카드 내 `gap-3~4`, 섹션 간 `space-y-8 ~ space-y-12`
- 모바일 퍼스트: 768px 이하 1열 → 이상 2~3열

## 애니메이션
- `fade-in`: opacity 0→1, 0.2s ease-out
- `slide-up`: translateY 8px→0 + fade-in, 0.3s ease-out
- 그 외 모든 애니메이션 금지 (pulse·bounce·spin은 로딩 스피너 전용만 예외)

## 아이콘
- **Lucide React** — `strokeWidth={1.75}` 기본
- 크기: 16px (인라인), 20px (버튼/리스트), 24px (섹션 헤더)
- 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다

## 핵심 컴포넌트 (도메인)

### 신고가 카드
- 단지명 + 동·구 / 평형 / 거래가 + **갱신폭(액센트)** / 거래일
- 갱신폭이 핵심 — 숫자 크게, 텍스트 작게

### 단지 카드 (검색 결과)
- 단지명 / 주소 / 세대수·연식 / 최근 거래가·평형 / 즐겨찾기 별 아이콘

### AI 추정 라벨
- 배너: "AI가 자동 추정한 값입니다 — 정확하지 않을 수 있어요"
- 항상 `bg-[#fef3c7] text-[#92400e]` + 참고 단지 링크

### 데이터 기준일 라벨
- 각 섹션 우상단: `text-xs text-[#a3a3a3]` "기준: YYYY-MM-DD"
- SLA 초과 시: `text-[#dc2626]` + "⚠ 갱신 지연"

## 벤치마크
- 정보 밀도: 호갱노노, 직방, 부동산플래닛
- 도구 미니멀: Linear, Vercel Dashboard, Stripe
- 지역 깊이: Zillow (미국), Redfin
