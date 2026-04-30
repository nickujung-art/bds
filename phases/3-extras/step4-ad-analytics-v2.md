# Step 4 (3-extras): ad-analytics-v2

## 목표
광고 통계를 고도화한다. 전환 추적(클릭 후 행동), ROI 지표, 이상 트래픽 탐지를 추가한다.

## 전제 (Prerequisites)
- 1-launch step9 완료 (ad-serving — 노출/클릭 기본 트래킹)
- 1-launch step8-5 완료 (ad-billing)

## 적용 범위 (Scope)
- `supabase/migrations/0023_ad_conversions.sql` — `ad_conversions` 테이블
- `src/lib/ads/analytics.ts` — 전환·이상 트래픽 분석
- `src/app/(admin)/admin/billing/analytics/` — 고급 통계 대시보드

## 전환 추적 정의

| 전환 이벤트 | 조건 |
|---|---|
| 단지 상세 뷰 | 광고 클릭 → 30분 내 단지 상세 방문 |
| 즐겨찾기 추가 | 광고 클릭 세션 내 즐겨찾기 |
| 회원가입 | 광고 클릭 세션 내 신규 가입 |

## 이상 트래픽 탐지 (fraud-v2)

기존 step9(1-launch)은 ip+UA 1초 dedupe + 봇 UA만 차단. V2 추가:
- 동일 ip_hash가 1h 내 5회 이상 클릭 → 자동 차단 + audit_log
- CTR > 30% 캠페인 → 운영자 검토 플래그
- 지리 불가능 패턴 (동일 ip_hash가 창원·서울 1분 내 클릭) → 차단

## 도메인 컨텍스트 / 가드레일
- `ad_conversions`: `ad_events.id FK` + `conversion_type` + `converted_at`. attribution window 30분
- CTR·CPM·전환율은 광고주 대시보드에도 노출 (RLS: 본인 캠페인만)
- ROI 계산은 V1.5 ad-billing의 `ad_invoices.amount_krw` 기반
- 이상 트래픽 ip_hash 차단 목록은 `ADMIN_FRAUD_BLOCKLIST` 환경변수 (Redis 또는 DB)

## 작업 목록
1. `0023_ad_conversions.sql` + RLS
2. `analytics.ts`: `trackConversion(adEventId, type)` + 30분 attribution 계산
3. 이상 트래픽 탐지 cron (1h 간격)
4. 광고주 고급 통계 페이지: CTR·전환율·ROI·이상 트래픽 플래그
5. Vitest: attribution window 경계 케이스 + fraud 탐지 시나리오

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 광고 클릭 → 30분 내 단지 방문 → `ad_conversions` 기록
- [ ] CTR > 30% 캠페인 → 어드민 플래그 표시
- [ ] 동일 ip_hash 5회 클릭 → 차단

## Definition of Done
광고 분석 V2 완성. 광고주에게 전환 지표 제공 가능. 이상 트래픽 자동 차단.
