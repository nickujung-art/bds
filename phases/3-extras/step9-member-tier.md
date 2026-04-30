# Step 9 (3-extras): member-tier

## 목표
회원 등급 시스템을 고도화한다. step0(gamification-marks)의 기본 등급을 확장해 우선 알림 혜택·전용 기능을 부여한다.

## 전제 (Prerequisites)
- 3-extras step0 완료 (gamification-marks — 기본 등급 구조)
- 1-launch step3 완료 (notification-engine)

## 등급별 혜택 정의

| 등급 | 우선 알림 | 전용 기능 | 광고 |
|---|---|---|---|
| 새내기 | 없음 | 없음 | 기본 |
| 임장러 | 없음 | 관심지역 알림 | 기본 |
| 이웃 | 신고가 알림 5분 우선 | 비교 모드 5개 | 감소 |
| 단골 | 신고가 알림 즉시 | 관리비 예측 | 최소 |
| 전문가 | 모든 알림 즉시 + 주간 전문가 리포트 | 전체 기능 + 베타 접근 | 없음 |

## 적용 범위 (Scope)
- `src/lib/gamification/tiers.ts` 확장 (step0 기반)
- `src/lib/notifications/queue.ts` — 등급별 알림 우선순위 로직 추가
- `src/components/shared/TierDashboard.tsx` — 회원 설정 페이지 내 등급 현황

## 도메인 컨텍스트 / 가드레일
- 등급 강등 없음 정책 유지 (한번 획득 보존)
- **우선 알림**: `notifications` 테이블에 `priority enum(normal, high, instant)` 컬럼 추가. 워커가 `ORDER BY priority DESC, created_at ASC`로 처리
- **광고 감소**: 이웃+ 등급 → 광고 슬롯 수 -1개 (단지 상세). 전문가 → 광고 완전 제거. 수익 모델과의 균형 필요 — 전문가 비율 ≤ 5% 유지 기준으로 조건 설정
- **주간 전문가 리포트**: Resend로 시장 요약 리포트 발송 (step15 digest-weekly 확장). 별도 템플릿
- **베타 기능 접근**: `profiles.member_tier='expert'`인 경우 피처 플래그로 미출시 기능 노출

## 작업 목록
1. `notifications` 테이블에 `priority` 컬럼 마이그레이션
2. 알림 워커 우선순위 정렬 로직
3. 등급별 광고 슬롯 수 조정 (`ad_zones` 컴포넌트 — tier prop 추가)
4. `TierDashboard.tsx`: 현재 등급·진행도·다음 등급 조건 표시
5. 전문가 주간 리포트 Resend 템플릿 + cron
6. Vitest: 우선순위 정렬 + 전문가 비율 게이트(≤ 5%) 경고

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 단골 등급 회원 → 신고가 알림 normal 대비 먼저 발송 확인
- [ ] 전문가 등급 → 단지 상세 광고 없음
- [ ] 설정 페이지에서 현재 등급·진행도 확인

## Definition of Done
등급 혜택 시스템 완성. 충성 회원 유인 + 광고 수익 균형.
