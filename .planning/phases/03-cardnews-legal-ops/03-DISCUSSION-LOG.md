---
phase: 03-cardnews-legal-ops
session_date: 2026-05-06
status: complete
---

# Phase 3 Discussion Log

## Gray Areas Discussed

### 1. 카드뉴스 배포 방식

**Question:** 카드뉴스 PNG를 어떻게 생성·배포할까요? Supabase Storage 저장 vs 온디맨드 생성?

**Decision:** 온디맨드 생성 + 브라우저 직접 다운로드
- `/api/cardnews/generate` → `ImageResponse` (next/og, runtime='nodejs')
- `<a download>` attribute로 브라우저 PNG 다운로드 (Supabase Storage 불필요)
- 어드민 `/admin/cardnews` 페이지에서 "생성 + 다운로드" 1-click
- Recharts는 Satori 미지원 → 순수 CSS/SVG flex bar chart로 대체
- 데이터 소스: `getRankingsByType(supabase, 'high_price', 5)` (지난 7일 TOP5)
- 이미지 크기: 1080×1080 정사각형 (카카오톡 최적화)

### 2. 탈퇴 플로우 설계

**Question:** 30일 grace 기간 동안 계정은 어떻게 처리하나요? 별도 cron이 필요한가요?

**Decision:** 기존 Vercel cron 재사용 + SET NULL 패턴
- 탈퇴 신청 시: `profiles.deleted_at = now()` 설정, 로그인 즉시 차단
- 로그인 시 `deleted_at IS NOT NULL` 체크 → 재활성화 안내 페이지 리다이렉트
- Hard delete: 기존 Vercel cron (04:00 KST)에 `deleted_at < now() - '30 days'` 조건 추가 (별도 cron 불필요)
- `complex_reviews.user_id`: `ON DELETE SET NULL` 마이그레이션 → "탈퇴한 사용자" 익명 유지
- `profiles` 테이블에 `deleted_at timestamptz` 컬럼 추가 마이그레이션 필요

### 3. 가입 동의 통합 방식

**Question:** 약관 동의를 어디서 받을까요? 기존 로그인 흐름에 삽입 vs 별도 페이지?

**Decision:** 별도 `/consent` 페이지 + auth 콜백 리다이렉트
- `profiles.terms_agreed_at timestamptz` 컬럼 추가 (NULL = 미동의)
- auth 콜백(`/auth/callback`)에서 `terms_agreed_at IS NULL`이면 `/consent`로 리다이렉트
- 기존 회원 소급: 배포 후 첫 로그인 시 자동으로 동의 요청 (별도 마이그레이션 불필요)
- 동의 항목: 이용약관(필수) + 개인정보처리방침(필수)
- Server Action으로 `terms_agreed_at` 업데이트

### 4. 어드민 시스템 모니터링

**Question:** 시스템 현황 대시보드에 무엇을 보여줄까요?

**Decision:** `/admin/status` 3-섹션 대시보드
- **DB 현황**: 회원 수, 단지 수, 거래 데이터 수, 발행 광고 수 (SQL COUNT)
- **Cron 실행 이력**: `ingest_runs` 테이블 최근 10건 (source, status, created_at)
- **대기 항목**: 신고 큐 미인 수 + 광고 검토 대기(pending) 수 + 약관 미동의 회원 수
- `revalidate = 0` (매 요청마다 갱신, 캐시 없음)

## Deferred Ideas

- 광고 수신 동의 (마케팅 이메일) → Phase 4 주간 다이제스트 시 추가
- 탈퇴 후 익명 후기 "탈퇴한 사용자" 표시 UI → V1.0 출시 후 실제 케이스 발생 시
- 카드뉴스 여러 템플릿 (거래량·평당가·관심도) → Phase 4 이후 확장
