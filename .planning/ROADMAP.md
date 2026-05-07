# Roadmap — 단지온도

**7 phases** | **37 requirements mapped** | All v1~v3 requirements covered ✓

## Overview

| # | Phase | Version | Goal | Requirements | Status |
|---|-------|---------|------|--------------|--------|
| 1 | 보안·인프라·배포 | V1.0 | 프로덕션 배포 가능 상태 + 보안 기반 확립 | INFRA-01~03, SEC-01~04 | ✅ Complete |
| 2 | 랭킹·랜딩·공유 | V1.0 | 핵심 UX 완성 — 사용자가 처음 봐야 할 화면 | RANK-01~03, SHARE-01~02 | ✅ Complete |
| 3 | 카드뉴스·법적·운영 | V1.0 | V1.0 정식 출시 가능 상태 | SHARE-03~04, LEGAL-01~05, ADMIN-01~04, A11Y-01~03 | ✅ Complete |
| 4 | 커뮤니티 기초 | V1.5 | 참여·소통 기능 + 데이터 확장 | COMM-01~05, DATA-01~02, NOTIF-01~02 | ✅ Complete |
| 5 | 데이터 확장·운영 | V1.5 | V1.5 완성 — 데이터 깊이 + 운영 안정성 | DATA-03~05, OPS-01 | ⬜ Not Started |
| 6 | AI·차별화 기술 | V2.0 | 기술 차별화 — AI 봇 + 고도화 분석 | DIFF-03, DATA-06~07, AD-01~02, AUTH-01 | ⬜ Not Started |
| 7 | 커뮤니티 심화 | V2.0 | V2.0 완성 — 게이미피케이션 + 자동화 | DIFF-01~02, DIFF-04~06, OPS-02 | ⬜ Not Started |

---

## Phase Details

### Phase 1: 보안·인프라·배포

**Goal:** V0.9 로컬 코드를 프로덕션에서 안전하게 운영 가능한 상태로 전환. 보안 취약점 제거, CI 자동화, E2E 골든패스 확보.

**Version:** V1.0 (1주차 목표)

**Requirements:**
- INFRA-01: Vercel 프로덕션 배포 + 환경 변수 검증 + `.env.local.example` 최신화
- INFRA-02: GitHub Actions CI — PR마다 lint/build/test 자동 실행
- INFRA-03: Playwright E2E — 골든패스 5종 자동화
- SEC-01: 광고 이벤트 rate limiting + IP hash
- SEC-02: createSupabaseAdminClient() 통합 (3곳 inline 교체)
- SEC-03: 지도 쿼리 status='active' 필터
- SEC-04: Sentry 초기화 또는 플레이스홀더 제거

**Plans:** 5 plans / 3 waves

**Wave 1** *(독립 실행 가능)*
- [x] 01-01-PLAN.md — 보안 패치 (SEC-01 rate limit + SEC-02 admin client + SEC-03 status filter)
- [x] 01-02-PLAN.md — Sentry 에러 트래킹 초기화 (SEC-04)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-03-PLAN.md — GitHub Actions CI 워크플로우 + .env.local.example 최신화 (INFRA-02, INFRA-01)
- [x] 01-04-PLAN.md — Playwright E2E 골든패스 5종 (INFRA-03)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-05-PLAN.md — Vercel 프로덕션 배포 + branch protection 활성화 (INFRA-01) `[CHECKPOINT]`

**Cross-cutting constraints:**
- 모든 Wave의 서버 코드: `createSupabaseAdminClient()` 경유 필수
- 커밋 전 `npm run lint && npm run build && npm run test` 통과 필수

**Success Criteria:**
1. `main` 브랜치 PR에서 lint/build/test가 자동 실행되고 통과한다
2. Vercel 프로덕션 URL이 존재하고 단지 상세 페이지가 정상 렌더된다
3. `/api/ads/events`에 1분 내 100회 이상 POST 시 rate limit 429가 반환된다
4. E2E 5종 테스트가 CI에서 자동 실행되고 통과한다
5. 서비스 역할 클라이언트 생성이 `createSupabaseAdminClient()` 단일 경로로만 이뤄진다

**UI hint**: no

---

### Phase 2: 랭킹·랜딩·공유

**Goal:** 사용자가 처음 방문했을 때 보는 화면(랜딩)과 카카오톡 공유 링크를 완성. 신규 유입의 첫 인상 결정.

**Version:** V1.0 (2주차 목표)

**Requirements:**
- RANK-01: 지역 인기 단지 풀 정의 SQL + 일배치
- RANK-02: 랭킹 4종 산식 (신고가·거래량·평당가·관심도) + 1h cron
- RANK-03: 랜딩 완성 — 오늘 신고가 카드 + 4종 랭킹 탭 (ISR 60s)
- SHARE-01: 단지별 동적 OG 이미지 (`next/og` 내장)
- SHARE-02: 카카오톡·네이버 공유 버튼 + 단지 상세 공유 UX

**Plans:** 5 plans / 3 waves

**Wave 1** *(독립 실행 가능)*
- [x] 02-01-PLAN.md — DB 마이그레이션 + TTF 폰트 + 테스트 스캐폴드 (RANK-01 전제조건)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 02-02-PLAN.md — 랭킹 데이터 레이어 + cron endpoint + GitHub Actions (RANK-01, RANK-02)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 02-03-PLAN.md — 랜딩 페이지 ISR 완성 — 신고가 카드 + 4종 랭킹 탭 (RANK-03)
- [x] 02-04-PLAN.md — 단지별 동적 OG 이미지 opengraph-image.tsx (SHARE-01)
- [x] 02-05-PLAN.md — 카카오톡·네이버·링크복사 공유 버튼 ShareButton (SHARE-02)

**Cross-cutting constraints:**
- `createSupabaseAdminClient()` — cron route에서만 사용
- `createReadonlyClient()` — page.tsx, opengraph-image.tsx에서 유지 (ISR 조건)
- 모든 transactions 쿼리: `cancel_date IS NULL AND superseded_by IS NULL` 필수
- AI 슬롭 금지: backdrop-blur, gradient-text, glow, 보라/인디고, gradient orb

**Success Criteria:**
1. 랜딩 페이지에 오늘 신고가 카드 ≥ 3개가 표시된다
2. 랭킹 탭 4종이 데이터와 함께 정상 렌더된다 (ISR 60s 확인)
3. 단지 URL을 카카오톡으로 공유 시 단지명·가격이 담긴 OG 카드가 노출된다
4. 랭킹 cron이 1시간마다 데이터를 갱신한다 (ingest_runs 기록 확인)

**UI hint**: yes

---

### Phase 3: 카드뉴스·법적·운영

**Goal:** V1.0 정식 출시에 필요한 법적 요건 충족, 운영 어드민 완성, a11y 기준 통과, 카드뉴스 파이프라인 완성.

**Version:** V1.0 (3~4주차 목표)

**Requirements:**
- SHARE-03: 카드뉴스 자동 생성 (Recharts SSR + @vercel/og)
- SHARE-04: 어드민 카드뉴스 1-click 발행 UI
- LEGAL-01: 이용약관 + 가입 동의 흐름
- LEGAL-02: 개인정보처리방침
- LEGAL-03: 광고 정책 + 표시광고법 고지
- LEGAL-04: 탈퇴 플로우 (30일 grace + hard delete cron)
- LEGAL-05: 이메일 지원 채널 설정
- ADMIN-01: 회원 관리 (카페 닉네임·계정 정지)
- ADMIN-02: 광고 검수 상태 머신
- ADMIN-03: 신고 큐 운영자 처리 UI
- ADMIN-04: 시스템 상태 모니터링 메뉴
- A11Y-01: axe-core CI (critical 0건)
- A11Y-02: 키보드 탐색 검증
- A11Y-03: 스크린리더 라벨 검증

**Plans:** 3/5 plans executed

**Wave 0** *(독립 실행)*
- [x] 03-01-PLAN.md — 마이그레이션 + RED 테스트 + @axe-core/playwright 설치 + [BLOCKING] supabase db push (SHARE-03/04, LEGAL-01/04/05, ADMIN-01/03/04, A11Y-01/02/03 기반)

**Wave 1** *(blocked on Wave 0)*
- [x] 03-02-PLAN.md — 동의·탈퇴·재활성화 + auth/callback + 법적 페이지 + Footer + hard delete cron (LEGAL-01/02/03/04/05)

**Wave 2** *(blocked on Wave 0; 03-03/04 병렬 실행 가능 — files_modified 무중복)*
- [x] 03-03-PLAN.md — 카드뉴스 Route Handler + /admin/cardnews UI (SHARE-03, SHARE-04)
- [ ] 03-04-PLAN.md — admin-actions.ts + 회원/신고/시스템 상태 페이지 (ADMIN-01, ADMIN-02 회귀, ADMIN-03, ADMIN-04)

**Wave 3** *(blocked on Wave 1·2)*
- [ ] 03-05-PLAN.md — accessibility E2E GREEN + CI 게이트 (A11Y-01/02/03)

**Success Criteria:**
1. 이용약관·개인정보·광고 정책 페이지가 존재하고 가입 흐름에 동의 체크가 포함된다
2. 탈퇴 요청 후 30일 이내 계정이 소프트 삭제되고 30일 후 hard delete cron이 실행된다
3. axe-core CI에서 critical 접근성 이슈 0건으로 통과한다
4. 어드민에서 광고를 등록→검수→승인까지 상태 전환할 수 있다
5. 카드뉴스를 어드민에서 1-click으로 생성·발행할 수 있다
6. `npm run lint && npm run build && npm run test` + E2E 전부 통과한다

**UI hint**: yes

---

### Phase 4: 커뮤니티 기초

**Goal:** 후기·댓글·외부 연결 등 커뮤니티 참여 기능 + 데이터 깊이 확장. Persona A(실수요자)의 "이웃 의견" 수요 충족.

**Version:** V1.5

**Requirements:**
- COMM-01: 후기 댓글 (텍스트, RLS, 신고)
- COMM-02: GPS L1 인증 배지 활성화
- COMM-03: 단지 페이지 → 카페 검색 외부 링크
- COMM-04: 신고 통합 큐 + SLA ≤ 24h 운영
- COMM-05: 주간 회전 카페 가입 코드
- DATA-01: K-apt 부대시설 데이터 (단지 상세 시설 탭)
- DATA-02: 신축 분양 정보 + 분양권 거래 분리 UI
- NOTIF-01: 주간 다이제스트 이메일
- NOTIF-02: 알림 토픽 채널 구독

**Plans:** 9 plans / 4 waves

**Wave 0** *(독립 실행 — BLOCKING)*
- [ ] 04-00-PLAN.md — DB 마이그레이션 (enum + 5 테이블 + RLS + PostGIS RPC) + supabase db push + RED 테스트 스캐폴드

**Wave 1** *(blocked on Wave 0; 04-01/02/03 병렬 실행 가능)*
- [ ] 04-01-PLAN.md — 후기 댓글 시스템 (COMM-01)
- [ ] 04-02-PLAN.md — GPS L1 인증 배지 활성화 (COMM-02)
- [ ] 04-03-PLAN.md — 카페 외부 링크 + 신고 SLA 배지 (COMM-03, COMM-04)

**Wave 2** *(blocked on Wave 0; Wave 1과 병렬 실행 가능)*
- [ ] 04-04-PLAN.md — K-apt 부대시설 + 단지 상세 시설 탭 (DATA-01)
- [ ] 04-05-PLAN.md — MOLIT 신축 분양 정보 + presale UI (DATA-02)

**Wave 3** *(blocked on Wave 1·2)*
- [ ] 04-06-PLAN.md — 주간 카페 가입 코드 + admin/status 표시 (COMM-05)
- [ ] 04-07-PLAN.md — 주간 다이제스트 이메일 + GitHub Actions cron (NOTIF-01)
- [ ] 04-08-PLAN.md — 알림 토픽 구독 + 프로필 UI (NOTIF-02)

**Cross-cutting constraints:**
- 모든 transactions 쿼리: `cancel_date IS NULL AND superseded_by IS NULL` (presale_transactions 포함)
- cron/worker endpoint: `x-cron-secret` 헤더 검증 필수
- ISR 페이지: `createReadonlyClient()` + `export const revalidate = N` (cookies() 금지)
- AI 슬롭 금지: backdrop-blur, gradient-text, glow, 보라/인디고, gradient orb

**Success Criteria:**
1. 후기에 댓글을 달 수 있고, 댓글 신고 시 신고 큐에 쌓인다
2. GPS L1 인증(단지 ±100m)을 통과한 후기에 배지가 표시된다
3. 단지 상세에 카페 검색 외부 링크가 표시된다
4. 구독 회원에게 매주 관심 단지 다이제스트 이메일이 발송된다
5. 카페 가입 코드가 매주 갱신되고 어드민에서 확인 가능하다

**UI hint**: yes

---

### Phase 5: 데이터 확장·운영 안정성

**Goal:** 단지 데이터 깊이 확장 (재건축·가성비·갭) + 운영 백업 자동화로 V1.5 완성.

**Version:** V1.5

**Requirements:**
- DATA-03: 재건축 단계 운영자 수동 입력 + 타임라인
- DATA-04: 가성비 분석 4분면 (평당가 × 학군 점수)
- DATA-05: 매물가 vs 실거래가 갭 라벨
- OPS-01: DB 백업 자동화 (pg_dump + GitHub private repo 주간)

**Plans:** 5 plans / 3 waves

**Wave 0** *(BLOCKING — autonomous: false, 운영자 직접 실행)*
- [ ] 05-00-PLAN.md — supabase link + db push (22개 마이그레이션 적용) + molit-backfill-once.yml 생성

**Wave 1** *(blocked on Wave 0; 05-01/02/03 병렬 실행 가능 — files_modified 무중복)*
- [ ] 05-01-PLAN.md — 재건축 타임라인 (RLS + 데이터 레이어 + RedevelopmentTimeline + 어드민) (DATA-03)
- [ ] 05-02-PLAN.md — 가성비 4분면 차트 (getQuadrantData + ValueQuadrantChart + 단지 상세 연결) (DATA-04)
- [ ] 05-03-PLAN.md — listing_prices 마이그레이션 + Server Action + 어드민 입력 UI (DATA-05)

**Wave 2** *(blocked on Wave 1)*
- [ ] 05-04-PLAN.md — pg_dump 주간 백업 GitHub Actions + danjiondo-backup repo (OPS-01)

**Cross-cutting constraints:**
- 모든 transactions 쿼리: `cancel_date IS NULL AND superseded_by IS NULL` 필수
- admin write: `createSupabaseAdminClient()` + requireAdmin() guard 필수
- ISR 페이지: `export const revalidate = 86400` 유지 (page.tsx)
- 'use client' 차트 컴포넌트: data는 RSC에서만 fetch, 컴포넌트에 props로 전달
- AI 슬롭 금지: backdrop-blur, gradient-text, glow, 보라/인디고
- D-08 준수: 갭 라벨 UI 표시 Phase 6으로 defer (listing_prices 테이블만 생성)
- SUPABASE_DB_URL GitHub Secrets에만 저장 — log 출력 절대 금지

**Success Criteria:**
1. 재건축 단계가 있는 단지 상세에 진행 타임라인이 표시된다
2. 가성비 4분면 차트에서 단지 위치를 확인할 수 있다
3. 단지 상세에 매물가 대비 실거래가 갭 라벨이 표시된다 (Phase 5: 인프라만, Phase 6: UI)
4. 매주 pg_dump가 실행되고 GitHub private repo에 백업이 저장된다

**UI hint**: yes

---

### Phase 6: AI·차별화 기술

**Goal:** Claude API RAG 봇 + SGIS 통계 + 광고 고도화 + GPS L2/L3 인증. 기술 차별화 자산 구축.

**Version:** V2.0

**Requirements:**
- DIFF-03: Claude API + RAG 단지 상담 봇 (환각률 ≤ 5%)
- DATA-06: SGIS 인구·세대 통계 분기 적재
- DATA-07: 재개발 행정 데이터 자동 적재 (출처 확보 시)
- AD-01: 광고 통계 고도화 (전환·ROI·이상 트래픽)
- AD-02: 광고주 카피 AI 어시스트 + 표시광고법 감지
- AUTH-01: GPS L2+L3 인증 (다회+시간패턴 / 우편·관리비)

**Success Criteria:**
1. 단지 상담 봇이 단지 데이터 기반으로 답변하고, human eval 100건 기준 환각률 ≤ 5%
2. SGIS 통계가 분기마다 자동 적재되고 단지 상세에 표시된다
3. 광고주 대시보드에서 전환율·ROI를 확인할 수 있다
4. GPS L2 인증(다회 방문 패턴)을 통과한 후기에 상위 배지가 표시된다

**UI hint**: yes

---

### Phase 7: 커뮤니티 심화·자동화

**Goal:** 게이미피케이션 + 카페 NLP 연동 + 카카오톡 채널 + 비교 모드 + 카페 자동 발행. V2.0 완성.

**Version:** V2.0

**Requirements:**
- DIFF-01: 게이미피케이션 마크 (👑🔥💬) + 회원 등급 UI
- DIFF-02: 카페 글 NLP 단지 매칭 (정확도 ≥ 85%)
- DIFF-04: 카카오톡 채널 알리미 (푸시 거부 대안)
- DIFF-05: 회원 등급 시스템 + 우선 알림 혜택
- DIFF-06: 즐겨찾기 단지 2~4개 비교 표
- OPS-02: 카카오 카페 매니저 OAuth 카드뉴스 자동 발행 (법무 승인 후)

**Success Criteria:**
1. 활동 기반으로 회원 등급이 부여되고 마크가 후기에 표시된다
2. 카페 글이 NLP로 단지에 매칭되어 단지 페이지에 연동 표시된다 (정확도 ≥ 85%)
3. 카카오톡 채널을 통해 알림이 발송된다
4. 즐겨찾기 단지 2~4개를 선택해 비교 표를 볼 수 있다
5. 카드뉴스가 카페에 자동 발행된다 (법무 승인 조건부)

**UI hint**: yes

---

## Milestone Summary

| Milestone | Phases | Gate |
|-----------|--------|------|
| **V1.0 정식 출시** | Phase 1~3 | lint + build + test + E2E 5종 + axe-core 0 critical + 법적 페이지 존재 + Vercel 배포 |
| **V1.5 커뮤니티** | Phase 4~5 | Phase 1~3 gate + 후기 댓글 + 신고 SLA ≤ 24h + DB 백업 |
| **V2.0 차별화** | Phase 6~7 | Phase 4~5 gate + AI 봇 환각률 ≤ 5% + NLP 정확도 ≥ 85% + 광고 AI 법무 승인 |
