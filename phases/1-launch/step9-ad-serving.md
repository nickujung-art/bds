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

### UTC/KST 시간대 주의사항
- `starts_at` / `ends_at` 는 DB에 **UTC**로 저장
- 광고주가 입력한 "2026-05-01 00:00 KST"는 `2026-04-30 15:00 UTC`로 변환 후 저장
- 어드민 UI에서 입력 시: KST 기준 입력창 + 저장 시 `-09:00` 오프셋 변환 명시
- `now() BETWEEN starts_at AND ends_at` 는 Postgres UTC 기준으로 평가 → 별도 변환 없이 올바름

### 광고 슬롯 빈(empty) 상태 처리
- `get-creative.ts`가 조건에 맞는 캠페인 0건 반환 시: **슬롯을 완전히 숨김** (빈 공간 표시 금지)
- weight 합계 = 0 인 경우도 동일하게 슬롯 숨김 처리
- `AdSlot.tsx`: `creative === null → return null` (no layout shift — 슬롯 height reservation 없음)

### 노출(Impression) 기록 실패 처리
- `impression/route.ts`는 fire-and-forget 패턴. 페이지 렌더를 블로킹하지 않음
- INSERT 실패 시: Sentry warn 로그 (error level 아님). 사용자 경험 영향 없음
- 연속 실패(10건 이상/분) 시: Sentry error → 운영자 확인

## 작업 목록
1. `get-creative.ts`: Supabase 쿼리 + 예산 잔액 기반 가중치 랜덤 선택. 0건/weight=0 → null 반환
2. `impression/route.ts`: Server Action으로 노출 기록 + fraud 체크. fire-and-forget — 실패 시 Sentry warn만
3. `click/route.ts`: ad_events INSERT + 외부 URL redirect (허용 도메인만)
4. `AdSlot.tsx` 업데이트: get-creative null → return null (슬롯 숨김)
5. 어드민 광고 등록 UI: `starts_at`/`ends_at` KST 입력 → UTC 변환 저장 명시
6. Vitest: fraud 중복 클릭 필터 + 봇 UA 차단 + 0건 → null 반환 + weight=0 → null 반환

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 승인된 캠페인 → 슬롯에 광고 표시
- [ ] 미승인 캠페인 → 게재 안 됨
- [ ] 클릭 → `ad_events` INSERT + redirect
- [ ] 동일 IP 연속 클릭 → 1회만 카운트
- [ ] 활성 캠페인 0건 → `AdSlot` 완전 숨김 (Playwright 확인)
- [ ] KST 입력값 UTC 변환 저장 + 조회 시 KST 표시 (Vitest)

## Definition of Done
광고 게재 시스템 완성. 광고 수익화 가동.
