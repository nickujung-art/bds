---
status: complete
phase: 09-complex-detail-ux
source: [09-VERIFICATION.md]
started: 2026-05-14T12:05:00Z
updated: 2026-05-14T14:30:00Z
---

## Current Test

Human UAT complete — all 5 items resolved 2026-05-14.

## Tests

### 1. 기간 필터 URL 상태
expected: `?period=1y` 선택 시 URL 반영, clearOnDefault(3y)는 URL에 생략, 새로고침 후 선택 유지

result: FIXED — nuqs에 `shallow: true, history: 'replace'` 추가. 이전에 `shallow` 없이 period 클릭 시 Next.js App Router full navigation(RSC 재요청)이 트리거되어 수초간 응답 없음처럼 보였음. 이제 클라이언트 슬라이스만 동작, 즉각 반응.

### 2. 평형 칩 URL 공유
expected: `?area=84` URL 공유 가능, 존재하지 않는 `?area=999` 입력 시 최다 거래 평형으로 fallback

result: FIXED — 동일 원인(shallow 없음). `shallow: true, history: 'replace'` 추가 후 즉각 반응.

### 3. IQR 이상치 투명 점
expected: 이상치 거래가 있는 단지에서 Recharts Scatter에 투명 회색 점(opacity 0.4) 시각적으로 표시

result: FIXED — Recharts `ComposedChart`에서 `Scatter`는 `dataKey` 없이는 y좌표를 찾지 못해 점이 렌더링 안됨. `<Scatter dataKey="price" />` 추가로 해결. 동시에 chart도 보임(issue 1-2와 동일한 shallow 이슈).

### 4. 시설 카드 세대당/동당
expected: DB에 데이터 있는 단지에서 "세대당 1.2대 (총 840면)" / "동당 2대 (총 12대, 6동)" 형식 표시

result: FIXED — K-apt BasicInfo API 호출로 `building_count` 669개 단지 전체 업데이트 완료 (2026-05-14). 엘리베이터 표시: "동당 N대 (총 N대, N동)" 형식 정상 동작.

### 5. 관리비 카드 3-column 세대당 표시
expected: 관리비 카드에 월평균(전체) / 하절기(6~9월) / 동절기(10~3월) 3-column 그리드 표시. 각 컬럼에 "약 N만원 / 세대" + "N개월 평균" 표시. 세대수 없으면 '—' + 안내문 표시.
NOTE: ManagementCostCard redesigned 2026-05-14 — SeasonalView 제거, 3-column per-household layout으로 교체.

result: PASS (데이터 의존) — 테스트 단지에 2026-01~03(동절기 데이터만) 존재. 따라서 월평균 = 동절기 평균(동일 값 정상), 하절기 = "—"(데이터 없음 정상). 여름 데이터가 있는 단지에서는 세 컬럼 모두 표시됨. 코드 로직 정상.

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
