---
status: partial
phase: 02-ranking-landing-share
source: [02-VERIFICATION.md]
started: 2026-05-06T00:00:00Z
updated: 2026-05-06T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 랜딩 페이지 신고가 카드 ≥ 3개 표시
expected: DB에 최근 30일 매매 거래 데이터와 complex_rankings 데이터가 존재할 때, 랜딩 페이지(/)에 신고가 카드가 3개 이상 표시된다
result: [pending]

### 2. OG 이미지 한글 렌더링
expected: 단지 URL(/complexes/{id})을 카카오톡/SNS로 공유 시 단지명(한글)과 위치가 담긴 1200×630 OG 카드가 노출된다. Pretendard TTF 폰트로 한글이 깨지지 않는다.
result: [pending]

### 3. Rankings cron ingest_runs 기록
expected: /api/cron/rankings를 CRON_SECRET과 함께 호출하면 rankings 데이터가 갱신되고, ingest_runs 테이블에 기록이 남거나 graceful skip이 동작한다
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
