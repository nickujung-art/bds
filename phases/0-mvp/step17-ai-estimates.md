# Step 17: ai-estimates

## 목표
신축 단지에서 K-apt 관리비 등 시설 데이터가 없을 때, 인근 유사 단지의 통계 기반 추정값을 `ai_estimates` 테이블에 저장하고 UI에 명시 라벨과 함께 표시한다.

## 전제 (Prerequisites)
- Step 8 완료 (K-apt ingest — 부재 케이스 확인 가능)
- Step 12 완료 (단지 상세 AiEstimateLabel placeholder)

## 적용 범위 (Scope)
- `src/lib/data/ai-estimate.ts` — 유사 단지 탐색 + 추정 알고리즘
- `src/app/api/ingest/ai-estimates/route.ts` — 배치 추정 (일배치에 포함)
- `src/components/danji/AiEstimateSection.tsx` — 추정값 + 경고 라벨 UI
- `src/app/(admin)/admin/ai-estimates/page.tsx` — 추정값 검수 페이지

## 도메인 컨텍스트 / 가드레일
- ADR-042: 라벨 "AI가 자동 추정한 값입니다 — 정확하지 않을 수 있어요" 필수
- `ai_estimates.method = 'nearest_neighbors'` (V1 통계 기반)
- 유사 단지 기준: PostGIS 반경 1km + 세대수 ±50% + 건축연도 ±5년 + 평형 유사
- `reference_complex_ids` 컬럼에 참고 단지 저장 → UI에 링크
- 사용자 신고 시 즉시 `status='rejected'` + hide. 어드민에서 hide 해제 가능
- V1은 ML 없이 순수 통계 (평균·중앙값)
- **CRON_SECRET 가드 필수**: `/api/ingest/ai-estimates` route에 검증 적용
- **confidence 산식**:
  ```
  confidence = min(1.0, ref_count / 5) × (1 - CV)
  ```
  - `ref_count`: 유사 단지 수 (5개 이상이면 만점)
  - `CV`: 참고 단지 관리비의 변동계수(표준편차/평균). 분산이 클수록 신뢰도 ↓
  - 예: ref_count=3, CV=0.15 → confidence = (3/5) × 0.85 = 0.51
- **유사 단지 0건 fallback**: 반경을 1km → 3km로 확장 1회 재시도. 그래도 0건이면 `status='pending'` + UI에서 해당 섹션 완전 숨김 (추정값 없음)
- **Vitest 필수**: confidence 산식 단위 테스트 + 0건 fallback 케이스

### IQR 이상치 필터링
- `estimateKapt()` 에서 참고 단지 데이터를 중앙값 계산하기 전, **IQR(사분위 범위) 기반 이상치 제거** 적용:
  - Q1 - 1.5×IQR 미만, Q3 + 1.5×IQR 초과 값 제외
  - 이상치 제거 후 참고 단지 수가 0이 되면: 이상치 필터 없이 전체 재계산 (데이터 부족 케이스 보호)
  - `confidence` 산식은 IQR 필터 후 남은 ref_count 기준으로 계산

### 참고 단지 삭제(Orphan) 처리
- `ai_estimates.reference_complex_ids` 배열 내 complex_id가 이후 운영자에 의해 삭제·병합되는 경우:
  - 일배치에서 `ai_estimates` 검사: `reference_complex_ids` 내 존재하지 않는 complex_id 탐지
  - 발견 시: `status = 'stale'` 마킹 + UI에서 해당 추정값 숨김 + 재추정 큐에 enqueue
  - 재추정 배치 다음 날 실행 → 새 참고 단지로 갱신

## 작업 목록
1. `ai-estimate.ts`:
   - `findSimilarComplexes(complexId, radius=1000)` → PostGIS + 세대수/연식/평형 필터
   - `estimateKapt(complexId)` → IQR 이상치 필터 후 유사 단지 `facility_kapt` 중앙값 계산
   - `checkOrphanedRefs(estimateId)` → reference_complex_ids 유효성 검증
   - `upsertEstimate(complexId, type, value, refs, confidence)` → `ai_estimates` INSERT
2. 일배치에 `ai-estimates` 단계 추가 (K-apt 부재 단지만 대상) + orphan 참고 단지 stale 처리
3. `AiEstimateSection.tsx`: 황색 배너 + 추정값 + 참고 단지 링크 (최대 3개)
4. 어드민 검수 페이지: status=active 추정값 목록 + 승인/거부 + 참고 단지 확인

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (유사 단지 탐색 로직 + confidence 산식 + 0건 fallback 단위 테스트)
- [ ] K-apt 부재 단지 상세 → AiEstimateSection 렌더 확인
- [ ] 추정값 UI에 "AI 자동 추정" 황색 라벨 표시
- [ ] 어드민에서 추정값 거부 → UI에서 사라짐
- [ ] 유사 단지 0건 단지 → 섹션 완전 숨김 확인 (라벨만 표시 금지)
- [ ] CRON_SECRET 없는 요청 → 401 반환 확인

## Definition of Done
V0.9 핵심 완성. 신축 단지도 관리비 추정값 제공 가능. **V0.9 출시 게이트** 진입.
