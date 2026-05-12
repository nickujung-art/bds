---
phase: 8
slug: community-deepening
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-12
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npm run test` |
| **Full suite command** | `npm run test && npm run test:e2e` |
| **Estimated runtime** | ~30 seconds (unit) / ~120 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npm run test`
- **After every plan wave:** Run `npm run test && npm run test:e2e`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds (unit), 120 seconds (full)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 08-00-01 | 00 | 0 | DIFF-01/05 | T-8-01 | activity_points UPDATE는 트리거만 가능, 클라이언트 직접 UPDATE 차단 | unit | `npm run test -- --grep "member.tier"` | ❌ W0 | ⬜ pending |
| 08-00-02 | 00 | 0 | DIFF-02 | — | N/A | unit | `npm run test -- --grep "daum-cafe"` | ❌ W0 | ⬜ pending |
| 08-00-03 | 00 | 0 | DIFF-04 | T-8-02 | SOLAPI API key는 서버 전용, 클라이언트 노출 차단 | unit | `npm run test -- --grep "kakao-channel"` | ❌ W0 | ⬜ pending |
| 08-00-04 | 00 | 0 | DIFF-06 | — | N/A | unit | `npm run test -- --grep "compare"` | ❌ W0 | ⬜ pending |
| 08-01-01 | 01 | 1 | DIFF-01 | T-8-01 | 후기 INSERT → activity_points 원자적 갱신 | unit | `npm run test -- --grep "member.tier"` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 1 | DIFF-01 | — | TierBadge silver/gold/bronze 렌더 | unit | `npm run test -- --grep "TierBadge"` | ❌ W0 | ⬜ pending |
| 08-02-01 | 02 | 1 | DIFF-05 | — | gold 등급 즉시 알림, silver/bronze 30분 딜레이 | unit | `npm run test -- --grep "member.tier.*priority"` | ❌ W0 | ⬜ pending |
| 08-03-01 | 03 | 1 | DIFF-06 | — | /compare?ids= 4개 초과 시 slice(0,4) 적용 | unit | `npm run test -- --grep "compare.*limit"` | ❌ W0 | ⬜ pending |
| 08-03-02 | 03 | 1 | DIFF-06 | — | CompareTable 2개 단지 렌더 | unit | `npm run test -- --grep "CompareTable"` | ❌ W0 | ⬜ pending |
| 08-04-01 | 04 | 2 | DIFF-02 | T-8-03 | Gemini 프롬프트 인젝션 방지 (구분자 사용) | unit | `npm run test -- --grep "extractComplexNames"` | ❌ W0 | ⬜ pending |
| 08-04-02 | 04 | 2 | DIFF-02 | — | 단지명 단독 매칭 금지 — matchComplex() 파이프라인 경유 | unit | `npm run test -- --grep "daum-cafe.*match"` | ❌ W0 | ⬜ pending |
| 08-05-01 | 05 | 2 | DIFF-04 | T-8-02 | 알림톡 발송은 src/services/kakao-channel.ts 어댑터만 경유 | unit | `npm run test -- --grep "deliver.*kakao"` | ❌ W0 | ⬜ pending |
| 08-06-01 | 06 | 3 | OPS-02 | — | 어드민 카드뉴스 복사 버튼 동작 | E2E | `npm run test:e2e -- --grep "cardnews.*copy"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/member-tier.test.ts` — DIFF-01, DIFF-05 커버
- [ ] `src/__tests__/daum-cafe.test.ts` — DIFF-02 커버
- [ ] `src/__tests__/kakao-channel.test.ts` — DIFF-04 커버
- [ ] `src/__tests__/compare.test.ts` — DIFF-06 커버
- [ ] `src/__tests__/tierbadge.test.ts` — DIFF-01 💬 cafeVerified 마크 커버
- [ ] `npm install solapi nuqs` — 신규 패키지 설치

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| 카페 글 NLP 매칭 정확도 ≥ 85% | DIFF-02 | Ground truth 레이블링 필요 (100건 샘플) | 카페 글 100건 수동 수집 → Gemini NER 실행 → 매칭 결과 수동 검증 → 정확도 계산 |
| 알림톡 실제 발송 | DIFF-04 | SOLAPI 계정 + 카카오 비즈니스 채널 심사 필요 | 개발 환경에서 SOLAPI 테스트 모드로 발송 확인 (실제 SMS/알림톡 수신) |
| 카카오톡 채널 구독 UX | DIFF-04 | 전화번호 입력 + 실제 알림 수신 필요 | 테스트 전화번호로 구독 → 알림 트리거 → 카카오톡 수신 확인 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s (unit), < 120s (full)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved
