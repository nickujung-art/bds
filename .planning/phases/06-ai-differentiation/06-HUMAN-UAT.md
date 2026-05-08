---
status: partial
phase: 06-ai-differentiation
source: [06-VERIFICATION.md]
started: 2026-05-08T00:00:00Z
updated: 2026-05-08T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 단지 상담 봇 환각률 평가
expected: 100건 sample 질문에서 환각 응답 ≤ 5% (ROADMAP Success Criteria 1번)
result: [pending]

### 2. SGIS adm_cd 코드 검증 + 실 적재
expected: `scripts/ingest-sgis.ts` 실행 전 stage.json API로 창원 5구+김해시 adm_cd 확인, district_stats 테이블에 6개 행 upsert 성공
result: [pending]

### 3. 광고 ROI 대시보드 가시성 확인
expected: 실제 캠페인 데이터 환경에서 `/admin/ads` AdRoiTable에 impressions/clicks/conversions/ctr 데이터 렌더링
result: [pending]

### 4. GPS L2 배지 자동 승급 테스트
expected: 30일 내 동일 단지 3회 GPS 방문 기록 시 `profiles.gps_badge_level`이 2로 자동 갱신
result: [pending]

### 5. Phase 6 E2E 로컬 실행
expected: `npm run test:e2e -- e2e/phase6.spec.ts e2e/gap-label.spec.ts` 로컬 Supabase 환경에서 전체 PASS
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
