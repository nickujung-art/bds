# Step 11 (1-launch): a11y-audit

## 목표
WCAG 2.1 AA 접근성 검증을 CI에 추가한다. axe-core 자동 테스트 + 키보드 탐색 + 스크린리더 라벨.

## 전제 (Prerequisites)
- 주요 페이지 구현 완료 (랜딩·검색·단지상세·지도)

## 적용 범위 (Scope)
- `playwright/a11y.spec.ts` — axe-core 통합 (랜딩·검색·단지상세·지도 4페이지)
- 기존 컴포넌트에 누락된 aria 속성 보완

## 도메인 컨텍스트 / 가드레일
- ADR-031: axe-core CI + 4페이지 critical 위반 0
- 색 대비: UI_GUIDE 컬러 토큰 준수 (#0a0a0a on #ffffff ≥ 7:1)
- 키보드: 모든 인터랙션 Tab 접근 + Enter/Space 동작
- 스크린리더: 거래가 수치에 aria-label (예: "3억 5천만원")

## 작업 목록
1. `@axe-core/playwright` 설치 + `a11y.spec.ts` 4페이지 스캔
2. 자동완성 드롭다운 ARIA 역할 (combobox, listbox, option)
3. 광고 슬롯 `aria-label="광고"` 추가
4. 거래가 숫자 aria-label 포맷터
5. CI `playwright.config.ts`에 a11y 테스트 포함

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test:e2e` 통과 (a11y 포함)
- [ ] axe-core critical 위반 0 (4페이지 기준)
- [ ] 키보드만으로 검색 → 단지 상세 이동 가능

## Definition of Done
접근성 CI 게이트 확립. V1.0 출시 품질 기준 충족.
