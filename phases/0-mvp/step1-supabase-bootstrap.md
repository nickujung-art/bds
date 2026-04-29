# Step 1: supabase-bootstrap

## 목표
Supabase 클라이언트를 server/client/admin 세 가지로 분리하고, 로컬 Docker 인스턴스와 연결한다. 이 step이 끝나면 Supabase 쿼리가 서버 컴포넌트와 API Route에서 동작하는 최소 구조가 갖춰진다.

## 전제 (Prerequisites)
- Step 0 완료
- 사용자가 로컬 Docker + Supabase CLI 설치 완료
- Supabase 프로젝트 생성 (또는 로컬 `supabase start`)
- `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 설정

## 적용 범위 (Scope)
- `src/lib/supabase/server.ts` — RSC/API Route용 (쿠키 기반)
- `src/lib/supabase/client.ts` — 클라이언트 컴포넌트용 (실시간 구독 전용)
- `src/lib/supabase/admin.ts` — `service_role` (서버 전용, ingest/cron)
- `supabase/config.toml` — 로컬 설정
- `package.json` — `db:start`, `db:push` 스크립트

## 도메인 컨텍스트 / 가드레일
- CRITICAL (CLAUDE.md): Supabase 쿼리는 서버 컴포넌트 또는 API Route에서만
- `client.ts`는 실시간 구독 전용. 일반 쿼리에 사용 금지
- `admin.ts` (`service_role`)는 `src/app/api/ingest/`와 `scripts/`에서만
- ADR-002: Supabase Free Tier 500MB 한도

## 작업 목록
1. `npm install @supabase/supabase-js @supabase/ssr`
2. `src/lib/supabase/server.ts`: `createServerClient` with cookie store (Next.js cookies())
3. `src/lib/supabase/client.ts`: `createBrowserClient` — JSDoc에 "실시간 구독 전용" 명시
4. `src/lib/supabase/admin.ts`: `createClient(url, SERVICE_ROLE_KEY)` — JSDoc에 "서버/ingest 전용" 명시
5. `supabase/config.toml` 기본값 설정
6. `package.json` 스크립트: `"db:start": "supabase start"`, `"db:push": "supabase db push"`
7. 연결 확인용 health-check: `src/app/api/health/route.ts` — `supabase.from('_dummy').select()` 시도 후 OK/FAIL 반환 (개발 전용)

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run lint` + `npm run build` 통과
- [ ] `npm run test` 통과
- [ ] `GET /api/health` → 200 `{ status: "ok" }` (로컬 Supabase 연결 시)
- [ ] `admin.ts`를 클라이언트 컴포넌트에서 import 시 TypeScript 오류 (server-only 태그)

## Definition of Done
Supabase 3분리 패턴 확립. 이후 모든 step은 이 파일들을 재사용.
