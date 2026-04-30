# Step 5 (2-community): report-flow

## 목표
데이터 오류·후기·댓글 신고를 통합 큐로 관리한다. 어드민 단일 UI에서 모든 신고 유형 처리.

## 전제 (Prerequisites)
- 2-community step0 (reviews + review_reports)
- 2-community step2 (comments)

## 적용 범위 (Scope)
- `supabase/migrations/0015_reports.sql` — `reports` 통합 테이블 (review_reports 대체 또는 병존)
- `src/app/(admin)/admin/reports/` — 통합 신고 큐 어드민 UI
- `src/app/api/reports/route.ts` — 신고 제출 API

## 데이터 모델

```sql
reports
  id              uuid PK
  target_type     enum(review, comment, data_error, match_error) NOT NULL
  target_id       text NOT NULL               -- review_id, comment_id, complex_id 등
  reporter_id     uuid FK NULL                -- NULL = 비회원 데이터 오류 신고
  reason          enum(spam, profanity, false_info, data_wrong, match_wrong, other)
  detail          text NULL (max 500자)
  status          enum(pending, resolved, dismissed) DEFAULT 'pending'
  resolved_by     uuid FK NULL
  resolution_note text NULL
  created_at      timestamptz DEFAULT now()
  resolved_at     timestamptz NULL
```

## 도메인 컨텍스트 / 가드레일
- `review_reports` (step0)는 이 테이블로 마이그레이션하거나 병존 (호환성 우선 판단)
- **데이터 오류 신고 (target_type='data_error')**: 비회원도 가능 (email optional). `target_id`는 `complex_id`
- **매칭 오류 신고 (target_type='match_error')**: 거래 데이터가 잘못된 단지에 연결됐을 때. `target_id`는 `transaction_id`
- SLA: pending → resolved 24h 이내 (V1.5 gate 조건)
- 운영자 알림: `pending` 건 24h 초과 → Resend 운영자 이메일
- **RLS**: reporter_id=auth.uid()만 INSERT. SELECT/UPDATE는 service_role 또는 admin role

### 자기 신고 방지 제약
- `review_reports` 테이블에 DB 레벨 제약 추가:
  ```sql
  -- step0의 review_reports 또는 이 통합 reports 테이블에 적용
  CONSTRAINT no_self_report CHECK (
    reporter_id IS NULL OR reporter_id != (
      SELECT author_id FROM reviews WHERE id = target_id::uuid
      -- target_type = 'review' 인 경우만. 다른 타입은 적용 안 함
    )
  )
  ```
- 단, 위 CHECK 제약은 cross-table이므로 Postgres에서 직접 지원 안 됨 → **Server Action 레벨에서 검증** + RLS 정책 보완:
  - 신고 제출 전: `reports.target_id`로 `reviews.author_id` 조회 → `reporter_id = author_id` 이면 400 "자신의 후기는 신고할 수 없습니다"
- `UNIQUE(reporter_id, target_id, target_type)` DB 제약 → 동일 대상 중복 신고 방지

## 작업 목록
1. `0015_reports.sql` 마이그레이션 + RLS
2. `/api/reports` POST: target_type 유효성 → INSERT → 자동 hide 임계 check (review/comment)
3. 어드민 통합 큐: type별 필터 + SLA 타이머 표시 + 해결/무시 액션
4. 24h SLA 초과 알림 cron (step10-ingest-scheduler 패턴 재사용)
5. Vitest: 신고 제출 + 자동 hide 임계 검증

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 비회원 데이터 오류 신고 가능
- [ ] 어드민에서 유형별 신고 목록 조회
- [ ] SLA 24h 초과 → 운영자 알림 (mock)

## Definition of Done
통합 신고 큐 완성. 데이터 품질·커뮤니티 품질 관리 기반 확보.
