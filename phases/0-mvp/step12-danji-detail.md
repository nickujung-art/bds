# Step 12: danji-detail

## 목표
단지 상세 페이지를 SSG + ISR 1h로 구현한다. 10년 그래프, 거래 내역, 면적 분포, 시설 V1(학군·관리비·편의시설), 기준일 라벨, 신축/재건축 배너를 포함한다.

## 전제 (Prerequisites)
- Step 7~9 완료 (시설 V1 데이터)
- Step 11 완료 (DanjiCard 컴포넌트)

## 적용 범위 (Scope)
- `src/app/(public)/danji/[id]/page.tsx` — SSG + ISR
- `src/components/danji/PriceChart.tsx` — Recharts 10년 그래프
- `src/components/danji/TransactionTable.tsx` — 거래 내역 표
- `src/components/danji/AreaDistribution.tsx` — 면적별 시세 분포
- `src/components/danji/FacilitySection.tsx` — 시설 V1
- `src/components/danji/StatusBanner.tsx` — 신축/재건축/멸실 배너
- `src/components/shared/DataFreshnessLabel.tsx` — 기준일 라벨
- `src/components/shared/AiEstimateLabel.tsx` — AI 추정 경고 라벨

## 도메인 컨텍스트 / 가드레일
- CLAUDE.md: 거래 조회는 `WHERE cancel_date IS NULL AND superseded_by IS NULL`
- ADR-035: `status` enum에 따른 배너 분기:
  - `recently_built`: "이 단지는 입주 X개월차로 데이터가 누적 중입니다"
  - `in_redevelopment`: "재건축 진행 중 — [단계] ([날짜])"
  - `demolished`: "이 단지는 X년 멸실되었습니다 → 신 단지 보러가기"
- ADR-037: 각 시설 섹션 우상단 "기준: YYYY-MM-DD" 라벨 (`DataFreshnessLabel`)
- ADR-042: K-apt 부재 → AI 추정 배너 (`AiEstimateLabel`) — "AI가 자동 추정한 값입니다"
- ISR `revalidate = 3600`. 신고가 갱신 시 on-demand revalidate

### 삭제된 단지 접근 처리
- `generateStaticParams`에 포함됐다가 이후 DB에서 삭제된 단지(운영자 오류 등):
  - `page.tsx`에서 Supabase 조회 결과 null → `notFound()` 호출 → Next.js 404 페이지
  - ISR revalidate 시 404 → 캐시에서 해당 경로 제거 (`next/cache` `revalidatePath` 명시)

### ISR DB 조회 실패 처리 (stale-while-error)
- Supabase 일시 장애로 `page.tsx` 서버 함수가 throw하는 경우:
  - Next.js ISR 기본: 이전 캐시 페이지 서빙 (stale). 이 동작은 의도적으로 유지
  - **단, 캐시 페이지 상단에 `DataFreshnessLabel` SLA 초과 경고 표시**: `last_synced_at > now() - interval '3 hours'`이면 경고색 활성화 (사용자에게 데이터 신선도 안내)
  - Sentry error 알림은 항상 발송

### generateStaticParams 빌드 메모리 주의
- 창원·김해 전 단지(~1,000개)를 한 번에 빌드하면 Vercel Hobby 빌드 메모리 한도(1GB) 위험
- `generateStaticParams`에서 `dynamicParams = true` 설정 + **ISR fallback**: 빌드 시 인기 상위 200개만 pre-render, 나머지는 첫 요청 시 생성 후 캐시
- 상위 200개 기준: `page_views` 기준 내림차순 (없으면 `created_at` DESC)

## 작업 목록
1. `PriceChart.tsx`: 매매·전세·월세 토글 탭, Recharts LineChart, 면적 필터, 연도 범위 슬라이더
2. `TransactionTable.tsx`: 최근 50건, 날짜·면적·층·가격·직거래여부, 취소 거래 회색 처리
3. `AreaDistribution.tsx`: 평형별 중앙값 + 최저/최고 바 차트
4. `FacilitySection.tsx`: 학군(학교명·거리), 관리비(원/㎡·기준월), 편의시설(POI 목록)
5. `StatusBanner.tsx`: status 분기 + predecessor/successor 링크
6. `DataFreshnessLabel.tsx`: `data_sources.last_synced_at` 기반. SLA 초과 시 경고색
7. `AiEstimateLabel.tsx`: 황색 배경 + 참고 단지 링크 (step17 연동 대비)
8. `page.tsx`: `generateStaticParams` (창원·김해 전 단지), Supabase 단일 쿼리 (단지+거래200건+시설)
9. Playwright E2E: 단지 상세 → 그래프 렌더 → 탭 전환 → 학군 섹션 확인

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` + `npm run build` 통과 (SSG 빌드 완료)
- [ ] Lighthouse 모바일 LCP ≤ 2.5s
- [ ] `recently_built` 단지 → 신축 배너 표시
- [ ] K-apt 데이터 없는 단지 → `AiEstimateLabel` 표시 (step17 전까지 placeholder)
- [ ] 기준일 라벨 각 섹션에 노출
- [ ] Playwright: 그래프 탭 전환(매매→전세) 정상 동작

## Definition of Done
단지 상세 페이지 완성. V0.9 핵심 가치 전달 가능.
