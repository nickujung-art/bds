# Step 2 (2-community): comments

## 목표
후기에 대한 단순 텍스트 댓글을 구현한다. 1단계 depth, RLS로 본인 댓글만 수정·삭제.

## 전제 (Prerequisites)
- 2-community step0 완료 (reviews)

## 적용 범위 (Scope)
- `supabase/migrations/0013_review_comments.sql`
- `src/components/danji/ReviewComments.tsx`

## 데이터 모델

```sql
review_comments
  id              uuid PK
  review_id       uuid FK NOT NULL
  author_id       uuid FK NULL            -- NULL = 탈퇴 회원
  body            text NOT NULL CHECK(length(body) <= 500)
  is_hidden       boolean DEFAULT false
  created_at      timestamptz DEFAULT now()
  -- depth 1만 허용: parent_comment_id 컬럼 없음
```

## 도메인 컨텍스트 / 가드레일
- RLS: SELECT `is_hidden=false` 전체 공개. INSERT author_id=auth.uid(). UPDATE/DELETE author_id=auth.uid()만
- 댓글 최대 500자. 욕설 필터 동일 적용 (`profanity.ts` 재사용)
- 대댓글(depth 2+) 미지원 — V1.5는 flat 구조만. 필요 시 V2에서 설계 변경
- 신고: `review_reports` 테이블 재사용 (`target_type: 'comment'`, `target_id: comment_id`)
- 탈퇴 회원 댓글: `author_id=NULL` 갱신, 본문 "(삭제된 계정의 댓글)" 마스킹
- 댓글 수는 `reviews` 단지 상세 탭 카운트에 포함 안 함 (후기 수만 카운트)

## 작업 목록
1. `0013_review_comments.sql` + RLS
2. `ReviewComments.tsx`: 댓글 목록 + 작성 폼 (로그인 필요). 욕설 필터 서버 액션
3. 댓글 신고: `review_reports` INSERT (target_type='comment')
4. 어드민: 신고된 댓글 큐 (step0 모더레이션 큐 확장)
5. Vitest: 500자 초과 → 오류, 욕설 필터 재사용 확인
6. Playwright: 후기 댓글 작성 → 목록 표시 → 삭제

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 댓글 작성 → 즉시 표시
- [ ] 500자 초과 → 거부
- [ ] 본인 댓글 삭제 가능, 타인 댓글 삭제 불가 (RLS)

## Definition of Done
후기 댓글 완성. 커뮤니티 상호작용 최소 기반 구축.
