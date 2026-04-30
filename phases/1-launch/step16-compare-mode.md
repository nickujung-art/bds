# Step 16 (1-launch): compare-mode

## 목표
즐겨찾기 단지 2~4개를 가로 비교 표로 보여준다. 시세·관리비·학군·연식 항목 비교.

## 전제 (Prerequisites)
- step2 완료 (즐겨찾기)

## 적용 범위 (Scope)
- `src/app/(auth)/favorites/page.tsx` — 비교 모드 토글 추가
- `src/components/danji/CompareTable.tsx` — 비교 표
- `src/app/api/compare/route.ts` — 복수 단지 데이터 fetch

## 도메인 컨텍스트 / 가드레일
- 최대 4개 비교. 5개째 선택 시 첫 번째 자동 제거
- 비회원: 즐겨찾기 없음 → "로그인 후 이용" 안내
- 데이터 없는 항목(신축 등): "-" 표시 + AI 추정값이 있으면 "추정" 라벨

## 작업 목록
1. 즐겨찾기 페이지에 "비교" 체크박스 + "비교하기" 버튼
2. `compare/route.ts`: 단지 ID 배열 → 단지 메타 + 최근 거래가 + 관리비 + 학군 일괄 쿼리
3. `CompareTable.tsx`: 가로 스크롤 테이블 (모바일) — 항목별 행, 단지별 열

## 수용 기준 (Acceptance Criteria)
- [ ] 즐겨찾기 2개 선택 → 비교 표 렌더
- [ ] 모바일(375px) 가로 스크롤 동작
- [ ] 데이터 없는 항목 "-" 표시

## Definition of Done
비교 모드 완성. 가입 전환 동기 강화.
