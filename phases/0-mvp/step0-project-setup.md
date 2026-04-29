# Step 0: project-setup

## 목표
Next.js 15 App Router 프로젝트를 생성하고, TypeScript strict, Tailwind, Serwist PWA, lint/test/build 스크립트를 설정한다. 이 step이 끝나면 `npm run dev/lint/build/test`가 모두 통과하는 상태가 된다.

## 전제 (Prerequisites)
- Node.js 20 LTS 설치됨
- 외부 서비스 없음 (환경변수 불필요)

## 적용 범위 (Scope)
생성 파일:
- `package.json` — next 15, tailwind, typescript, serwist, vitest, playwright
- `tsconfig.json` — strict + noUncheckedIndexedAccess
- `tailwind.config.ts` — Pretendard Variable, #ea580c 토큰
- `next.config.ts` — withSerwist 래핑
- `src/app/layout.tsx` — root layout (Pretendard 폰트)
- `src/app/page.tsx` — placeholder landing
- `public/manifest.webmanifest` — PWA manifest
- `vitest.config.ts`
- `playwright.config.ts`
- `.eslintrc.json` — strict
- `.env.local.example` — 모든 환경변수 키 목록 (값 없음)

## 도메인 컨텍스트 / 가드레일
- ADR-001: App Router, RSC 기본
- ADR-018: 액센트 `#ea580c` Tailwind 확장 토큰으로 등록 (`accent`)
- ADR-019: TS strict + noUncheckedIndexedAccess
- ADR-013: Serwist (next-pwa 대체)
- UI_GUIDE: Pretendard Variable 폰트 (`next/font/local`)
- AI 슬롭 안티패턴 목록을 tailwind safelist에 넣지 않는다

## 작업 목록
1. `create-next-app` 없이 수동 scaffold (App Router 구조 그대로)
2. `package.json` 의존성 명시:
   - `next@15`, `react@19`, `typescript@5`
   - `tailwindcss@3.4`, `@tailwindcss/typography`
   - `serwist`, `@serwist/next`
   - `vitest`, `@vitest/coverage-v8`, `happy-dom`
   - `@playwright/test`
   - `lucide-react`
3. `tsconfig.json`: strict, noUncheckedIndexedAccess, paths alias (`@/*` → `src/*`)
4. Tailwind 컬러 확장: `accent: #ea580c`, 기준 배경/텍스트/보더 토큰
5. Serwist: `next.config.ts`에 `withSerwist`, `src/app/sw.ts` 서비스 워커 기본
6. `manifest.webmanifest`: name "단지온도", theme_color "#ea580c", icons 192/512
7. `src/app/layout.tsx`: Pretendard Variable `next/font/local`, 기본 meta
8. Vitest 설정: `happy-dom` 환경, coverage threshold 80%
9. Playwright 설정: 3개 browser, base URL localhost:3000
10. `.env.local.example` 키 목록 작성 (NEXT_PUBLIC_SUPABASE_URL 등)
11. `npm run` 스크립트 연결: dev, build, lint, test, test:e2e, db:start, db:push

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run lint` 통과 (ESLint + TypeScript typecheck 에러 0)
- [ ] `npm run build` 통과 (빌드 산출물 `.next/` 생성)
- [ ] `npm run test` 통과 (placeholder 테스트 1건 이상)
- [ ] `http://localhost:3000` — 기본 placeholder 페이지 렌더
- [ ] `manifest.webmanifest` 응답 200 + name="단지온도"
- [ ] TypeScript strict + noUncheckedIndexedAccess 에러 없음

## Definition of Done
`phases/0-mvp/index.json`의 `step0-project-setup` 체크 가능. `.claude/settings.json` Stop hook (`npm run lint && npm run build && npm run test`) 정상 통과.
