# Step 13: map-view

## 목표
카카오맵 + supercluster로 지도 페이지를 구현한다. 핀별 평당가 라벨, 줌별 클러스터링, 단지 미리보기 카드를 제공한다.

## 전제 (Prerequisites)
- Step 6 완료 (단지 좌표)
- 사용자가 카카오 디벨로퍼스 앱 등록 + `NEXT_PUBLIC_KAKAO_APP_KEY` 설정

## 적용 범위 (Scope)
- `src/app/(public)/map/page.tsx` — 지도 페이지 (Client Component)
- `src/components/map/KakaoMap.tsx` — react-kakao-maps-sdk 래퍼
- `src/components/map/DanjiPin.tsx` — 평당가 라벨 핀
- `src/components/map/DanjiPreviewCard.tsx` — 핀 클릭 미리보기
- `src/app/api/map/complexes/route.ts` — 뷰포트 범위 단지 쿼리

## 도메인 컨텍스트 / 가드레일
- 카카오맵 SDK 로드 실패 시 fallback: "지도를 불러올 수 없습니다 — 검색으로 보기" (ErrorBoundary)
- supercluster: 줌 ≤ 13 클러스터, ≥ 14 단일 핀
- 뷰포트 쿼리: PostGIS `ST_MakeEnvelope` + 좌표 범위 파라미터
- 모바일 위치 권한 거부 시 → 창원시청 좌표 기본값
- ADR-034: geocoding_accuracy < 0.7 단지는 클러스터 제외
- **거래 데이터 조회 필수 조건** (CLAUDE.md 정책): 평당가 계산 쿼리에 항상 `WHERE cancel_date IS NULL AND superseded_by IS NULL` 포함. `/api/map/complexes` route에서 강제

### supercluster null 좌표 방어
- `complexes.location`이 NULL인 단지는 supercluster에 전달하기 전 **필터링 필수**. supercluster에 null 좌표 전달 시 JS 예외 → 지도 전체 크래시
- `/api/map/complexes` 쿼리: `WHERE location IS NOT NULL AND geocoding_accuracy >= 0.7`

### bbox 파라미터 공격 방어
- bbox (minLng, minLat, maxLng, maxLat) 파라미터: 서버에서 유효 범위 강제 검증
  - 경위도 범위: lat ∈ [-90, 90], lng ∈ [-180, 180]
  - bbox 면적: `(maxLng-minLng)*(maxLat-minLat) ≤ 1.0` (도² 단위 — 과도한 범위 쿼리 차단)
  - 창원·김해 외 bbox 허용하되, 결과가 0건이면 빈 배열 반환
  - 범위 초과 → 400

### 카카오 SDK 로드 타임아웃
- `useKakaoLoader`: SDK 로드 타임아웃 5초 설정. 5초 초과 시 → ErrorBoundary fallback UI 표시
- CDN 차단 환경(기업 방화벽 등) 사용자를 위한 명시적 안내: "지도 기능은 카카오맵 서비스 접근이 가능한 환경에서만 작동합니다"

## 작업 목록
1. `src/app/api/map/complexes/route.ts`: bbox 파라미터 → PostGIS 범위 쿼리 → 단지 좌표 + 최근 평당가
2. `KakaoMap.tsx`: SDK 동적 로드, `useKakaoLoader`, ErrorBoundary
3. `DanjiPin.tsx`: 평당가 라벨 커스텀 오버레이 (Tailwind inline)
4. supercluster 통합: 줌 변경 시 재클러스터링
5. `DanjiPreviewCard.tsx`: 핀 클릭 → 카드(단지명·평형·거래가·갱신폭) → 상세 이동 CTA
6. 현재 위치 버튼 + 창원시청 기본 center
7. Playwright E2E: 지도 로드 → 핀 클릭 → 미리보기 카드 → 단지 상세 이동

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` + `npm run build` 통과
- [ ] 지도 렌더 + 창원 지역 핀 표시
- [ ] 줌인(≥14) 시 개별 핀, 줌아웃(≤13) 시 클러스터
- [ ] SDK 로드 실패 시 fallback UI 표시
- [ ] 모바일(375px) 기준 터치 제스처 동작

## Definition of Done
지도 페이지 완성. 임장 시나리오(S4) 구현됨.
