# Step 2 (1-launch): favorites

## 목표
단지 즐겨찾기 기능을 구현한다. RLS 적용, optimistic 업데이트, 즐겨찾기 페이지.

## 전제 (Prerequisites)
- 1-launch step0 완료 (인증)

## 적용 범위 (Scope)
- `src/components/danji/FavoriteButton.tsx` — 별 토글 (optimistic)
- `src/app/(auth)/favorites/page.tsx` — 즐겨찾기 목록
- `src/app/api/favorites/route.ts` — CRUD

## 도메인 컨텍스트 / 가드레일
- RLS: `favorites`는 `auth.uid() = user_id`만 접근
- optimistic: TanStack Query `useMutation` + rollback on error
- 비회원이 즐겨찾기 클릭 → 로그인 모달 유도 (ADR-007 유지)

## 작업 목록
1. `FavoriteButton.tsx`: TanStack Query + optimistic toggle. 별 아이콘(Lucide, strokeWidth 1.75)
2. `favorites/route.ts`: GET/POST/DELETE + RLS
3. `favorites/page.tsx`: 즐겨찾기 단지 카드 목록 + "알림 설정" 진입점

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (optimistic 테스트)
- [ ] 비회원 클릭 → 로그인 유도
- [ ] 회원 즐겨찾기 → DB 반영 확인 + 다른 회원에겐 노출 안 됨 (RLS)

## Definition of Done
즐겨찾기 완성. 알림 시스템(step3) 구독 기반 준비됨.
