# Step 9 (1-launch): ad-serving

## 목표
광고 게재 로직을 완성한다. RSC에서 서버 렌더, 노출/클릭 트래킹, fraud 방어.

## 전제 (Prerequisites)
- step7 (슬롯), step8 (캠페인 승인)

## 적용 범위 (Scope)
- `src/lib/ads/get-creative.ts` — 게재 쿼리 + 가중치 선택
- `src/app/api/ads/click/route.ts` — 클릭 → ad_events + redirect
- `src/app/api/ads/impression/route.ts` — 노출 기록 (서버 액션)

## 도메인 컨텍스트 / 가드레일
- CLAUDE.md: 게재 쿼리 = `status='approved' AND now() BETWEEN starts_at AND ends_at`
- ADR-024: `ip_hash = sha256(ip + FRAUD_SALT)` 저장
- fraud: 동일 ip_hash + UA + 1초 이내 → 1회 카운트
- 봇 UA 차단 리스트 (`Googlebot`, `bingbot` 등은 impression 기록 안 함)
- 클릭 → Open Redirect 방지: 허용 도메인 allowlist 또는 내부 redirect 경로

## 작업 목록
1. `get-creative.ts`: Supabase 쿼리 + 예산 잔액 기반 가중치 랜덤 선택
2. `impression/route.ts`: Server Action으로 노출 기록 + fraud 체크
3. `click/route.ts`: ad_events INSERT + 외부 URL redirect (허용 도메인만)
4. `AdSlot.tsx` 업데이트: get-creative 실제 연결
5. Vitest: fraud 중복 클릭 필터 + 봇 UA 차단

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 승인된 캠페인 → 슬롯에 광고 표시
- [ ] 미승인 캠페인 → 게재 안 됨
- [ ] 클릭 → `ad_events` INSERT + redirect
- [ ] 동일 IP 연속 클릭 → 1회만 카운트

## Definition of Done
광고 게재 시스템 완성. 광고 수익화 가동.
