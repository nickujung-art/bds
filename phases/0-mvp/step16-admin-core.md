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

### 어드민 세션 만료 중 폼 제출 UX
- 어드민 세션(30분 TTL) 만료 시 진행 중인 폼 제출 → 401 응답
- 클라이언트에서 401 감지 시: **폼 데이터를 `sessionStorage`에 임시 보존** → "세션이 만료됐습니다. 재인증 후 계속 진행하세요." 모달 표시
- 재인증(OTP) 완료 후 `sessionStorage` 복원 → 폼 자동 재제출 옵션 제공 (사용자 확인 후)
- `sessionStorage` 보존 데이터: form field 값만 (비밀번호, 개인정보 제외). 저장 시 `admin_session_draft_${formId}` 키 사용

## 작업 목록
1. 어드민 레이아웃: 사이드바(단지·데이터소스·매칭큐) + 상단 "ADMIN" 배지
2. 미들웨어: `SUPERADMIN_EMAIL` 화이트리스트 검증. 미인증 시 /login 리다이렉트
3. **2FA (이메일 OTP)**: 어드민 진입 시 6자리 OTP 이메일 발송 → 검증 후 세션에 `admin_verified_at` 표시. TTL 30분.
4. **IP allowlist 미들웨어**: `ADMIN_IP_ALLOWLIST` 환경변수(CIDR 목록) — 미해당 IP는 403. 로컬 개발 시 `127.0.0.1` 허용.
5. **어드민 세션 TTL 단축**: 일반 세션 7일과 별도로 admin 검증 세션은 30분 후 재인증 요구.
6. `complexes` CRUD: 단지 검색·상세 편집·신축 수동 등록 폼 (status·predecessor·canonical_name)
7. 매칭 큐: step3b API 연결 → 좌(원본)/우(후보) UI + 승인/거부 버튼
8. 데이터 소스 페이지: 소스별 last_synced·SLA 대비 지연·consecutive_failures + "지금 새로고침" 버튼
9. `audit.ts`: 모든 admin mutation에 감사 로그 자동 삽입 (actor_id, action, target_type, target_id, payload, ip_hash)

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` + `npm run build` 통과
- [ ] 비어드민으로 `/admin` 접근 → 리다이렉트
- [ ] 어드민 로그인 후 OTP 미완료 시 `/admin` 접근 차단
- [ ] IP allowlist 외 요청 → 403
- [ ] 단지 편집 → `audit_logs`에 레코드 생성 (ip_hash 포함)
- [ ] 매칭 큐 승인 → `complex_aliases` 업데이트 + 큐 status='resolved'
- [ ] admin 세션 30분 후 재인증 요구 확인

## Definition of Done
운영자 콘솔 기본 완성. V0.9 베타 운영 중 데이터 이슈 직접 처리 가능.
