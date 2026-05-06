# 프로젝트: 단지온도 (danjiondo)

창원·김해 실거래가 + 카페 커뮤니티 통합 부동산 사이트.

## 기술 스택
- Next.js 15 App Router (RSC 기본, `'use client'` 최소화)
- TypeScript strict mode + `noUncheckedIndexedAccess`
- Tailwind CSS 3.4+
- Supabase Postgres + PostGIS + RLS
- Supabase Auth (`@supabase/ssr`) — Naver OAuth + Email Magic Link (OTP)
- Serwist PWA + VAPID web push
- Recharts / react-hook-form + zod
- react-kakao-maps-sdk + supercluster
- Resend + React Email
- Vitest + Playwright
- Vercel Hobby + GitHub Actions CI

## 아키텍처 규칙
- CRITICAL: 모든 외부 API 호출 (국토부·카카오·학교알리미·K-apt)은 `src/services/` 어댑터에서만. 컴포넌트·라우트에서 직접 호출 금지
- CRITICAL: Supabase 쿼리는 서버 컴포넌트 또는 API Route에서만. 클라이언트 컴포넌트에서 직접 쿼리 금지 (`src/lib/supabase/client.ts`는 실시간 구독 전용)
- CRITICAL: 모든 사용자 데이터 테이블은 RLS 정책을 반드시 명시. `supabase/migrations/`에 정책 포함
- CRITICAL: `complexes` 테이블이 단일 진실 (Golden Record). 외부 출처 표기는 `complex_aliases`에 누적. 단지명 단독 매칭 절대 금지 — 항상 위치(좌표) + 이름 복합 매칭
- CRITICAL: 광고 게재 쿼리는 반드시 `now() BETWEEN starts_at AND ends_at AND status='approved'` 조건 포함. 기간 만료·미승인 광고 절대 노출 금지
- Server Action 우선. 폼 submit·mutation은 Server Action. REST API Route는 외부 노출이 필요한 경우만
- 컴포넌트는 `src/components/`, 도메인 함수는 `src/lib/`, 외부 어댑터는 `src/services/`, 타입은 `src/types/`
- 거래 데이터 조회는 `WHERE cancel_date IS NULL AND superseded_by IS NULL` 항상 포함 (취소·정정 제외)

## 개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성할 것 (TDD)
- 커밋 메시지는 conventional commits 형식: `feat(phase-step): 설명`, `fix:`, `docs:`, `refactor:`
- Phase 단위 브랜치: `feat-0-mvp`, `feat-1-launch`, `feat-2-community`, `feat-3-extras`
- 각 step 완료 후 `npm run lint && npm run build && npm run test` 통과 확인 후 commit

## 명령어
```
npm run dev      # 개발 서버 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint + TypeScript typecheck
npm run test     # Vitest (unit + integration)
npm run test:e2e # Playwright E2E
npm run db:start # Supabase 로컬 Docker
npm run db:push  # 마이그레이션 적용
```

## 데이터 파이프라인
- 일배치 cron: Vercel Cron (매일 04:00 KST) — 최근 거래 갱신 + 알림 생성
- 10년 백필: `scripts/backfill-realprice.ts` — GitHub Actions cron 또는 로컬 수동 실행
- 알림 워커: **GitHub Actions cron** `"*/5 * * * *"` — `notifications` 테이블 polled delivery (Vercel Hobby cron은 1일 1회 한도, 5분 워커 불가)
- cron endpoint는 `CRON_SECRET` 헤더 검증 필수

## 외부 API 한도 (무료 티어)
- 국토부 실거래: 일 10,000회
- 카카오 로컬/맵: 일 100,000회
- Resend: 3,000건/월
- Supabase DB: 500MB

## AI 슬롭 금지 (UI)
backdrop-blur, gradient-text, glow 애니메이션, "Powered by AI" 배지, 보라/인디고 브랜드색, 배경 gradient orb — 모두 금지.
