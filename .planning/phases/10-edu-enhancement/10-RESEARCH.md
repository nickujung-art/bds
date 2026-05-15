# Phase 10: 교육 환경 고도화 - Research

**Researched:** 2026-05-15
**Domain:** PostGIS Shapefile Import, Korean School District Data, UI Component Enhancement
**Confidence:** HIGH

---

## Summary

Phase 10은 세 개의 독립적인 작업 영역으로 구성된다:

**영역 1 (EDU-01, HIGH complexity):** 학구도 Shapefile → PostGIS import 파이프라인. 3개의 Shapefile(초/중/고)을 EPSG:5186(Korea 2000 Central Belt 2010)에서 WGS84(EPSG:4326)로 변환하여 PostGIS `school_districts` 테이블에 적재한 후, `ST_Within()` 공간 조인으로 각 단지의 배정학교를 찾아 `facility_school.is_assignment`를 업데이트한다. ogr2ogr/shp2pgsql이 설치되지 않은 환경이므로, Node.js + 수동 SHP 파싱 + SQL WKT 생성 방식으로 대체한다.

**영역 2 (EDU-02, LOW complexity):** `facility_poi` 테이블의 `category='daycare'` 행 중 `poi_name LIKE '%유치원%'`로 유치원을 분리한다. DB 마이그레이션 없이 쿼리/표시 로직만 변경한다.

**영역 3 (EDU-03~05, MEDIUM complexity):** `EducationCard.tsx` UI 개선 — 학원 펼치기/접기, 시·군 단위 백분위, 도보 시간 색깔 아이콘, 학원 카테고리 태그.

**Primary recommendation:** Wave 0에서 DB 마이그레이션(`school_districts` 테이블 + RLS)과 RED 테스트를 설정하고, Wave 1에서 Shapefile import 스크립트를 실행하며, Wave 2에서 UI 개선을 병렬 진행한다.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| EDU-01 | 배정학교 표시 — 학구도 shapefile(초/중/고) PostGIS import + ST_Within 매핑 + facility_school.is_assignment 플래그 업데이트 + UI에서 배정학교 강조/구분 표시 | school_districts 테이블 설계, Node.js SHP 파싱, ST_Transform(5186→4326), ST_Within 공간 조인, is_assignment UPDATE SQL |
| EDU-02 | 어린이집/유치원 분리 표시 — facility_poi.poi_name 기반 유치원 분리 + 어린이집 3개·유치원 3개 각각 표시 | 현재 daycare 7,840건 중 유치원 903건 확인, poi_name LIKE '%유치원%' 필터 |
| EDU-03 | 학원 UX 개선 — "외 N개" 클릭 시 전체 목록 펼치기 + 시군구 단위 상위 X% 라벨 | complexes.si 컬럼 활용, hagwon_score_percentile 함수 확장 또는 si 파라미터 추가 |
| EDU-04 | 학교 도보 시간 색깔 아이콘 — distance_m÷67 + 10분 이내(녹색)/10~15분(노랑)/15분 초과(빨강) | fmtWalk() 이미 구현됨, 색상 클래스만 추가 |
| EDU-05 | 학원 종류별 분류 표시 — poi_name 파싱으로 수학/영어/예체능 등 카테고리 태그 | 실제 poi_name 샘플 분석 기반 키워드 규칙 설계 |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Shapefile → PostGIS import | Script (Node.js) | Database | 1회성 배치 작업. 서버 컴포넌트 접근 불필요 |
| ST_Within 공간 조인 | Database (RPC/SQL) | — | PostGIS 연산은 DB 레이어에서. 636개 단지 × 234개 폴리곤 조인 |
| is_assignment 업데이트 | Script (Node.js) | Database | 배치 스크립트가 service role로 UPDATE |
| 유치원/어린이집 분리 쿼리 | API/서버 컴포넌트 | — | getComplexFacilityEdu()에서 분기 처리 |
| 학원 펼치기/접기 UI | Client Component | — | useState 사용, EducationCard.tsx 내부 |
| 시·군 단위 백분위 | Database (RPC) | API | hagwon_score_percentile 함수 확장 |
| 도보 시간 색깔 | Client Component | — | 순수 UI 로직. fmtWalk() 이미 있음 |
| 학원 카테고리 분류 | Client Component 또는 유틸 | — | poi_name 기반 순수 함수 |

---

## Standard Stack

### Core (기존 프로젝트 스택, 변경 없음)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase (PostGIS) | 2.x | 학구도 폴리곤 저장 + ST_Within 쿼리 | 이미 PostGIS 활성화됨 (EPSG:5186 등록 확인) |
| TypeScript (tsx) | 5.x | import 스크립트 실행 | 기존 scripts/ 패턴 동일 |
| Vitest | 2.x | 유틸 함수 단위 테스트 | 기존 테스트 인프라 |

### Supporting (NEW — Shapefile 파싱용)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (없음 — 수동 파싱) | — | SHP/DBF 바이너리 직접 파싱 | ogr2ogr 미설치 환경. Node.js 내장 Buffer API로 충분 |

**Version verification:**

```bash
npm view shapefile version  # 0.6.6 — 선택 가능하나 직접 파싱으로 대체
npm view proj4 version      # 2.20.8 — DB ST_Transform으로 대체
```

[VERIFIED: npm registry, supabase CLI query] ogr2ogr/shp2pgsql 미설치 확인. `spatial_ref_sys`에 EPSG:5186 등록 확인. `ST_Transform(ST_SetSRID(pt, 5186), 4326)` 작동 확인.

**설치 불필요:** 기존 스택으로 모든 요구사항 충족 가능.

---

## Architecture Patterns

### System Architecture Diagram

```
[data/school-assignment/]
  통학구역/*.shp + *.dbf (EPSG:5186)
  학교학구도연계정보/*.csv (EUC-KR)
         |
         | scripts/import-school-districts.ts
         v
[Node.js 파싱]
  DBF → 창원/김해 필터 (EDU_NM 포함 '창원'|'김해')
  SHP → WKT 폴리곤 문자열 생성
  CSV → hakgudo_id → school_name 매핑
         |
         | supabase db query --linked (SQL 파일)
         v
[Supabase PostGIS DB]
  school_districts 테이블
  (hakgudo_id, school_level, school_name, geometry(Geometry,4326))
         |
         | scripts/update-assignment-flags.ts
         | ST_Within(complexes.location::geometry, school_districts.geometry)
         v
  facility_school.is_assignment = true (매칭된 학교)
         |
         v
[Next.js 서버 컴포넌트]
  getComplexFacilityEdu() 수정:
  - daycare: 유치원/어린이집 분리
  - hagwon: si 기준 백분위 함수 호출
         |
         v
[EducationCard.tsx 클라이언트 컴포넌트]
  - 배정학교 "배정" 배지 (이미 구현됨)
  - 도보 시간 색깔 아이콘 (NEW)
  - 학원 펼치기/접기 (NEW)
  - 학원 카테고리 태그 (NEW)
  - 어린이집·유치원 분리 탭 (NEW)
```

### Recommended Project Structure

```
scripts/
├── import-school-districts.ts   # NEW: SHP → SQL → school_districts 테이블
├── update-assignment-flags.ts   # NEW: ST_Within으로 is_assignment 업데이트
├── collect-facility-edu.ts      # 기존 (변경 없음)
supabase/migrations/
├── 20260515000001_school_districts.sql  # NEW: 테이블 + RLS
src/lib/data/
├── facility-edu.ts              # 수정: 유치원 분리, si별 백분위
├── facility-edu.test.ts         # NEW: 유닛 테스트
src/lib/
├── hagwon-category.ts           # NEW: poi_name → 카테고리 분류 순수 함수
├── hagwon-category.test.ts      # NEW
src/components/complex/
├── EducationCard.tsx            # 수정: 모든 EDU-02~05 UI 변경
```

### Pattern 1: Shapefile → WKT 생성 (Node.js 수동 파싱)

**What:** ogr2ogr 없이 Node.js Buffer API로 SHP/DBF를 직접 파싱하여 WKT SQL 생성

**When to use:** ogr2ogr/shp2pgsql 미설치 환경의 1회성 배치

**Example:**

```typescript
// Source: [VERIFIED: 실제 SHP 파일 바이너리 분석]
// SHP Polygon record 구조:
// offset 0: shape type (4 bytes LE = 5 for Polygon)
// offset 4: bounding box (4 × 8 bytes doubles)
// offset 36: numParts (4 bytes LE)
// offset 40: numPoints (4 bytes LE)
// offset 44: parts array (numParts × 4 bytes LE)
// offset 44 + numParts*4: points array (numPoints × 16 bytes, x then y)

function readPolygonWkt(shpBuf: Buffer, recordDataOffset: number): string {
  const shapeType = shpBuf.readInt32LE(recordDataOffset)
  if (shapeType !== 5) return ''
  const numParts = shpBuf.readInt32LE(recordDataOffset + 36)
  const numPoints = shpBuf.readInt32LE(recordDataOffset + 40)
  const partsOffset = recordDataOffset + 44
  const pointsOffset = partsOffset + numParts * 4

  const rings: string[] = []
  for (let p = 0; p < numParts; p++) {
    const partStart = shpBuf.readInt32LE(partsOffset + p * 4)
    const partEnd = p < numParts - 1
      ? shpBuf.readInt32LE(partsOffset + (p + 1) * 4)
      : numPoints
    const coords: string[] = []
    for (let i = partStart; i < partEnd; i++) {
      const x = shpBuf.readDoubleLE(pointsOffset + i * 16)
      const y = shpBuf.readDoubleLE(pointsOffset + i * 16 + 8)
      coords.push(`${x} ${y}`)
    }
    rings.push(`(${coords.join(',')})`)
  }
  return `POLYGON(${rings.join(',')})`
}

// SQL 삽입 패턴 (EPSG:5186 → 4326 변환 포함):
// ST_Transform(ST_GeomFromText(wkt, 5186), 4326)::geometry
```

### Pattern 2: DBF 파싱 (EUC-KR)

```typescript
// Source: [VERIFIED: 실제 DBF 바이너리 분석]
// DBF 헤더: bytes 0-31 (메타), field descriptors: 32바이트씩 (0x0D 터미네이터까지)
// 문자 인코딩: EUC-KR (TextDecoder('euc-kr') 필요)

const decoder = new TextDecoder('euc-kr')

function parseDbfFields(buf: Buffer): DbfField[] {
  const fields: DbfField[] = []
  let offset = 32
  const headerBytes = buf.readUInt16LE(8)
  let dataOffset = 0
  while (buf[offset] !== 0x0D && offset < headerBytes) {
    const name = buf.slice(offset, offset + 11).toString('ascii').replace(/\x00/g, '').trim()
    const length = buf[offset + 16]
    fields.push({ name, length, offset: dataOffset })
    dataOffset += length
    offset += 32
  }
  return fields
}

function readDbfField(recBuf: Buffer, field: DbfField): string {
  return decoder
    .decode(recBuf.slice(field.offset, field.offset + field.length))
    .replace(/\x00/g, '')
    .trim()
}
```

### Pattern 3: ST_Within 공간 조인 SQL

```sql
-- Source: [VERIFIED: PostGIS 쿼리 테스트 완료]
-- is_assignment 업데이트: 각 단지 위치가 학구도 폴리곤 내에 있으면 true
UPDATE facility_school fs
SET is_assignment = true
FROM complexes c
JOIN school_districts sd
  ON ST_Within(c.location::geometry, sd.geometry)
  AND sd.school_level = fs.school_type   -- elementary/middle/high 매핑
  AND (
    -- 학구도 연계 CSV로 매핑된 학교명 매칭
    sd.school_name = fs.school_name
    -- 또는: school_code 매칭 (더 신뢰성 높음)
  )
WHERE fs.complex_id = c.id
  AND c.location IS NOT NULL;
```

### Pattern 4: si 단위 학원 백분위 RPC

```sql
-- Source: [VERIFIED: 기존 hagwon_score_percentile 함수 확인 + complexes.si 컬럼 확인]
-- 새 함수: si 파라미터 추가
CREATE OR REPLACE FUNCTION public.hagwon_score_percentile_by_si(
  target_score integer,
  p_si         text   -- '창원시' | '김해시'
)
RETURNS double precision
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE hagwon_score < target_score)::double precision
    / NULLIF(COUNT(*) FILTER (WHERE hagwon_score IS NOT NULL), 0)
  FROM public.complexes
  WHERE si = p_si;
$$;
```

### Pattern 5: 학원 카테고리 분류 (poi_name 파싱)

```typescript
// Source: [VERIFIED: 실제 poi_name 샘플 30건 분석]
// 실제 학원명 예시: '엠투에스수학1지구학원', '빨간펜수학의달인', '에이든영어학원',
//                   '미나한아트미술스튜디오', '차이랑중국어학원', '율하IT컴퓨터학원'

type HagwonCategory = '수학' | '영어' | '예체능' | '국어' | '과학' | '중국어/일어' | '기타'

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: HagwonCategory }> = [
  { keywords: ['수학', '수능수학', '연산', '수과학'], category: '수학' },
  { keywords: ['영어', '어학', '영수', 'English', 'EFL'], category: '영어' },
  { keywords: ['미술', '아트', '미대', '공예', '피아노', '음악', '체육', '태권도', '무용', '발레', '수영'], category: '예체능' },
  { keywords: ['국어', '논술', '독서', '글쓰기', '문해'], category: '국어' },
  { keywords: ['과학', '화학', '물리', '생물', 'STEM'], category: '과학' },
  { keywords: ['중국어', '일어', '일본어', '한자'], category: '중국어/일어' },
]

export function classifyHagwon(poiName: string): HagwonCategory {
  for (const { keywords, category } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => poiName.includes(kw))) return category
  }
  return '기타'
}
```

### Anti-Patterns to Avoid

- **단지명 단독 매칭:** `school_districts`와 `facility_school`을 학교명만으로 JOIN하면 동명 학교 충돌. 반드시 `school_level`도 함께 매칭. [VERIFIED: CLAUDE.md 규칙]
- **전국 Shapefile 전부 import:** 7,123개 폴리곤을 전부 적재하면 테이블 크기 및 쿼리 성능 낭비. 창원/김해만 필터링 (초등 200개 + 중등 31개 + 고등 3개 = 234개). [VERIFIED: DBF 파싱]
- **클라이언트에서 직접 Supabase 쿼리:** EducationCard.tsx는 `'use client'` 컴포넌트. 데이터는 서버 컴포넌트에서 fetch하여 props로 전달. [VERIFIED: CLAUDE.md Critical 규칙]
- **하드코딩된 Si 판별:** sgg_code로 분기하지 말고 `complexes.si` 컬럼 활용 (이미 '창원시'/'김해시'로 채워진 것 확인). [VERIFIED: supabase CLI query]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EPSG 좌표 변환 | 직접 변환 수식 구현 | PostGIS `ST_Transform(geom, 5186, 4326)` | DB에 EPSG:5186 등록됨. 서버에서 변환하면 정확도 보장 |
| 폴리곤-포인트 포함 여부 | Ray casting 직접 구현 | PostGIS `ST_Within()` | 경계 케이스, 안티메리디안 등 엣지 케이스 처리됨 |
| 학교명 정규화/매칭 | 자체 퍼지 매칭 | CSV의 정확한 school_name + facility_school 비교 | 학교명은 CSV에 이미 정규화됨 |
| Shapefile CLI 도구 | `child_process.execSync('ogr2ogr ...')` | Node.js Buffer API 직접 파싱 | ogr2ogr 미설치. 234개 폴리곤 수준에서 수동 파싱이 더 단순 |

**Key insight:** 공간 조인은 무조건 PostGIS가 처리해야 한다. 634개 복합단지 × 234개 폴리곤 = 148,356번의 포인트-폴리곤 테스트를 JS에서 하면 매우 느리고 버그 위험이 높다.

---

## Runtime State Inventory

> Rename/refactor/migration 아님 — 이 섹션은 해당 없음.

해당 없음 — Phase 10은 그린필드 기능 추가 (신규 테이블 + 기존 컬럼 업데이트). 기존 문자열 rename 없음.

---

## Common Pitfalls

### Pitfall 1: 고등학교 Shapefile에 SGG_CD 컬럼 없음

**What goes wrong:** 고등학교학교군.shp의 DBF에는 `SGG_CD` 컬럼이 없다 (초등/중등에는 있음). SGG_CD로 필터링하는 코드를 고등학교에도 적용하면 오류.

**Why it happens:** 고등학교 학군은 광역(시도 단위) 배정이라 시군구 세분화가 없음.

**How to avoid:** 고등학교 필터링은 `EDU_NM LIKE '%창원%' OR EDU_NM LIKE '%김해%'`로 처리. [VERIFIED: DBF 파싱으로 확인]

**Warning signs:** 고등학교 필터 결과가 0건이면 SGG_CD 필터를 잘못 적용한 것.

### Pitfall 2: 다수 학교 매핑된 학구도 (68개)

**What goes wrong:** CSV에서 1개의 HAKGUDO_ID가 여러 학교에 매핑된다 (초등 50개, 중등 15개, 고등 3개). ST_Within으로 폴리곤을 찾았을 때 `school_name`이 여러 개라면 어떤 것을 배정학교로 설정할지 모호함.

**Why it happens:** 학구 경계가 복수 학교의 통학구역이 겹치는 지역이거나, 학군 내 복수 학교.

**How to avoid:** `school_districts` 테이블에 school_name을 배열 또는 1:N 관계로 저장. 조인 시 `facility_school.school_name = ANY(sd.school_names)` 또는 별도 매핑 테이블 사용. [VERIFIED: CSV 분석]

**Warning signs:** is_assignment가 한 단지에서 같은 학교급 내 2개 이상 true로 설정되면 이상. (정상 범위: 초등 1개, 중등 1개, 고등 1~2개)

### Pitfall 3: 좌표계 혼동 (EPSG:5186 ↔ WGS84)

**What goes wrong:** SHP 파일 좌표는 EPSG:5186(미터 단위, X~100k-550k, Y~100k-700k). WGS84 좌표(도 단위, 126-129E, 33-37N)와 혼용하면 ST_Within이 항상 false 반환.

**Why it happens:** PRJ 파일을 읽지 않고 좌표를 WGS84로 착각.

**How to avoid:** SQL에서 반드시 `ST_GeomFromText(wkt, 5186)` 후 `ST_Transform(..., 4326)` 적용. DB 삽입 시 geometry SRID를 4326으로 저장. [VERIFIED: PRJ 파일 분석 + 좌표 변환 테스트]

**Warning signs:** 변환 후 위도가 34-36 범위이고 경도가 127-129 범위이면 정상. 그 외 값이면 좌표계 오류.

### Pitfall 4: SQL 크기 제한

**What goes wrong:** 초등학교 창원+김해 200개 폴리곤의 WKT 크기 예상치 ~1.8MB. `supabase db query --linked`의 단일 쿼리 크기 제한 초과 가능.

**Why it happens:** WKT는 폴리곤 꼭짓점마다 좌표쌍 텍스트가 필요. 평균 270점 × 35바이트 = 9,450바이트/폴리곤.

**How to avoid:** SQL 파일을 학교급별(초/중/고)로 분리하거나 50개 단위 배치. `--file` 옵션으로 파일 직접 실행. [VERIFIED: 기존 collect-facility-edu.ts flushToDb 패턴 참조]

### Pitfall 5: 유치원-어린이집 poi_name 경계 케이스

**What goes wrong:** `poi_name LIKE '%유치원%'` 필터에서 "병설유치원"(초등학교 부설), "유치원교습소" 등이 포함. 어린이집 이름에 "유치원" 포함된 경우 역 분류.

**Why it happens:** 카카오맵 카테고리(PS3)가 유치원+어린이집을 혼합으로 반환.

**How to avoid:** 필터 우선순위: `poi_name LIKE '%유치원%' OR poi_name LIKE '%병설%유치원%'` → 유치원; 나머지 → 어린이집. [VERIFIED: facility_poi 7,840건 중 유치원 903건 확인]

### Pitfall 6: school_type 매핑 (문자열 vs enum)

**What goes wrong:** CSV의 `학교급구분` = '초등학교'/'중학교'/'고등학교'. `facility_school.school_type` = 'elementary'/'middle'/'high'. 직접 비교하면 불일치.

**How to avoid:** school_districts 테이블의 `school_level` 컬럼을 처음부터 'elementary'/'middle'/'high' enum으로 저장. import 스크립트에서 변환. [VERIFIED: facility.sql 스키마 확인]

---

## Code Examples

Verified patterns from codebase:

### facility_school 기존 스키마
```sql
-- Source: supabase/migrations/20260430000004_facility.sql [VERIFIED]
create table public.facility_school (
  id              uuid primary key default gen_random_uuid(),
  complex_id      uuid not null references public.complexes(id) on delete cascade,
  school_name     text not null,
  school_type     text not null check (school_type in ('elementary', 'middle', 'high')),
  school_code     text,
  distance_m      integer,
  is_assignment   boolean not null default false,
  -- UNIQUE(complex_id, school_name) 이미 추가됨 (20260514000003_facility_edu.sql)
);
```

### complexes.location 타입 및 사용
```sql
-- Source: supabase/migrations/20260430000002_complexes.sql [VERIFIED]
-- location은 geography(Point, 4326) generated column
-- ST_Within과 함께 사용 시 geometry cast 필요:
-- complexes.location::geometry
-- 단, ST_Within은 geography 타입으로도 동작함 (PostGIS 2.5+)
```

### school_districts 테이블 설계 (신규)
```sql
-- Source: [ASSUMED pattern based on district_stats migration] [VERIFIED: PostGIS 지원 확인]
CREATE TABLE public.school_districts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hakgudo_id   text NOT NULL,             -- SHP HAKGUDO_ID (Z000xxxxx)
  school_level text NOT NULL CHECK (school_level IN ('elementary', 'middle', 'high')),
  geometry     geometry(Geometry, 4326) NOT NULL, -- ST_Transform 후 저장
  source_file  text,                      -- 'elementary'|'middle'|'high' (추적용)
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 학구도-학교 연계 (N:M — 1 학구도에 여러 학교 가능)
CREATE TABLE public.school_district_schools (
  district_id  uuid NOT NULL REFERENCES public.school_districts(id) ON DELETE CASCADE,
  school_name  text NOT NULL,
  school_level text NOT NULL,
  PRIMARY KEY (district_id, school_name)
);

-- 공간 인덱스 필수
CREATE INDEX school_districts_geometry_idx ON public.school_districts USING GIST (geometry);
```

### ST_Within 업데이트 쿼리
```sql
-- Source: [VERIFIED: PostGIS ST_Within 쿼리 테스트]
-- is_assignment 업데이트 패턴
UPDATE public.facility_school fs
SET    is_assignment = true,
       updated_at    = now()
FROM   public.complexes c
JOIN   public.school_district_schools sds ON sds.school_name = fs.school_name
JOIN   public.school_districts sd
         ON sd.id = sds.district_id
         AND sd.school_level = fs.school_type
WHERE  fs.complex_id = c.id
  AND  c.location IS NOT NULL
  AND  ST_Within(c.location::geometry, sd.geometry);
```

### getComplexFacilityEdu 수정 패턴
```typescript
// Source: src/lib/data/facility-edu.ts [VERIFIED]
// 유치원 분리: allPois에서 filter로 처리
const kindergartens = allPois
  .filter(p => p.category === 'daycare' && (
    p.poi_name.includes('유치원') || p.poi_name.includes('병설')
  ))
  .map(p => ({ poi_name: p.poi_name, distance_m: p.distance_m }))

const daycares = allPois
  .filter(p => p.category === 'daycare' && !(
    p.poi_name.includes('유치원') || p.poi_name.includes('병설')
  ))
  .map(p => ({ poi_name: p.poi_name, distance_m: p.distance_m }))
```

### 도보 시간 색상 유틸
```typescript
// Source: EducationCard.tsx fmtWalk() 참조 [VERIFIED]
// 도보 67m/분 기준 (이미 fmtWalk()에 구현됨)
type WalkColor = 'green' | 'yellow' | 'red'

function walkColor(distanceM: number | null): WalkColor {
  if (distanceM == null) return 'green'
  const min = distanceM / 67
  if (min <= 10) return 'green'
  if (min <= 15) return 'yellow'
  return 'red'
}

const WALK_COLOR_STYLE: Record<WalkColor, string> = {
  green:  '#16a34a',  // Tailwind green-600
  yellow: '#d97706',  // Tailwind amber-600
  red:    '#dc2626',  // Tailwind red-600
}
```

### 학원 펼치기/접기 패턴
```typescript
// Source: 기존 HagwonSection 컴포넌트 패턴 참조 [VERIFIED]
// HagwonSection에 expanded state 추가
function HagwonSection({ hagwons, stats }: HagwonSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const INITIAL_LIMIT = 8
  const visibleHagwons = expanded ? hagwons : hagwons.slice(0, INITIAL_LIMIT)

  return (
    <div>
      {/* ... 기존 렌더링 ... */}
      {visibleHagwons.map(...)}
      {hagwons.length > INITIAL_LIMIT && (
        <button onClick={() => setExpanded(v => !v)}>
          {expanded ? '접기' : `외 ${hagwons.length - INITIAL_LIMIT}개 더보기`}
        </button>
      )}
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ogr2ogr + psql pipe | Node.js 수동 파싱 + supabase CLI | Phase 10 (ogr2ogr 미설치) | 의존성 없음, 스크립트 자체 완결 |
| 창원+김해 통합 백분위 | si 단위 백분위 | Phase 10 | 지역 특성 반영한 정확한 학원 밀도 비교 |
| daycare 혼합 10개 | 어린이집 3개·유치원 3개 분리 | Phase 10 | 정보 명확성 향상 |

**Deprecated/outdated:**
- `hagwon_score_percentile()` (파라미터 없음): si 파라미터 추가 버전으로 대체 또는 보완

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 고등학교학교군 창원 2개, 김해 1개 = 총 3개 폴리곤으로 is_assignment 매핑이 가능 | EDU-01 | 고등학교 배정 표시가 부정확할 수 있음. 고등학교는 평준화로 학군 내 복수 학교 배정이 일반적 |
| A2 | facility_school의 school_name이 CSV의 학교명과 동일한 포맷 (예: "수남초등학교") | EDU-01 | school_name 불일치 시 JOIN 결과 0건. 실제 데이터 비교 필요 |
| A3 | `supabase db query --linked --file` 명령이 1.8MB SQL 파일을 처리 가능 | EDU-01 | 크기 제한 초과 시 배치 분할 필요 |
| A4 | poi_name LIKE '%유치원%' 필터가 실제 유치원을 충분히 포착 (어린이집 오분류 최소) | EDU-02 | 유치원/어린이집 혼용 시 표시 오류. 수동 검증 필요 |

**항목 A2는 실행 전 반드시 검증 필요:** scripts/import-school-districts.ts에서 CSV 학교명과 facility_school.school_name을 대조하는 dry-run 출력을 포함해야 한다.

---

## Open Questions

1. **고등학교 배정 정책**
   - What we know: 창원+김해 고등학교 학군 폴리곤 3개. 각 폴리곤 내 복수 고등학교 포함.
   - What's unclear: 복수 학교 중 어느 학교를 "배정"으로 표시할지. 평준화 지역은 추첨/선택이므로 배정이 아님.
   - Recommendation: 고등학교는 is_assignment를 업데이트하지 않거나, "학군 내" 배지로 표현을 변경. 플래너가 요구사항 명확화 필요.

2. **초등학교 다중 배정 학구 50건**
   - What we know: CSV에서 1개 HAKGUDO_ID에 2개 이상 초등학교 매핑 50건.
   - What's unclear: 이런 경우 단지가 어떤 학구도 폴리곤에 위치하는지, 두 학교 모두 배정인지.
   - Recommendation: ST_Within으로 단지가 속한 폴리곤의 school_names를 전부 is_assignment=true로 설정. 이중 배정 지역이면 실제로 두 학교가 모두 가능.

3. **school_name 정규화 불일치 가능성**
   - What we know: facility_school.school_name은 카카오맵 API에서 수집 (예: "수남초등학교"). CSV school_name도 동일 형식.
   - What's unclear: 학교 공식명과 카카오맵 표시명이 다를 경우 JOIN 실패.
   - Recommendation: import 스크립트에서 dry-run 시 불일치 목록 출력. 불일치 비율이 낮으면 school_code(B000xxxxx) 기반 매핑도 검토.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | SHP 파싱 스크립트 | ✓ | v24.14.0 | — |
| supabase CLI | DB 쿼리/마이그레이션 | ✓ | 2.95.4 | — |
| PostGIS ST_Transform | EPSG:5186→4326 변환 | ✓ | EPSG:5186 등록 확인 | — |
| PostGIS ST_Within | 공간 조인 | ✓ | 테스트 완료 | — |
| ogr2ogr (GDAL) | Shapefile 변환 CLI | ✗ | — | Node.js Buffer API 직접 파싱 |
| shp2pgsql | Shapefile → SQL | ✗ | — | Node.js Buffer API 직접 파싱 |
| proj4 (npm) | 좌표 변환 | ✗ (미설치) | — | DB ST_Transform |
| TextDecoder('euc-kr') | DBF EUC-KR 디코딩 | ✓ | Node.js v18+ 내장 | — |

**Missing dependencies with no fallback:** 없음.

**Missing dependencies with fallback:** ogr2ogr, shp2pgsql → Node.js 수동 파싱으로 대체 확인.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x |
| Config file | `vitest.config.ts` |
| Quick run command | `npm run test -- --reporter=dot` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| EDU-01 | is_assignment 플래그 업데이트 로직 | unit (스크립트 유틸) | `npm run test -- facility-edu` | ❌ Wave 0 |
| EDU-02 | 유치원/어린이집 분리 필터 | unit | `npm run test -- facility-edu` | ❌ Wave 0 |
| EDU-03 | hagwon_score_percentile_by_si 입력/출력 | unit (mock) | `npm run test -- facility-edu` | ❌ Wave 0 |
| EDU-04 | walkColor() 3단계 경계값 | unit | `npm run test -- hagwon-category` | ❌ Wave 0 |
| EDU-05 | classifyHagwon() 키워드 매핑 | unit | `npm run test -- hagwon-category` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test -- --reporter=dot`
- **Per wave merge:** `npm run test` (전체)
- **Phase gate:** Full suite green + `npm run build` 통과 후 `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `src/lib/data/facility-edu.test.ts` — EDU-01/02/03 covers
- [ ] `src/lib/hagwon-category.test.ts` — EDU-04/05 covers
- [ ] `src/lib/hagwon-category.ts` — classifyHagwon(), walkColor() 순수 함수

*(no new framework install needed — Vitest already configured)*

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes | school_districts RLS: public read, service role write |
| V5 Input Validation | yes | import 스크립트: school_name 길이 검증, WKT 유효성 확인 |
| V6 Cryptography | no | — |

### Known Threat Patterns for This Phase

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SQL Injection (WKT 문자열) | Tampering | WKT는 import 스크립트가 직접 생성 (외부 입력 없음). school_name은 CSV에서만 읽음. |
| 학교 배정 데이터 오염 | Tampering | is_assignment 업데이트는 service role 스크립트만 수행. RLS로 일반 사용자 쓰기 차단. |

---

## Project Constraints (from CLAUDE.md)

- **CRITICAL:** 모든 외부 API 호출은 `src/services/` 어댑터에서만. 이 Phase는 외부 API 없음 (로컬 파일 파싱).
- **CRITICAL:** Supabase 쿼리는 서버 컴포넌트 또는 API Route에서만. EducationCard.tsx('use client')에 직접 쿼리 추가 금지.
- **CRITICAL:** RLS 정책 필수 — school_districts 테이블에 RLS 명시 필요.
- **CRITICAL:** complexes 골든 레코드 — school 매칭 시 단지명 단독 매칭 절대 금지. 단지 조회는 항상 location 기반.
- **AI 슬롭 금지:** backdrop-blur, gradient-text, glow, 보라/인디고 브랜드색, gradient orb — EducationCard.tsx 개선 시에도 동일 적용.
- 커밋 전 `npm run lint && npm run build && npm run test` 통과 필수.
- 'use client' 최소화 — EducationCard.tsx는 이미 'use client'. 추가 분리 불필요.

---

## Sources

### Primary (HIGH confidence)
- `data/school-assignment/통학구역/*.dbf` — 직접 바이너리 파싱, 필드 구조 확인 [VERIFIED]
- `data/school-assignment/통학구역/*.prj` — EPSG:5186 좌표계 확인 [VERIFIED]
- `data/school-assignment/학교학구도연계정보/*.csv` — EUC-KR 디코딩, 창원/김해 행 수 확인 [VERIFIED]
- `supabase db query --linked` — complexes.location 타입, sgg_code 분포, PostGIS ST_Within/ST_Transform 동작, EPSG:5186 spatial_ref_sys 등록 [VERIFIED]
- `supabase/migrations/20260430000004_facility.sql` — facility_school 스키마 [VERIFIED]
- `supabase/migrations/20260430000002_complexes.sql` — complexes.location geography(Point,4326) [VERIFIED]
- `supabase/migrations/20260514000003_facility_edu.sql` — UNIQUE 제약 + hagwon_score_percentile [VERIFIED]
- `src/lib/data/facility-edu.ts` — getComplexFacilityEdu() 현재 구현 [VERIFIED]
- `src/components/complex/EducationCard.tsx` — 현재 UI 구조 [VERIFIED]
- `CLAUDE.md` — 프로젝트 제약 [VERIFIED]

### Secondary (MEDIUM confidence)
- PostGIS ST_Transform 좌표 변환 테스트 (DB 실행) — 창원 좌표 변환 정확성 확인 [VERIFIED: supabase query]

### Tertiary (LOW confidence)
- 해당 없음

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — 기존 스택 그대로, 신규 npm 패키지 없음
- Architecture: HIGH — 실제 DB/파일 분석 기반, PostGIS 쿼리 테스트 완료
- Pitfalls: HIGH — 실제 데이터 분석으로 발견 (고등학교 SGG_CD 없음, 다중 학교 매핑 등)
- EDU-03~05 UI: HIGH — 기존 코드 분석 완료, 변경 범위 명확

**Research date:** 2026-05-15
**Valid until:** 2026-07-15 (데이터 출처 안정적, 빠른 변동 없음)
