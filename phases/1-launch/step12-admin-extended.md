# Step 12 (1-launch): admin-extended

## 목표
어드민 콘솔을 V1.0 수준으로 확장한다. 회원 관리(카페 닉네임 검증), 광고 검수, 신고 큐, 시스템·정책 메뉴.

## 전제 (Prerequisites)
- step8 (광고 어드민 기반), 0-mvp step16 (admin-core)

## 적용 범위 (Scope)
- `src/app/(admin)/admin/members/` — 회원 목록 + 카페 닉네임 검증
- `src/app/(admin)/admin/reports/` — 신고 큐 통합
- `src/app/(admin)/admin/system/` — 비용·SLO·audit_logs
- `src/app/(admin)/admin/policy/` — 약관 버전 관리

## 도메인 컨텍스트 / 가드레일
- ADR-044: 카페 닉네임 검증 = 운영자가 카페 회원 명단 대조 → `cafe_verified_at` 마킹
- 신고 큐: 데이터 오류·매칭 오류·후기 신고(V1.5 준비) 통합
- `audit_logs` 뷰어: actor별·action별 필터

## 작업 목록
1. 회원 목록: 검색 + cafe_nickname 미검증 필터 + 검증 버튼 (`cafe_verified_at` 업데이트 + audit_log)
2. 신고 큐: 데이터 오류 신고 목록 + 처리(확인/거부)
3. 시스템 페이지: cost-report 마지막 결과 표시 + SLO 상태
4. 정책 페이지: 약관 버전 업로드 + 시행일 관리

## 수용 기준 (Acceptance Criteria)
- [ ] 카페 닉네임 검증 → `cafe_verified_at` 기록 + audit_log
- [ ] 신고 큐 처리 → status 업데이트

## Definition of Done
어드민 콘솔 V1.0 완성. 운영자 1인 관리 체계 확립.
