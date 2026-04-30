# Step 4 (2-community): kapt-extra

## 목표
K-apt에서 제공하는 부대시설 데이터(주차장·승강기·경비 형태 등)를 추가 적재하고 단지 상세에 표시한다.

## 전제 (Prerequisites)
- 0-mvp step8 완료 (K-apt 관리비 ingest)

## 적용 범위 (Scope)
- `supabase/migrations/0014_facility_kapt_extra.sql` — `facility_kapt_extra` 테이블
- `src/services/kapt.ts` — 부대시설 엔드포인트 추가
- `src/components/danji/FacilityExtra.tsx`

## 데이터 모델

```sql
facility_kapt_extra
  complex_id        uuid FK PK
  parking_per_unit  numeric(4,2) NULL      -- 세대당 주차대수
  elevator_count    int NULL
  guard_type        enum(self, outsourced, unmanned, none) NULL
  heating_type      enum(district, individual, central) NULL
  has_cctv          boolean NULL
  updated_at        timestamptz DEFAULT now()
```

## 도메인 컨텍스트 / 가드레일
- K-apt 부대시설 데이터는 단지별 1건 (월별 변동 없음). `ON CONFLICT (complex_id) DO UPDATE`
- 데이터 미제공 필드는 NULL — UI에서 `-` 표시
- `data_sources`: 이미 있는 kapt 소스 재사용 (cadence=monthly)
- CRON_SECRET 가드 — 기존 kapt cron route에 함께 적재

## 작업 목록
1. `0014_facility_kapt_extra.sql` 마이그레이션
2. `kapt.ts`에 `fetchKaptExtra(kapt_code)` 추가
3. `upsertKaptExtra` — 단지 매칭(complex_aliases) + upsert
4. `FacilityExtra.tsx` — 주차·승강기·경비·난방 표 컴포넌트

## 수용 기준 (Acceptance Criteria)
- [ ] `npm run test` 통과
- [ ] 임의 단지 → `facility_kapt_extra` 레코드 1건
- [ ] 단지 상세에 부대시설 섹션 표시

## Definition of Done
K-apt 부대시설 표시 완료. 단지 상세 시설 정보 V2 완성.
