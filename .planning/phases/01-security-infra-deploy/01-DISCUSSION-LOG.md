# Phase 1: 보안·인프라·배포 - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-06
**Phase:** 1-보안·인프라·배포
**Areas discussed:** Sentry 도입 여부, Rate limiting 인프라, E2E 인증 전략, CI 실패 차단 강도

---

## Sentry 도입 여부 (SEC-04)

| Option | Description | Selected |
|--------|-------------|----------|
| @sentry/nextjs 설치 | Sentry 무료 티어 (5K 에러/월). Server Component + API Route + 알림 워커 에러 노출. Sentry.io 계정 필요. | ✓ |
| 플레이스홀더 제거 | SENTRY_DSN env var + package.json에서 제거. Vercel 로그만 의존. | |
| 추후 결정 | placeholder만 정리하고 Sentry 도입은 Phase 2로 미룸. | |

**User's choice:** @sentry/nextjs 설치

| 설치 범위 질문 | Option | Selected |
|----------------|--------|----------|
| 설치 범위 | 에러 트래킹만 (tracesSampleRate=0) | ✓ |
| | 에러 + 성능 Trace 활성화 (tracesSampleRate=0.1) | |

| 활성화 환경 | Option | Selected |
|-------------|--------|----------|
| 활성화 환경 | 프로덕션만 (NODE_ENV=production) | ✓ |
| | 프로덕션 + Staging (Vercel preview 포함) | |

**Notes:** V1.0에서는 에러 감지가 핵심. 성능 트레이싱은 사용자 수 확보 후 고려.

---

## Rate limiting 인프라 (SEC-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Upstash Redis (@vercel/kv) | 무료 티어 충분. 정확한 분산 카운터. Vercel 마켓플레이스에서 연결. | ✓ |
| Supabase DB 저장 | ad_events 테이블에 ip_hash + timestamp 기록 후 카운트. 새 서비스 추가 없음. 다만 DB 쿼리 비용 증가. | |
| Edge middleware LRU | Next.js Edge runtime in-memory. 외부 의존성 없음. serverless 재시작 시 초기화. | |

**User's choice:** Upstash Redis (@vercel/kv)

| 한도 기준 | Option | Selected |
|-----------|--------|----------|
| 1분/100회 | ROADMAP Success Criteria 기준 준수 | ✓ |
| 1분/30회 | 더 엄격. 광고 트래킹 픽셀 오크 고려. | |

**Notes:** ROADMAP에 명시된 100회 기준 그대로 사용. Sliding window 알고리즘 사용 권장.

---

## E2E 인증 전략 (INFRA-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Supabase Admin API로 테스트 세션 생성 | global-setup.ts에서 admin.createUser() + admin.generateLink()로 세션 직접 생성 → storageState 저장. 이메일 플로우 우회. | ✓ |
| 공개 페이지 4종으로 대체 | 5번째 플로우를 후기 작성 대신 '로그인 프롬프트 노출 확인'으로 대체. | |
| 테스트용 이메일 계정 실제 사용 | 실제 Gmail에서 Magic Link를 받아 IMAP으로 파싱. 구성 복잡도가 높고 Gmail IMAP 의존. | |

**User's choice:** Supabase Admin API로 테스트 세션 생성

| E2E Supabase 환경 | Option | Selected |
|-------------------|--------|----------|
| 프로덕션 Supabase | CI에서 프로덕션 URL + service_role key 사용. SUPABASE_SERVICE_ROLE_KEY를 GitHub Secret으로 관리. | ✓ |
| Supabase 로컬 Docker | CI에서 npx supabase start. 프로덕션 격리. CI 실행 시간 ~2분 추가. | |

| E2E 실행 시점 | Option | Selected |
|---------------|--------|----------|
| main 푸시 시만 | PR CI는 lint/build/unit test만. E2E는 main merge 후. | |
| PR마다 | ROADMAP 명시 기준. 프로덕션 Supabase 사용 시 cleanup 전략 필요. | ✓ |

**Notes:** 테스트 완료 후 생성한 테스트 유저 데이터 cleanup 로직 필요. 프로덕션 DB 오염 방지.

---

## CI 실패 차단 강도 (INFRA-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Required status check로 merge 차단 | GitHub branch protection에서 CI 통과 전까지 Merge 버튼 비활성화. | ✓ |
| 알림만 (advisory) | CI 실패해도 merge 가능. 컨텐츠 진행 시 유연성 필요할 때만. | |

**User's choice:** Required status check로 merge 차단

| Required 체크 항목 | Option | Selected |
|--------------------|--------|----------|
| lint + typecheck | ESLint + TypeScript 타입 체크 | ✓ |
| build | npm run build — 프로덕션 빌드 성공 여부 | ✓ |
| unit tests | npm run test — Vitest unit/integration | ✓ |
| E2E tests | npm run test:e2e — Playwright (~3분 추가) | ✓ (추가 확인) |

**Notes:** E2E는 처음에 required 제외했으나 확인 후 추가. 4종 모두 required.

---

## Claude's Discretion

- `.env.local.example` 미사용 NextAuth 변수(`NEXTAUTH_SECRET`, `NEXTAUTH_URL`) 제거
- `ADMIN_IP_ALLOWLIST` env var 제거 (구현하지 않고 미사용 변수 정리)
- 누락 변수 추가(`RESEND_FROM_EMAIL`, `NEXT_PUBLIC_SITE_URL`, `RATE_LIMIT_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`)

## Deferred Ideas

- `ADMIN_IP_ALLOWLIST` 구현 — Phase 1 SEC 요구사항에 없음. 미사용 env var만 제거.
- 알림 워커 병렬화 (`Promise.allSettled`) — Phase 4~5 커뮤니티 기능 확장 시.
- `as any` 타입 패턴 정리 — 기술 부채이나 보안·배포 Phase와 무관. 별도 리팩토링 시.
