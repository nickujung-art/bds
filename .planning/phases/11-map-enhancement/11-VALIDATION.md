---
phase: 11
slug: map-enhancement
date: 2026-05-16
---

# Phase 11 Validation Architecture

Phase 11 검증 아키텍처. DB 컬럼 추가부터 지도 인터랙션까지 전 계층을 커버한다.

---

## Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (기존 설정) |
| Config file | vitest.config.ts |
| Quick run | `npm run test -- --run` |
| Full suite | `npm run test && npm run lint && npm run build` |
| E2E | Playwright (`npm run test:e2e`) |

---

## 1. DB 컬럼 검증

**목적:** 마이그레이션 SQL이 4개 컬럼 + 2개 함수를 올바르게 정의하는지 확인.

### 1-1. SQL 파일 구문 확인 (파일 존재 시점)

```bash
# 필수 컬럼 존재 확인
grep -c "avg_sale_per_pyeong" supabase/migrations/20260516000001_phase11_map_columns.sql
grep -c "view_count" supabase/migrations/20260516000001_phase11_map_columns.sql
grep -c "price_change_30d" supabase/migrations/20260516000001_phase11_map_columns.sql
grep -c "tx_count_30d" supabase/migrations/20260516000001_phase11_map_columns.sql

# cancel_date / superseded_by 조건 누락 없는지 확인
grep -v '^--' supabase/migrations/20260516000001_phase11_map_columns.sql | grep -c "cancel_date IS NULL"
grep -v '^--' supabase/migrations/20260516000001_phase11_map_columns.sql | grep -c "superseded_by IS NULL"

# 함수 존재 확인
grep -c "increment_view_count" supabase/migrations/20260516000001_phase11_map_columns.sql
grep -c "refresh_complex_price_stats" supabase/migrations/20260516000001_phase11_map_columns.sql

# GRANT 구문 확인
grep -c "GRANT EXECUTE" supabase/migrations/20260516000001_phase11_map_columns.sql
```

**합격 기준:** 모든 grep 결과 >= 1

### 1-2. Supabase 적용 후 DB 검증 (supabase db push 완료 후)

```sql
-- Supabase SQL Editor 또는 psql에서 실행
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'complexes'
  AND column_name IN ('avg_sale_per_pyeong', 'view_count', 'price_change_30d', 'tx_count_30d');
-- 기대: 4행 반환

SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('increment_view_count', 'refresh_complex_price_stats');
-- 기대: 2행 반환
```

---

## 2. badge-logic 단위 테스트

**목적:** `determineBadge()` 순수 함수가 우선순위 규칙을 정확히 적용하는지 검증.

**파일:** `src/lib/utils/badge-logic.test.ts`

**실행:**

```bash
npm run test -- --run src/lib/utils/badge-logic.test.ts
```

**커버해야 할 케이스:**

| 케이스 | 입력 조건 | 기대 출력 |
|--------|-----------|----------|
| 1순위: 분양 | `status = 'pre_sale'` | `'pre_sale'` |
| 1순위: 신축 | `built_year >= 2021` | `'new_build'` |
| 2순위: 거래량 상위 5% | `tx_count_30d >= p95_tx_count` | `'crown'` |
| 2순위: 조회수 상위 5% | `view_count >= p95_view_count` | `'hot'` |
| 2순위: 급등 | `price_change_30d > 0.05` | `'surge'` |
| 2순위: 급락 | `price_change_30d < -0.05` | `'drop'` |
| 3순위: 학군 | `hagwon_grade in ['A+', 'A']` | `'school'` |
| 3순위: 대단지 | `household_count >= 1000` | `'large_complex'` |
| 3순위: 재건축 | `status = 'in_redevelopment'` | `'redevelop'` |
| 배지 없음 | 모든 조건 불충족 | `'none'` |

**합격 기준:** 모든 케이스 GREEN, TypeScript 오류 없음

---

## 3. ClusterMarker 줌인 통합 테스트

**목적:** ClusterMarker 클릭 시 `getLeaves → LatLngBounds → map.setBounds` 흐름이 올바른지 검증.

**파일:** `src/components/map/ClusterMarker.test.tsx`

**실행:**

```bash
npm run test -- --run src/components/map/ClusterMarker.test.tsx
```

**커버해야 할 케이스:**

| 케이스 | 검증 방법 |
|--------|----------|
| `clusterId` prop 전달 시 `clusterIndex.getLeaves(clusterId, Infinity)` 호출 | mock `getLeaves` 확인 |
| `getLeaves` 결과의 각 좌표로 `LatLngBounds.extend()` 호출 | mock `bounds.extend` 호출 횟수 확인 |
| `map.setBounds(bounds)` 호출 | mock `map.setBounds` 확인 |
| `clusterId` 없는 경우 핸들러 실행 안 함 | 클릭 없이 mount만 — `getLeaves` 미호출 |

**합격 기준:** 모든 케이스 GREEN

---

## 4. 사이드 패널 API 테스트

**목적:** `GET /api/complexes/[id]/map-panel`이 UUID 검증 + 에러 핸들링을 올바르게 처리하는지 검증.

**파일:** `src/app/api/complexes/[id]/map-panel/route.test.ts`

**실행:**

```bash
npm run test -- --run "src/app/api/complexes/\[id\]/map-panel/route.test.ts"
```

**커버해야 할 케이스:**

| 케이스 | 기대 상태 코드 | 검증 항목 |
|--------|---------------|----------|
| 유효한 UUID + 단지 존재 | 200 | `canonical_name` 필드 포함 |
| 잘못된 UUID 형식 (`not-a-uuid`) | 400 | `{ error: 'invalid id' }` |
| 존재하지 않는 UUID | 404 | — |
| `getMapPanelData` throw | 500 | `{ error: 'db error' }` |

**추가 검증:**

```bash
# hagwon_grade가 null이 아닌 경우 응답에 포함되는지 (BLOCKER 3 수정 후)
# 통합 테스트는 실제 DB 대상으로:
curl -s "http://localhost:3000/api/complexes/{valid-uuid}/map-panel" | jq '.hagwon_grade'
# 기대: 학원 데이터 있으면 "A+" 등 문자열, 없으면 null
```

**합격 기준:** 4개 유닛 테스트 GREEN, TypeScript 오류 없음

---

## 5. 마커 렌더링 E2E

**목적:** 실제 브라우저에서 지도 마커 클릭 → 사이드 패널 슬라이드인 UX 검증.

**파일:** `tests/e2e/map-markers.spec.ts` (Phase 11에서 신규 작성 예정)

**실행:**

```bash
npm run test:e2e -- --grep "map"
```

**검증 시나리오:**

```typescript
test('클러스터 클릭 시 지도가 줌인된다', async ({ page }) => {
  await page.goto('/map')
  // 클러스터 마커 클릭 (원형 숫자 표시)
  const cluster = page.locator('[class*="rounded-full"]').first()
  const initialUrl = page.url()
  await cluster.click()
  // 줌인 후 클러스터가 해소되어 개별 마커로 분리됨
  await expect(cluster).not.toBeVisible({ timeout: 3000 })
})

test('단지 마커 클릭 시 사이드 패널이 열린다', async ({ page }) => {
  await page.goto('/map')
  // 개별 단지 마커 클릭 (충분히 확대된 상태)
  const marker = page.locator('[data-complex-id]').first()
  await marker.click()
  // 패널 열림 확인
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
  await expect(page.getByRole('dialog')).toContainText('단지 상세 보기')
})

test('사이드 패널 닫기 버튼이 동작한다', async ({ page }) => {
  await page.goto('/map')
  const marker = page.locator('[data-complex-id]').first()
  await marker.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: '패널 닫기' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 2000 })
})

test('모바일에서 바텀 시트가 하단에서 슬라이드인한다', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/map')
  const marker = page.locator('[data-complex-id]').first()
  await marker.click()
  const dialog = page.getByRole('dialog').nth(1) // 모바일 dialog
  await expect(dialog).toBeVisible({ timeout: 3000 })
})
```

**합격 기준:** 4개 E2E 시나리오 모두 GREEN

---

## Phase Gate (전체 통과 조건)

Phase 11이 완료 상태로 인정되려면 다음을 모두 만족해야 한다:

- [ ] `supabase db push` 성공 + complexes 테이블 4개 컬럼 존재 확인
- [ ] `npm run test -- --run` 전체 GREEN (badge-logic, ClusterMarker, map-panel route, actions)
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] E2E: 마커 클릭 → 사이드 패널 열림 시나리오 GREEN
- [ ] 사이드 패널 응답에 `hagwon_grade` 필드 포함 (null 또는 등급 문자열)
- [ ] AI 슬롭 패턴 없음 (backdrop-blur, gradient-text, glow, 보라/인디고 미사용)
