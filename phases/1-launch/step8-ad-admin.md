# Step 8 (1-launch): ad-admin

## 목표
광고주 어드민을 구현한다. 캠페인 등록, 상태 머신(draft→pending→approved→ended), 노출/클릭 통계. 운영자 검수 후 승인.

## 전제 (Prerequisites)
- 1-launch step0 완료 (인증 + role)

## 적용 범위 (Scope)
- `src/app/(admin)/admin/ads/` — 운영자 광고 검수 UI
- `src/app/api/ads/campaigns/route.ts` — CRUD
- `src/app/api/ads/approve/route.ts` — 승인 (status 전이)
- 광고주 어드민 (role='advertiser'): `src/app/(admin)/admin/advertiser/`

## 도메인 컨텍스트 / 가드레일
- ADR-025: 상태 머신 엄격 적용. `approved`가 아닌 캠페인은 절대 게재 금지
- RLS: advertiser는 본인 캠페인만 접근
- 표시광고법: 캠페인 등록 폼에 "필수 고지 문구" 템플릿 제공
- 운영자 검수 체크리스트: 고지문구·기간·이미지 저작권 확인 체크박스 필수 통과 후 approved 전이
- `audit_logs`에 모든 상태 변경 기록

## 작업 목록
1. 캠페인 등록 폼: ad_type, slot, target_filter(시군구·평형·키워드), 기간, 매체비, creative, 고지문구
2. 상태 전이 API: pending→approved, approved→paused 등 유효 전이만 허용
3. 운영자 검수 큐: pending 목록 + 체크리스트 + 승인/거부 버튼
4. 통계 페이지: 노출수·클릭수·CTR (campaign_id 기준)
5. Vitest: 상태 전이 유효성 (rejected → approved 불가 등)

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (상태 머신)
- [ ] draft → approved: 체크리스트 완료 후에만 가능
- [ ] advertiser가 다른 advertiser 캠페인 조회 → RLS 차단
- [ ] 승인/거부 → `audit_logs` 기록

## Definition of Done
광고 어드민 완성. step9 게재 로직과 연결 준비됨.
