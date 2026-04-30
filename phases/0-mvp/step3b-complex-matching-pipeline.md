# Step 3b: complex-matching-pipeline

## 목표
외부 출처 단지명을 `complexes` Golden Record와 매칭하는 파이프라인을 구현한다. 신뢰도 0.9+ 자동 매칭, 0.7~0.9 운영자 큐, 0.7 미만 차단. 이 step이 끝나면 ingest 단계(step4~9)가 올바른 complex_id로 데이터를 연결할 수 있다.

## 전제 (Prerequisites)
- Step 3 완료 (시드 + data_sources)
- **Step 3a 완료 (단지 마스터 시드)** — `complexes` 테이블에 후보 단지가 존재해야 매칭 알고리즘이 작동. 비어있는 상태에서는 모든 ingest가 `complex_match_queue`에 적체됨 (cold-start 차단)

## 적용 범위 (Scope)
- `src/lib/data/complex-matching.ts` — 3축 매칭 함수
- `src/lib/data/name-normalize.ts` — `name_normalized` 정규화 파이프라인
- `src/app/api/admin/match-queue/route.ts` — 운영자 큐 CRUD
- `src/app/(admin)/admin/match-queue/page.tsx` — 매칭 큐 UI (운영자)
- Vitest 단위 테스트

## 도메인 컨텍스트 / 가드레일
- ADR-033: 단지명 단독 매칭 **절대 금지**. 항상 위치(좌표) + 이름 복합
- ADR-034: 3축 매칭 우선순위 ① 도로명+건축연도 → ② 좌표±200m+trigram ≥ 0.7 → ③ 행정동+지번+fuzzy → ④ 큐
- ADR-039: 임계 0.9+ 자동 / 0.7~0.9 운영자 큐 / 0.7- 차단
- `name_normalized` 정규화: NFC → 공백·특수문자 제거 → lowercase → 숫자 변환 → 약어 사전

### 동일 좌표 복수 단지 처리 (타이브레이크)
같은 좌표(±5m)에 복수의 complexes가 존재하는 경우(재건축 전·후 단지 병존 등):
- 두 단지 모두 confidence 0.5 이하로 조정 → **운영자 큐 강제 전송** (자동 매칭 금지)
- 큐 항목에 `tie_reason = 'same_coordinate'` 플래그 표시, 운영자가 건축연도·세대수 비교 후 수동 결정

### 매칭 큐 SLA 경보
- `complex_match_queue` 내 `status='pending'` AND `created_at < now() - interval '7 days'` → Sentry warning 발생
- 일배치(step10)에서 SLA 경보 체크를 포함하여, 7일 이상 미처리 큐 항목 존재 시 운영자 Resend 이메일 발송

## 작업 목록
1. `name-normalize.ts`:
   - NFC 통일
   - 공백·`-`,`()`,`,` 제거
   - `아파트` 접미사 제거
   - lowercase
   - 한자 숫자 ↔ 아라비아 숫자 변환 (`일→1, 이→2, ...`)
   - 약어 사전 (`자이→자이`, 편의상 정규 표기 유지)
   - **`src/lib/data/name-aliases.json`** — 운영자 관리 별칭 사전 (JSON 파일 방식):
     - 구조: `{ "원표기": "정규화_표기", ... }` (예: `{ "힐스테이트": "힐스테이트", "e편한세상": "e편한세상" }`)
     - 매칭 실패 시 미매칭 용어를 Sentry `captureMessage`로 자동 기록 → 운영자 주기적 검토
     - 사전 갱신: JSON 파일만 수정하는 PR (코드 변경 없음) → 배포 없이 적용
     - V1.5 이후 DB 테이블(`complex_alias_dict`)로 마이그레이션 가능 (운영자 UI 필요 시)
2. `complex-matching.ts`:
   - `matchByAddress(roadAddress, builtYear)` → exact match on complexes
   - `matchByCoordinate(lat, lng, nameRaw)` → PostGIS ST_DWithin(200m) + trigram 유사도
   - `matchByAdminCode(emdCode, jibun, nameRaw)` → fuzzy
   - `resolveMatch(candidates)` → 신뢰도 계산 + 임계 판정
   - `upsertAlias(complexId, source, aliasName, confidence)` → complex_aliases INSERT
3. `match-queue` API: GET(목록), POST(해결), DELETE(거부)
4. 운영자 매칭 큐 UI: 좌측(원본 데이터) + 우측(후보 단지 카드 2~3개) + 승인/거부 버튼
5. Vitest:
   - `nameNormalize("OO자이아파트")` → `"oo자이"`
   - `resolveMatch` 신뢰도 0.95 → 자동
   - `resolveMatch` 신뢰도 0.75 → 큐 enqueue

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과 (normalizer + resolver 단위 테스트 100%)
- [ ] 임의 단지 raw_payload 투입 → `complex_aliases`에 누적 확인
- [ ] 신뢰도 0.75 → `complex_match_queue`에 pending 레코드 생성 확인
- [ ] 운영자 큐 UI 렌더 확인 (로컬)

## Definition of Done
매칭 파이프라인 완성. step4 이후 ingest 어댑터는 이 함수를 통해 complex_id를 얻는다.
