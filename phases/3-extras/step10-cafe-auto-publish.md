# Step 10 (3-extras): cafe-auto-publish

## 목표
카카오 카페 매니저 OAuth를 통해 카드뉴스를 카페에 자동 발행한다. ADR-045: 약관 검토 완료 후 진행. V1(1-launch step13)의 수동 발행을 대체.

## 전제 (Prerequisites)
- 1-launch step13 완료 (card-news-pipeline — 카드뉴스 자동 생성)
- **네이버 카페 약관 + 자동 발행 API 검토 완료** — 법무 게이트 통과 필수

## 법무 게이트 (구현 전 필수 확인)

| 항목 | 확인 방법 |
|---|---|
| 네이버 카페 Open API 자동 게시 허용 여부 | 네이버 개발자 센터 카페 API 약관 |
| 봇 게시 약관 위반 여부 | 법무 자문 |
| 카드뉴스 저작권 (공공데이터 출처 표기) | 국토부·K-apt 공공데이터 이용 약관 |
| 광고성 게시물 표기 의무 | 표시광고법 (카드뉴스가 광고 포함 시) |

## 네이버 카페 API 현황 (2026-04-30 기준)
네이버 카페 글쓰기 API는 공개 API 미제공 상태. 실제 구현 시 대안:
1. **Selenium·Playwright headless** — 약관 위반 위험, 금지
2. **네이버 카페 API (내부·파트너)** — 네이버 비즈니스 파트너십 필요
3. **카카오 오픈빌더 + 채널** — 카카오 카페 아닌 카카오 채널 자동 발행

**V2 결정**: 네이버 파트너 API 접근 불가 시 "카카오 채널 자동 발행 (step7 확장)"으로 대체.

## 적용 범위 (Scope)
- `src/services/naver-cafe-publish.ts` 또는 `src/services/kakao-channel-publish.ts`
- `src/app/(admin)/admin/card-news/auto-publish/` — 자동 발행 스케줄 관리

## 도메인 컨텍스트 / 가드레일
- ADR-045: 1-click 수동 발행(V1)이 완전 자동 발행(V2)으로 전환. 약관 미충족 시 V1 유지
- `cafe_post_queue` 테이블에 `scheduled_at`, `published_at`, `publish_status enum(pending, published, failed)` 추가
- 발행 실패 시 운영자 알림 + 자동 재시도 없음 (수동 재발행 권장)
- 발행 이력 `audit_logs` 기록 필수
- 카드뉴스에 공공데이터 출처 표기 (`docs/UI_GUIDE.md` 규약) 자동 삽입

## 작업 목록
1. 약관·법무 게이트 통과 문서 존재 확인
2. API 접근 방식 확정 (네이버 파트너 vs 카카오 채널)
3. `cafe_post_queue` 마이그레이션 (발행 상태 컬럼 추가)
4. 자동 발행 cron: 매주 월·수·금 KST 08:00 (카페 활성 시간대)
5. 어드민 발행 스케줄 관리 UI: 예약·취소·이력 조회
6. 발행 실패 → Resend 운영자 알림 + audit_log
7. Vitest: 발행 상태 머신 + 실패 처리

## 수용 기준 (Acceptance Criteria)
- [ ] 법무·약관 게이트 통과 문서 존재
- [ ] `npm run test` 통과
- [ ] 예약 발행 → 지정 시각에 카페 게시 확인 (sandbox)
- [ ] 발행 실패 → 운영자 알림 + audit_log 기록
- [ ] 카드뉴스에 공공데이터 출처 표기 자동 삽입 확인

## Definition of Done
카드뉴스 자동 발행 완성. 운영자 1분 수동 작업 제거. 콘텐츠 발행 완전 자동화.
