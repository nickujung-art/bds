# Step 16: admin-core

## 목표
`/admin` 경로에 운영자 전용 콘솔을 구현한다. 단지 관리, 매칭 큐, 데이터 소스 모니터링, 2FA, audit_logs를 포함한다.

## 전제 (Prerequisites)
- Step 3b (매칭 큐), Step 10 (data_sources)
- V1.0 auth(step1-launch/step0) 완료 전이므로, 임시로 슈퍼어드민 이메일 환경변수 화이트리스트로 보호

## 적용 범위 (Scope)
- `src/app/(admin)/admin/` — 어드민 레이아웃 + 메뉴
- `src/middleware.ts` — `/admin` 경로 role 검증
- `src/app/(admin)/admin/complexes/` — 단지 관리 (Golden Record 편집, 신축 등록)
- `src/app/(admin)/admin/match-queue/` — 매칭 큐 UI (step3b에서 API 구현됨)
- `src/app/(admin)/admin/data-sources/` — 소스별 last_synced·SLA·실패 현황
- `src/lib/admin/audit.ts` — `logAudit(actor, action, target, payload)` 헬퍼

## 도메인 컨텍스트 / 가드레일
- ADR-043: `/admin` + 2FA + IP allowlist + audit_logs 필수
- 슈퍼어드민 = `SUPERADMIN_EMAIL` 환경변수. V1.0 auth 완료 후 Naver ID hash로 전환
- 모든 mutation → `audit_logs` INSERT (actor_id, action, target_type, target_id, payload)
- 광고주 role은 V1.0 ad-admin step에서 추가 (이 step에서는 superadmin만)
- RLS: admin 라우트는 미들웨어에서 role='admin' 또는 email 화이트리스트 검증

## 작업 목록
1. 어드민 레이아웃: 사이드바(단지·데이터소스·매칭큐) + 상단 "ADMIN" 배지
2. 미들웨어: `SUPERADMIN_EMAIL` 화이트리스트 검증. 미인증 시 /login 리다이렉트
3. `complexes` CRUD: 단지 검색·상세 편집·신축 수동 등록 폼 (status·predecessor·canonical_name)
4. 매칭 큐: step3b API 연결 → 좌(원본)/우(후보) UI + 승인/거부 버튼
5. 데이터 소스 페이지: 소스별 last_synced·SLA 대비 지연·consecutive_failures + "지금 새로고침" 버튼
6. `audit.ts`: 모든 admin mutation에 감사 로그 자동 삽입

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` + `npm run build` 통과
- [ ] 비어드민으로 `/admin` 접근 → 리다이렉트
- [ ] 단지 편집 → `audit_logs`에 레코드 생성
- [ ] 매칭 큐 승인 → `complex_aliases` 업데이트 + 큐 status='resolved'

## Definition of Done
운영자 콘솔 기본 완성. V0.9 베타 운영 중 데이터 이슈 직접 처리 가능.
