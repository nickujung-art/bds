# Step 6 (1-launch): landing

## 목표
메인 랜딩 페이지를 구현한다. 오늘 신고가 카드 + 랭킹 4종 탭 + ISR 60s.

## 전제 (Prerequisites)
- step5 완료 (랭킹 API)

## 적용 범위 (Scope)
- `src/app/(public)/page.tsx` — 랜딩 (ISR 60s)
- `src/components/landing/TodayHighCard.tsx` — 오늘 신고가 카드
- `src/components/landing/RankingTabs.tsx` — 4종 탭 + 랭킹 리스트

## 도메인 컨텍스트 / 가드레일
- ISR `revalidate = 60`
- 신고가 카드: 단지명+동·구 / 평형 / 거래가 + **갱신폭(액센트 #ea580c)** / 거래일. 갱신폭이 핵심
- 랭킹 탭: 4탭 클라이언트 전환 (탭 내용은 각각 API fetch)
- AI 슬롭 금지: 그라데이션·글로우·"AI 추천" 배지 없음
- LCP 목표: ≤ 1.8s (RSC + ISR)

## 작업 목록
1. `TodayHighCard.tsx`: 신고가 갱신 상위 5건 카드 (가로 스크롤 모바일)
2. `RankingTabs.tsx`: new_high / volume_spike / cafe_buzz / favorites_spike 탭
3. `page.tsx`: RSC fetch `/api/ranking/new_high` + `revalidate=60`
4. 랜딩 헤더: 검색바 + 지도 링크 (간결)

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run build` 통과
- [ ] Lighthouse 모바일 LCP ≤ 1.8s
- [ ] 신고가 카드에 갱신폭 액센트 컬러 표시
- [ ] 탭 전환 시 각 랭킹 리스트 정상 노출

## Definition of Done
랜딩 완성. 카페 → 사이트 전환 흐름(시나리오 S1) 완성.
