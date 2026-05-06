# 단지온도 (danjiondo)

## What This Is

창원·김해 실거래가 + 카페 커뮤니티 통합 부동산 사이트. 카페에서 "OO 단지 어떤가요?" 질문 후 답변을 며칠 기다리는 흐름을 없애고, 실거래가·학군·관리비·이웃 의견을 한 화면에서 30분 안에 확인하게 한다. V0.9 MVP(인증·지도·단지 상세·알림·광고·후기)는 로컬 완성 상태. Vercel 배포 + V1.0 완성이 다음 목표.

## Core Value

창원·김해 실수요자가 "이 단지 사도 되는지" 데이터와 이웃 의견으로 30분 안에 결정 짓게 한다.

## Requirements

### Validated

- ✓ Supabase Auth (Naver OAuth + 이메일 Magic Link OTP) — V0.9
- ✓ Serwist PWA + VAPID 웹 푸시 + push_subscriptions — V0.9
- ✓ 즐겨찾기 (favorites) + RLS + optimistic 업데이트 — V0.9
- ✓ 알림 큐 + Resend 이메일 + web-push 전달 — V0.9
- ✓ 카카오맵 + 평당가 핀 라벨 + supercluster 클러스터링 — V0.9
- ✓ 단지 상세 — 10년 그래프, 거래 내역, 시설 V1, 기준일 라벨 — V0.9
- ✓ 단지 검색 자동완성 + 필터 (SSR) — V0.9
- ✓ 익명 후기 작성·조회·신고·모더레이션 — V0.9
- ✓ 광고 기본 구조 (슬롯·admin·serving·이벤트 트래킹) — V0.9
- ✓ Admin core (/admin 진입 + 단지 관리 + 매칭 큐) — V0.9
- ✓ MOLIT 매매·전월세 10년 백필 + 일배치 cron — V0.9
- ✓ K-apt 관리비 + 학교알리미 학군 + 카카오 POI — V0.9
- ✓ sitemap + OpenGraph 메타 + schema.org — V0.9

### Active

**V1.0 — 정식 출시 (목표: ~1개월)**

- [ ] Vercel 프로덕션 배포 + 환경 변수 검증
- [ ] 보안 픽스 — 광고 이벤트 rate limiting + IP hash
- [ ] 보안 픽스 — inline createClient service-role → createSupabaseAdminClient() 교체
- [ ] 보안 픽스 — 맵 쿼리 status='active' 필터 추가
- [ ] 보안 픽스 — Sentry 초기화 or 플레이스홀더 제거
- [ ] CI 파이프라인 — GitHub Actions lint/build/test (PR 트리거)
- [ ] E2E 테스트 — 골든패스 5종 (Playwright)
- [ ] 랭킹 풀 SQL + 4종 랭킹 산식 (지역 인기·신고가·거래량·평당가) + 1h cron
- [ ] 랜딩 완성 — 오늘 신고가 카드 + 4종 랭킹 탭 (ISR 60s)
- [ ] OG 이미지 — 단지별 동적 OG + 카카오톡/네이버 공유
- [ ] 카드뉴스 파이프라인 — @vercel/og + Recharts SSR 자동 생성 + 어드민 1-click 발행
- [ ] 법적 페이지 — 이용약관·개인정보처리방침·광고 정책 + 동의 흐름
- [ ] 탈퇴 플로우 — 30일 grace period + hard delete cron
- [ ] 이메일 지원 채널 설정 (SUPPORT_EMAIL)
- [ ] Admin 확장 — 회원 관리(카페 닉네임 검증) + 광고 검수 + 신고 큐
- [ ] a11y 감사 — axe-core CI + 키보드 탐색 + 스크린리더 검증

**V1.5 — 커뮤니티 (V1.0 출시 후)**

- [ ] GPS L1 배지 활성화 (V0.9에 스키마 준비됨, 인증 연동 후 활성화)
- [ ] 후기 댓글 (텍스트, RLS)
- [ ] 단지 페이지 → 카페 검색 외부 링크
- [ ] K-apt 부대시설 데이터 추가
- [ ] 데이터 오류·후기·매칭 신고 통합 큐
- [ ] 신축 분양 정보 등록 + 분양권 거래 분리 UI
- [ ] 재건축 단계 운영자 수동 입력 + 진행 타임라인
- [ ] 가성비 분석 4분면 (평당가 × 학군 점수)
- [ ] 매물가 vs 실거래가 갭 라벨
- [ ] 주간 회전 카페 가입 코드 시스템
- [ ] 주간 다이제스트 이메일 + 알림 토픽 채널
- [ ] DB 백업 자동화 (pg_dump + GitHub private repo 주간)

**V2.0 — 차별화 자산 (V1.5 출시 후)**

- [ ] 게이미피케이션 마크 (👑🔥💬) + 회원 등급
- [ ] 카페 글 NLP 매칭 + 단지 페이지 연동
- [ ] SGIS 인구·세대 통계 분기 적재
- [ ] 재개발 행정 데이터 자동 적재 (출처 확보 시)
- [ ] 광고 통계 고도화 (전환 추적·ROI·이상 트래픽)
- [ ] GPS L2+L3 인증 (다회+시간패턴 / 우편·관리비)
- [ ] Claude API + RAG 단지 상담 봇
- [ ] 카카오톡 채널 알리미 (푸시 거부 대안)
- [ ] 광고주 카피 AI 어시스트 + 표시광고법 감지
- [ ] 회원 등급 시스템 + 우선 알림 혜택
- [ ] 카카오 카페 매니저 OAuth 카드뉴스 자동 발행
- [ ] 즐겨찾기 단지 2~4개 비교 표

### Out of Scope

- NextAuth.js 전환 — V0.9가 Supabase Auth로 완전히 구현됨. 교체 시 이득 없이 전체 인증 재작성 비용만 발생
- 모바일 네이티브 앱 — 웹 PWA로 충분히 커버 가능. 수요 검증 전 투자 불필요
- 매물 직접 등록 UI — 중개사 DB 없이 허위 매물 위험. 파트너십 확보 후 고려
- 카페 글 백포팅/NLP (V1.0) — 데이터 수집 없이 구현 불가. V2에서 카페 연동 후 추진

## Context

- **기술 스택**: Next.js 15 App Router (RSC 우선) + TypeScript strict + Tailwind CSS + Supabase Postgres/PostGIS/Auth + Vercel Hobby
- **인증**: Supabase Auth (`@supabase/ssr`) — Naver OAuth + 이메일 Magic Link (OTP). NextAuth 미설치
- **배포**: 현재 로컬 전용. Vercel 배포 미완 — V1.0 작업의 Day 1 항목
- **데이터**: MOLIT 일 10,000회 / 카카오 일 100,000회 / Resend 3,000건/월 / Supabase DB 500MB 무료 한도
- **알림 워커**: Vercel Hobby 1일 1cron 한도 → GitHub Actions `*/5 * * * *` 으로 우회
- **코드베이스**: CONCERNS.md에 Critical 3건·기술 부채 5건 문서화됨. 일부는 V1.0 출시 전 필수 수정
- **광고 타깃**: 창원·김해 지역 분양사·중개사. 수익화 모델의 핵심이므로 광고 시스템 안정성이 중요
- **사용자 획득 채널**: 카페 공지글 단일 채널 (비공개 베타). SEO 유입은 V1.0 이후

## Constraints

- **플랫폼**: Vercel Hobby — 1일 cron 1회 한도. 5분 알림 워커는 GitHub Actions 필수
- **예산**: 무료 티어 중심 — Supabase 500MB, Resend 3,000건/월, Vercel Hobby
- **법무**: 표시광고법 준수 (광고 명시 라벨). 개인정보보호법 (최소 수집·동의 철회 즉시 삭제)
- **데이터**: MOLIT API 일 10,000회 한도. 백필 스크립트와 일배치 동시 실행 시 초과 위험
- **보안**: RLS 전 사용자 테이블 적용. Admin 작업은 createSupabaseAdminClient() 단일 경유
- **타임라인**: V1.0 목표 ~1개월. 카드뉴스까지 포함 — 빡빡하나 가능

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase Auth 유지 (NextAuth 전환 안 함) | V0.9에서 완전히 구현됨. 교체 시 이득 없음 | — Pending |
| 카드뉴스 V1.0 포함 | 카페 채널 활용한 바이럴 핵심 도구 | — Pending |
| 비교 모드 V2.0으로 defer | 론칭 필수 아님. 사용자 수 확보 후 가치 검증 | — Pending |
| 주간 다이제스트·DB백업 V1.5로 defer | 1개월 범위 집중을 위한 범위 조정 | — Pending |
| `complexes` Golden Record (ADR-033) | 외부 출처 이름 단독 매칭 금지. 항상 좌표+이름 복합 | ✓ Good |
| GitHub Actions 5분 cron | Vercel Hobby 한도 우회. 월 ~1,440분 소비 (무료 한도 여유) | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-06 after initialization*
