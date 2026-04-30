# Step 3 (3-extras): sgis-stats

## 목표
통계청 SGIS(공간통계 서비스)에서 창원·김해 행정동별 인구·세대 통계를 분기 적재하고 단지 상세에 인구 동향 섹션을 추가한다.

## 전제 (Prerequisites)
- 0-mvp step2 완료 (DB 스키마 — `facility_*` 패턴 익숙)
- SGIS OpenAPI 키 발급 (data.go.kr 통계청 오픈API 신청)

## 적용 범위 (Scope)
- `src/services/sgis.ts` — SGIS 통계 API 어댑터
- `supabase/migrations/0022_population_stats.sql`
- `src/components/danji/PopulationTrend.tsx`

## 데이터 모델

```sql
population_stats
  id              uuid PK
  emd_code        text NOT NULL           -- 읍면동 코드 (행정동)
  survey_year     int NOT NULL
  survey_quarter  smallint NOT NULL       -- 1~4
  total_pop       int NULL
  total_households int NULL
  age_0_14        int NULL                -- 연령별 인구 (선택)
  age_15_64       int NULL
  age_65_plus     int NULL
  updated_at      timestamptz DEFAULT now()
  UNIQUE(emd_code, survey_year, survey_quarter)
```

## 도메인 컨텍스트 / 가드레일
- SGIS API는 행정동 단위로 제공 — 단지를 행정동에 매핑하는 로직 필요 (`complexes.road_address` → 행정동 변환)
- 분기 1회 갱신. `data_sources`에 `sgis_population` 추가 (cadence=quarterly)
- CRON_SECRET 가드 필수
- 단지 상세에는 단지가 속한 읍면동의 인구·세대 추이 미니 그래프 표시
- 데이터 기준일 라벨: "통계청 SGIS (YYYY년 N분기 기준)"

## 작업 목록
1. `0022_population_stats.sql` + RLS (SELECT 전체 공개)
2. `sgis.ts`: 행정동 코드 기반 인구·세대 조회
3. 단지 → 행정동 매핑 함수 (road_address 파싱 또는 PostGIS 행정경계 교차)
4. 분기 cron + `data_source_runs` 기록
5. `PopulationTrend.tsx`: Recharts LineChart (최근 8분기 세대수·인구 추이)
6. Vitest: 어댑터 변환 + 분기 파라미터 검증

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 임의 읍면동 → `population_stats` 데이터 존재
- [ ] 단지 상세 인구 추이 차트 표시
- [ ] CRON_SECRET 검증

## Definition of Done
인구·세대 추이 통계 완성. 지역 수요 분석 인사이트 추가.
