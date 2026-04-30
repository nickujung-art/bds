# Step 9 (2-community): listing-gap-label

## 목표
매물 호가와 실거래가의 갭을 단지 상세에 라벨로 표시한다.

## 배경 / 데이터 소스 결정
국토부 실거래가 API에는 매물 호가 데이터가 없다. V1.5에서 선택 가능한 출처:
1. **네이버 부동산 크롤링** — 약관 위반 리스크로 금지
2. **직방·다방 API** — 공개 API 없음
3. **운영자 수동 입력** — 카페·분양 정보에서 임장 시 수집 (확장성 없음)
4. **사용자 제보 매물가** — 가장 현실적. 회원이 직접 호가 입력 → 집계

**V1.5 결정**: 사용자 제보 방식. 1개월 이내 제보만 집계, 중앙값 사용.

## 전제 (Prerequisites)
- 0-mvp step12 완료 (단지 상세)
- 1-launch step0 완료 (인증)

## 적용 범위 (Scope)
- `supabase/migrations/0018_listing_prices.sql` — `listing_prices` 테이블
- `src/components/danji/ListingGapLabel.tsx`

## 데이터 모델

```sql
listing_prices
  id            uuid PK
  complex_id    uuid FK NOT NULL
  area_m2       numeric(6,2) NOT NULL    -- 전용면적 (거래 데이터와 매칭)
  price_krw     bigint NOT NULL          -- 호가 (만원)
  reporter_id   uuid FK NOT NULL         -- 제보자
  reported_at   timestamptz DEFAULT now()
  expires_at    timestamptz              -- reported_at + 30일
  is_verified   boolean DEFAULT false    -- 운영자 검증 (optional)
```

## 도메인 컨텍스트 / 가드레일
- RLS: reporter_id=auth.uid()만 INSERT. SELECT `expires_at > now()` 전체 공개
- 갭 라벨 계산: `(호가_중앙값 - 실거래가_중앙값) / 실거래가_중앙값 × 100%`
- 제보 ≥ 3건 이상 집계 시만 라벨 표시 (신뢰도 기준)
- **데이터 기준일 라벨** 필수: "호가는 회원 제보 기준 (최근 30일, N건)"
- 호가가 실거래가 대비 비정상 범위(±50% 초과)이면 경고 표시 + 운영자 검토 큐

## 작업 목록
1. `0018_listing_prices.sql` + RLS
2. 단지 상세 호가 제보 폼 (로그인 회원, 평형 선택 + 가격 입력)
3. `ListingGapLabel.tsx`: 갭 퍼센트 표시 + 기준일 라벨
4. 비정상 호가 운영자 알림

## 수용 기준 (Acceptance Criteria)
- [ ] 호가 제보 → DB 저장
- [ ] 3건 이상 집계 → 갭 라벨 표시
- [ ] 2건 이하 → 라벨 미표시

## Definition of Done
매물가 갭 라벨 완성. 사용자 제보 기반 호가 정보 제공.
