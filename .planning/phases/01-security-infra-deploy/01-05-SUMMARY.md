---
phase: 01-security-infra-deploy
plan: 05
type: summary
wave: 3
status: complete
completed_at: 2026-05-06
---

# Plan 01-05 Summary — Vercel 프로덕션 배포 + Branch Protection

## What Was Done

### Task 1: Vercel 환경변수 + Upstash Redis 연결
- Vercel Framework Preset을 "Other" → "Next.js"로 수정 (root cause of initial 404)
- 전체 환경변수 설정 완료 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, KAKAO 키, SENTRY DSN, RATE_LIMIT_SECRET 등)
- Upstash Redis → Vercel Storage KV 연결 완료 (KV_REST_API_URL/TOKEN 자동 주입)
- VAPID 키 신규 생성 및 Vercel에 추가 (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
- NEXT_PUBLIC_SITE_URL = https://danjiondo.vercel.app 설정

### Task 2: GitHub Secrets 추가 (CI용)
- 7개 GitHub Secrets 추가 완료: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_KAKAO_JS_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_SITE_URL

### Task 3: GitHub Branch Protection 활성화
- main 브랜치 classic branch protection rule 생성
- Require status checks to pass before merging 활성화
- Require pull request before merging 활성화

### Task 4: 프로덕션 배포
- danjiondo.vercel.app 정상 배포 및 접속 확인
- commit: 8872804 (fix: sitemap.ts force-dynamic)

## Issues Encountered & Resolved

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| 최초 배포 404 | Vercel Framework Preset이 "Other"로 설정됨 | Next.js로 변경 후 redeploy |
| MIDDLEWARE_INVOCATION_FAILED | NEXT_PUBLIC_SUPABASE_URL 값 오류 | 올바른 Supabase URL로 수정 |
| 초기 빌드 sitemap 에러 | sitemap.ts가 빌드 타임에 Supabase 연결 시도 | force-dynamic 추가 (커밋 8872804) |
| KV 환경변수 이름 불일치 | Vercel Storage는 KV_REST_API_URL/TOKEN으로 주입 | ratelimit.ts에서 두 이름 모두 지원 |

## Production URL

https://danjiondo.vercel.app
