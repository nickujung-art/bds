# Step 8 (2-community): value-matrix

## 목표
창원·김해 단지를 평당가(X축) × 학군 점수(Y축)로 분류한 가성비 4분면 분석 차트를 구현한다.

## 전제 (Prerequisites)
- 0-mvp step7 완료 (학교알리미 학군 데이터)
- 0-mvp step12 완료 (단지 상세 — 평당가 데이터)

## 적용 범위 (Scope)
- `src/lib/ranking/value-matrix.ts` — 학군 점수 산식 + 4분면 분류
- `src/app/(public)/map/page.tsx` 또는 별도 `/analysis` 페이지 — 산점도 차트
- `src/components/map/ValueMatrixChart.tsx` — Recharts ScatterChart

## 학군 점수 산식 (V1.5)

```
학군_점수 = (배정_초등학교_학급당_학생수_역수 × 0.4)
           + (배정_중학교_학업성취율 × 0.4)
           + (배정_고등학교_대학진학률 × 0.2)
정규화: 창원·김해 전체 단지 중 백분위 0~100
```
- 학업성취율·대학진학률은 학교알리미 공개 항목 사용
- 데이터 미제공 학교는 지역 평균으로 대체 + 데이터 기준일 라벨 표시

## 도메인 컨텍스트 / 가드레일
- 4분면: ① 고가·고학군, ② 저가·고학군(가성비), ③ 고가·저학군, ④ 저가·저학군
- 평당가는 최근 1년 거래 중앙값. `cancel_date IS NULL AND superseded_by IS NULL` 조건 필수
- 매물가 데이터는 V1.5에서도 외부 출처 없음. **"매물가 vs 실거래가 갭"은 step9에서 별도 처리**
- 산점도는 단지 수 많으면 클러스터링(supercluster 재사용 또는 투명도 처리)
- RSC로 데이터 계산, Client Component로 Recharts 렌더

## 작업 목록
1. `value-matrix.ts`: `calcSchoolScore(complexId)` + `classifyQuadrant(price, score)`
2. 랭킹 일배치에 학군 점수 계산 포함 (매일 갱신)
3. `ValueMatrixChart.tsx`: Recharts ScatterChart, 4분면 색상 구분, 핀 클릭 → 단지 상세
4. 분석 페이지 또는 지도 탭에 추가

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (학군 점수 산식 단위 테스트)
- [ ] 산점도에 300+ 단지 렌더 (로컬 기준 ≤ 3s)
- [ ] 핀 클릭 → 단지 상세 이동

## Definition of Done
가성비 4분면 분석 완성. 차별화 인사이트 제공.
