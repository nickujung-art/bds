---
status: partial
phase: 09-complex-detail-ux
source: [09-VERIFICATION.md]
started: 2026-05-14T12:05:00Z
updated: 2026-05-14T12:05:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 기간 필터 URL 상태
expected: `?period=1y` 선택 시 URL 반영, clearOnDefault(3y)는 URL에 생략, 새로고침 후 선택 유지

result: [pending]

### 2. 평형 칩 URL 공유
expected: `?area=84` URL 공유 가능, 존재하지 않는 `?area=999` 입력 시 최다 거래 평형으로 fallback

result: [pending]

### 3. IQR 이상치 투명 점
expected: 이상치 거래가 있는 단지에서 Recharts Scatter에 투명 회색 점(opacity 0.4) 시각적으로 표시

result: [pending]

### 4. 시설 카드 세대당/동당
expected: DB에 데이터 있는 단지에서 "세대당 1.2대 (총 840면)" / "동당 2대 (총 12대, 6동)" 형식 표시

result: [pending]

### 5. 관리비 계절별 표시
expected: K-apt 4개월 이상 데이터 단지에서 SeasonalView(하절기/동절기 2-column) 표시; 4개월 미만이면 fallback

result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
