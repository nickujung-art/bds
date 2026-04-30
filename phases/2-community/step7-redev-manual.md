# Step 7 (2-community): redev-manual

## 목표
재건축 단계 정보를 운영자가 어드민에서 수동 입력하고, 단지 상세에 진행 타임라인으로 표시한다. ADR-036·ADR-041.

## 전제 (Prerequisites)
- 0-mvp step16 완료 (어드민 + complexes CRUD)
- `complexes.predecessor_id`, `complexes.successor_id` FK 스키마 존재 확인

## 적용 범위 (Scope)
- `supabase/migrations/0017_redevelopment.sql` — `redevelopment_projects` 테이블
- `src/app/(admin)/admin/complexes/redevelopment/` — 재건축 프로젝트 관리 어드민
- `src/components/danji/RedevTimeline.tsx`

## 데이터 모델

```sql
redevelopment_projects
  id                  uuid PK
  old_complex_id      uuid FK REFERENCES complexes(id)   -- predecessor
  new_complex_id      uuid FK NULL REFERENCES complexes(id)  -- successor (신축 완공 후)
  current_stage       enum(planning, approval, demolition, construction, completion)
  stage_updated_at    timestamptz DEFAULT now()
  estimated_completion date NULL
  notes               text NULL
  -- 자기참조 방지: CHECK(old_complex_id != new_complex_id)
```

## 도메인 컨텍스트 / 가드레일
- ADR-036: `complexes.predecessor_id → successor_id` self-FK 양방향. 재건축 사업장은 `redevelopment_projects`로 단계 추적
- ADR-041: V1.5는 운영자 수동 입력. 창원시·김해시 행정 데이터 자동 적재는 V2 보류
- `old_complex_id`와 `new_complex_id`가 동일하면 안 됨 → `CHECK` 제약
- `complexes.status = 'in_redevelopment'` 단지: 실거래 그래프 + AI 추정 모두 표시하되 "재건축 진행 중" 배너 표시
- 모든 재건축 데이터 mutation → `audit_logs` 필수

## 작업 목록
1. `0017_redevelopment.sql` + RLS (SELECT 전체, INSERT/UPDATE service_role)
2. 어드민 재건축 프로젝트 폼: old_complex 검색 + stage 선택 + 완공 예정일
3. `complexes` 편집 시 predecessor/successor FK 양방향 동기화 (트랜잭션)
4. `RedevTimeline.tsx`: 5단계 진행 표시자 + 현재 단계 강조
5. 단지 상세에 재건축 섹션 삽입 (in_redevelopment 상태일 때만)
6. Vitest: self-FK CHECK 위반 케이스 + 양방향 동기화 단위 테스트

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 어드민에서 재건축 프로젝트 등록 → 단지 상세 타임라인 표시
- [ ] old/new complex_id 동일 시 → 오류 반환
- [ ] mutation → audit_logs 기록

## Definition of Done
재건축 타임라인 완성. 재건축 관심 사용자의 핵심 정보 제공.
