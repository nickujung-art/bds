# Step 5 (3-extras): review-l2-l3

## 목표
GPS 위치 인증 L2(다회 방문 + 시간 패턴)와 L3(우편물 또는 관리비 영수증 인증)를 구현한다. ADR-046.

## 전제 (Prerequisites)
- 2-community step1 완료 (review-gps-l1)

## L2 — 다회 방문 + 시간 패턴

**조건**: 동일 단지 ±100m 내 GPS 인증 ≥ 3회 AND 방문 간격 ≥ 7일 (총 기간 ≥ 14일)

**근거**: 단순 일회성 방문자보다 실거주자·반복 임장러에 가까움

```sql
-- review_verifications 테이블 재사용 (2-community step1)
-- gps_level = 'L2' 조건: 동일 (user_id, complex_id)의 L1 기록 ≥ 3건 AND 기간 ≥ 14일
```

**서버 로직**: `checkL2Eligibility(userId, complexId)` — `review_verifications`에서 집계. 조건 충족 시 가장 최근 verification의 `gps_level = 'L2'`로 업그레이드

## L3 — 우편물 또는 관리비 영수증 인증

**조건**: 관리비 영수증 또는 우편물 사진 업로드 → 운영자 수동 검증

**ADR-046**: L3 원 데이터(이미지) 저장 후 검증 완료 시 즉시 삭제. 검증 결과만 보존

```sql
-- supabase/migrations/0024_review_l3.sql
review_l3_requests
  id              uuid PK
  user_id         uuid FK
  complex_id      uuid FK
  document_type   enum(utility_bill, postal_mail, other)
  storage_path    text NOT NULL           -- Supabase Storage 임시 경로
  status          enum(pending, approved, rejected) DEFAULT 'pending'
  submitted_at    timestamptz DEFAULT now()
  reviewed_at     timestamptz NULL
  reviewer_id     uuid FK NULL
  -- 승인 후 storage_path 즉시 삭제 (개인정보 최소화)
```

## 도메인 컨텍스트 / 가드레일
- ADR-046: 원좌표·원본 문서 저장 금지. 검증 결과만 보존. 1년 만료
- L3 이미지: Supabase Storage private bucket. 검증 완료(승인/거부) 즉시 파일 삭제
- L3 신청 SLA: 운영자 48h 이내 검토
- RLS: `review_l3_requests` — user_id=auth.uid()만 INSERT·SELECT. UPDATE는 service_role
- L2/L3 배지는 L0/L1 배지보다 눈에 띄게 (색상·아이콘 차별)

## 작업 목록
1. `0024_review_l3.sql` + Storage policy (private, user 격리)
2. `checkL2Eligibility` 서버 함수 + 자동 업그레이드 로직
3. L3 업로드 폼: 파일 선택(JPG/PNG ≤ 5MB) → Supabase Storage → DB 신청
4. 어드민 L3 검토 큐: 이미지 미리보기 + 승인/거부 + 파일 즉시 삭제
5. `ReviewCard.tsx` L2/L3 배지 추가
6. Vitest: L2 기간 계산 경계값 + L3 파일 삭제 검증

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] L1 3회(14일 이상 간격) → L2 자동 업그레이드
- [ ] L3 파일 업로드 → 어드민 승인 후 Storage 파일 삭제 확인
- [ ] L3 승인 → `review_verifications.gps_level='L3'` 갱신

## Definition of Done
GPS 다단계 인증 완성. 실거주자 후기 신뢰도 차등화.
