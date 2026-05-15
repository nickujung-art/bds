# Phase 10: 교육 환경 고도화 - Pattern Map

**Mapped:** 2026-05-15
**Files analyzed:** 7 (5 new/modified + 2 new test files)
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `supabase/migrations/20260515000001_school_districts.sql` | migration | batch | `supabase/migrations/20260508000001_district_stats.sql` | exact |
| `scripts/import-school-districts.ts` | utility/script | file-I/O → batch | `scripts/collect-facility-edu.ts` | role-match |
| `src/lib/data/facility-edu.ts` (수정) | service | request-response | 자기 자신 (현재 파일) | exact |
| `src/components/complex/EducationCard.tsx` (수정) | component | request-response | 자기 자신 (현재 파일) | exact |
| `src/lib/hagwon-category.ts` | utility | transform | `src/lib/format.ts` | role-match |
| `src/lib/data/facility-edu.test.ts` | test | — | `src/lib/data/gap-label.test.ts` | exact |
| `src/lib/hagwon-category.test.ts` | test | — | `src/lib/data/gap-label.test.ts` | exact |

---

## Pattern Assignments

### `supabase/migrations/20260515000001_school_districts.sql` (migration, batch)

**Analog:** `supabase/migrations/20260508000001_district_stats.sql`

**Core table + index + RLS pattern** (lines 1-28):
```sql
create table public.district_stats (
  id           uuid primary key default gen_random_uuid(),
  adm_cd       text not null,
  -- ... columns ...
  unique (adm_cd, data_year, data_quarter)
);

create index district_stats_si_gu_idx on public.district_stats(si, gu);

alter table public.district_stats enable row level security;

create policy "district_stats: public read"
  on public.district_stats for select using (true);

create policy "district_stats: service role write"
  on public.district_stats for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

**Apply to `school_districts`:**
- 테이블 정의는 RESEARCH.md Pattern "school_districts 테이블 설계"와 동일 구조 사용
- RLS는 `district_stats`와 동일: public read + service_role write
- 공간 인덱스 추가: `USING GIST (geometry)` (PostGIS 전용)
- `school_district_schools` 연결 테이블에도 동일 RLS 패턴 적용

**기존 facility_school 스키마 참조** (`supabase/migrations/20260430000004_facility.sql` lines 1-18):
```sql
create table public.facility_school (
  id              uuid primary key default gen_random_uuid(),
  complex_id      uuid not null references public.complexes(id) on delete cascade,
  school_name     text not null,
  school_type     text not null check (school_type in ('elementary', 'middle', 'high')),
  school_code     text,
  distance_m      integer,
  is_assignment   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index facility_school_complex_id_idx on public.facility_school(complex_id);
```

**hagwon_score_percentile 함수 패턴** (`supabase/migrations/20260514000003_facility_edu.sql` lines 19-28):
```sql
CREATE OR REPLACE FUNCTION public.hagwon_score_percentile(target_score integer)
RETURNS double precision
LANGUAGE sql STABLE
AS $$
  SELECT
    COUNT(*) FILTER (WHERE hagwon_score < target_score)::double precision
    / NULLIF(COUNT(*) FILTER (WHERE hagwon_score IS NOT NULL), 0)
  FROM public.complexes;
$$;
```
`hagwon_score_percentile_by_si` 신규 함수도 이 패턴을 복사하고 `WHERE si = p_si` 조건만 추가한다.

---

### `scripts/import-school-districts.ts` (utility/script, file-I/O → batch)

**Analog:** `scripts/collect-facility-edu.ts`

**파일 헤더 + env 로드 패턴** (lines 1-36):
```typescript
/**
 * 교육 시설 카카오 로컬 카테고리 검색으로 배치 수집
 *
 * 실행:
 *   npx tsx scripts/collect-facility-edu.ts
 *   npx tsx scripts/collect-facility-edu.ts --dry-run
 */
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.replace(/\r$/, '')
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    const key = m?.[1]; const val = m?.[2]
    if (key && val !== undefined && !process.env[key]) process.env[key] = val.replace(/^"|"$/g, '')
  }
}

const DRY_RUN = process.argv.includes('--dry-run')
```

**supabase CLI 쿼리 실행 패턴** (lines 104-113):
```typescript
function fetchComplexes(): ComplexRow[] {
  const query = `SELECT id, lat, lng, si FROM complexes WHERE lat IS NOT NULL ...`
  const raw = execSync(
    `supabase db query --linked ${JSON.stringify(query)}`,
    { encoding: 'utf8' },
  )
  const match = raw.match(/"rows"\s*:\s*(\[[\s\S]*?\])/)
  if (!match?.[1]) throw new Error('단지 조회 실패: rows 파싱 불가')
  return JSON.parse(match[1]) as ComplexRow[]
}
```

**SQL 파일 생성 + execSync flush 패턴** (lines 192-211):
```typescript
function flushToDb(label: string) {
  if (DRY_RUN) { /* buf 초기화만 */ return }
  const parts: string[] = []
  if (dedupedSchool.length) parts.push(buildSchoolSql(dedupedSchool))
  // ...
  const tmpPath = path.join(process.cwd(), 'data', '_edu_flush.sql')
  fs.writeFileSync(tmpPath, parts.join('\n\n'), 'utf8')
  execSync(`supabase db query --linked --file "${tmpPath}"`, { stdio: 'inherit' })
  fs.unlinkSync(tmpPath)
}
```

**SQL 이스케이프 헬퍼** (line 118):
```typescript
function esc(s: string): string {
  return s.replace(/'/g, "''")
}
```

**에러 처리 + main 진입점 패턴** (lines 252-276):
```typescript
} catch (e) {
  console.error(`\n  오류 (${cx.id}): ${e instanceof Error ? e.message : e}`)
}

main().catch(err => {
  console.error('[edu-collect] 치명적 오류:', err)
  process.exit(1)
})
```

**import-school-districts.ts 전용 추가 패턴 (RESEARCH.md):**

SHP 레코드 파싱 (RESEARCH.md Pattern 1):
```typescript
function readPolygonWkt(shpBuf: Buffer, recordDataOffset: number): string {
  const shapeType = shpBuf.readInt32LE(recordDataOffset)
  if (shapeType !== 5) return ''
  const numParts  = shpBuf.readInt32LE(recordDataOffset + 36)
  const numPoints = shpBuf.readInt32LE(recordDataOffset + 40)
  const partsOffset  = recordDataOffset + 44
  const pointsOffset = partsOffset + numParts * 4
  const rings: string[] = []
  for (let p = 0; p < numParts; p++) {
    const partStart = shpBuf.readInt32LE(partsOffset + p * 4)
    const partEnd   = p < numParts - 1
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
```

DBF EUC-KR 파싱 (RESEARCH.md Pattern 2):
```typescript
const decoder = new TextDecoder('euc-kr')

function parseDbfFields(buf: Buffer): DbfField[] {
  const fields: DbfField[] = []
  let offset = 32
  const headerBytes = buf.readUInt16LE(8)
  let dataOffset = 0
  while (buf[offset] !== 0x0D && offset < headerBytes) {
    const name   = buf.slice(offset, offset + 11).toString('ascii').replace(/\x00/g, '').trim()
    const length = buf[offset + 16]
    fields.push({ name, length, offset: dataOffset })
    dataOffset += length
    offset += 32
  }
  return fields
}
```

SQL INSERT 패턴 (ST_Transform 포함):
```sql
INSERT INTO public.school_districts (hakgudo_id, school_level, geometry, source_file)
VALUES
  ('Z000xxxxx', 'elementary',
   ST_Transform(ST_GeomFromText('POLYGON(...)', 5186), 4326),
   'elementary')
ON CONFLICT DO NOTHING;
```

---

### `src/lib/data/facility-edu.ts` (service, request-response) — 수정

**Analog:** 자기 자신 (현재 파일 전체를 수정)

**현재 imports + 타입 패턴** (lines 1-28):
```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export interface SchoolItem {
  school_name:   string
  school_type:   'elementary' | 'middle' | 'high'
  distance_m:    number | null
  is_assignment: boolean
}

export interface PoiItem {
  poi_name:   string
  distance_m: number | null
}

export interface HagwonStats {
  cnt500:     number
  cnt1000:    number
  rawScore:   number
  percentile: number
  grade:      'A' | 'B' | 'C' | 'D'
}

export interface FacilityEduData {
  schools:     SchoolItem[]
  hagwons:     PoiItem[]
  daycares:    PoiItem[]
  kindergartens: PoiItem[]   // NEW: 유치원 분리
  hagwonStats: HagwonStats | null
}
```

**현재 Supabase 병렬 쿼리 패턴** (lines 35-55):
```typescript
const [schoolRes, poiRes, scoreRes] = await Promise.all([
  supabase
    .from('facility_school')
    .select('school_name, school_type, distance_m, is_assignment')
    .eq('complex_id', complexId)
    .order('distance_m', { ascending: true, nullsFirst: false }),
  supabase
    .from('facility_poi')
    .select('category, poi_name, distance_m')
    .eq('complex_id', complexId)
    .in('category', ['hagwon', 'daycare'])
    .order('distance_m', { ascending: true, nullsFirst: false }),
  supabase
    .from('complexes')
    .select('hagwon_score')
    .eq('id', complexId)
    .maybeSingle(),
])
```

**EDU-02 유치원/어린이집 분리 패턴** (RESEARCH.md 검증됨):
```typescript
// daycare allPois에서 필터 분기 — 기존 daycares 분기 바로 아래에 추가
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

**현재 RPC 호출 패턴** (lines 71-74) — EDU-03에서 si 파라미터 추가 시 복사:
```typescript
const percentileRes = await supabase.rpc('hagwon_score_percentile', {
  target_score: rawScore,
})
const percentile: number = (percentileRes.data as number | null) ?? 50
```
si 기반 버전: `supabase.rpc('hagwon_score_percentile_by_si', { target_score: rawScore, p_si: si })`
`complexes` 쿼리에 `si` 컬럼을 함께 select해야 한다 (`.select('hagwon_score, si')`).

---

### `src/components/complex/EducationCard.tsx` (component, request-response) — 수정

**Analog:** 자기 자신 (현재 파일 전체를 수정)

**현재 'use client' + imports 패턴** (lines 1-4):
```typescript
'use client'

import { useState } from 'react'
import type { FacilityEduData, SchoolItem, PoiItem } from '@/lib/data/facility-edu'
```

**현재 인라인 스타일 패턴** — AI 슬롭 금지 (CLAUDE.md): backdrop-blur, gradient, glow, 보라/인디고 사용 금지.
모든 색상은 기존 CSS 변수(`var(--fg-pri)`, `var(--bg-surface-2)`, `var(--line-subtle)`) 또는 명시적 hex만 사용.

**현재 아이콘 SVG 컴포넌트 패턴** (lines 8-43):
```typescript
function WalkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2">
      {/* ... paths ... */}
    </svg>
  )
}
```
새 아이콘(색깔 walk)도 동일한 함수형 컴포넌트 패턴, props로 색상 주입:
```typescript
function WalkIcon({ color }: { color?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
         stroke={color ?? 'currentColor'} strokeWidth="2">
      {/* ... */}
    </svg>
  )
}
```

**현재 도보 시간 표시 패턴** (lines 185-195, SchoolList 내):
```typescript
{s.distance_m != null && (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end',
    marginTop: 3,
    font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)',
  }}>
    <WalkIcon />
    {fmtWalk(s.distance_m)}
  </div>
)}
```
EDU-04 색깔 아이콘: `color: 'var(--fg-tertiary)'`를 `walkColor(s.distance_m)`으로 교체.

**현재 배정 배지 패턴** (lines 168-178) — 이미 구현됨, 참조용:
```typescript
{s.is_assignment && (
  <span style={{
    font: '600 10px/1 var(--font-sans)',
    color: '#2563eb', background: '#eff6ff',
    padding: '2px 5px', borderRadius: 4,
    flexShrink: 0,
  }}>
    배정
  </span>
)}
```

**현재 HagwonSection + 펼치기/접기 패턴** (lines 204-297):
```typescript
function HagwonSection({ hagwons, stats }: {
  hagwons: PoiItem[]
  stats: FacilityEduData['hagwonStats']
}) {
  // 현재: topHagwons = hagwons.slice(0, 8) + 정적 "외 N개" 텍스트
  const topHagwons = hagwons.slice(0, 8)
  // ...
  {hagwons.length > 8 && (
    <p style={{ ... }}>외 {hagwons.length - 8}개</p>
  )}
}
```
EDU-03 펼치기/접기: `useState(false)` 추가, 버튼으로 교체:
```typescript
const [expanded, setExpanded] = useState(false)
const INITIAL_LIMIT = 8
const visibleHagwons = expanded ? hagwons : hagwons.slice(0, INITIAL_LIMIT)
// ...
{hagwons.length > INITIAL_LIMIT && (
  <button onClick={() => setExpanded(v => !v)} style={{ /* 기존 p 스타일 재사용 */ }}>
    {expanded ? '접기' : `외 ${hagwons.length - INITIAL_LIMIT}개 더보기`}
  </button>
)}
```

**현재 탭 스위치 패턴** (lines 363-413, EducationCard 메인):
```typescript
const tabs: Array<{ key: Tab; label: string; count?: number }> = [
  { key: 'school',  label: '학교',           count: schools.length },
  { key: 'hagwon',  label: '학원·교육',       count: hagwons.length },
  { key: 'daycare', label: '어린이집·유치원', count: daycares.length },
]
```
EDU-02: 탭 라벨과 count를 `daycares.length + kindergartens.length`로 변경, 또는 탭을 분리.
`DaycareList`는 daycare/kindergarten 하위 탭을 추가하거나 구분선으로 분리하는 방식 중 선택.

**현재 GRADE_COLOR/GRADE_BG 상수 패턴** (lines 65-77):
```typescript
const GRADE_COLOR: Record<string, string> = {
  A: '#16a34a', B: '#2563eb', C: '#d97706', D: '#9ca3af',
}
const GRADE_BG: Record<string, string> = {
  A: '#f0fdf4', B: '#eff6ff', C: '#fffbeb', D: '#f9fafb',
}
```
학원 카테고리 배지 색도 동일한 명시적 hex + Record 패턴 사용. CSS 변수 또는 Tailwind 클래스 아닌 인라인 hex로 일관성 유지.

---

### `src/lib/hagwon-category.ts` (utility, transform) — 신규

**Analog:** `src/lib/format.ts`

**순수 함수 유틸 파일 패턴** (lines 1-40 전체):
```typescript
// src/lib/format.ts
// 가격·평수·날짜 포맷 유틸 — page.tsx에서 추출, 프로젝트 전반 공유

export function formatPrice(price: number): string {
  const uk = Math.floor(price / 10000)
  // ...
}
```

**hagwon-category.ts에 복사할 패턴:**
- 파일 상단 주석: `// src/lib/hagwon-category.ts`
- named export 함수들만 (default export 없음)
- 타입은 파일 상단에 선언

```typescript
// src/lib/hagwon-category.ts
// 학원 카테고리 분류 + 도보 시간 색상 순수 유틸

export type HagwonCategory = '수학' | '영어' | '예체능' | '국어' | '과학' | '중국어/일어' | '기타'
export type WalkColor = 'green' | 'yellow' | 'red'

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

export function walkColor(distanceM: number | null): WalkColor {
  if (distanceM == null) return 'green'
  const min = distanceM / 67
  if (min <= 10) return 'green'
  if (min <= 15) return 'yellow'
  return 'red'
}

export const WALK_COLOR_HEX: Record<WalkColor, string> = {
  green:  '#16a34a',  // green-600
  yellow: '#d97706',  // amber-600
  red:    '#dc2626',  // red-600
}
```

---

### `src/lib/data/facility-edu.test.ts` (test) — 신규

**Analog:** `src/lib/data/gap-label.test.ts`

**파일 구조 패턴** (lines 1-99 전체):
```typescript
/**
 * gap-label 테스트 — getGapLabelData() + formatGap()
 * Phase 6 Plan 01 Task 2 (TDD RED)
 */
import { describe, it, expect, vi } from 'vitest'
import { getGapLabelData } from './gap-label'
```

**Supabase mock 헬퍼 패턴** (lines 12-38):
```typescript
function makeSupabaseMock(
  listingData: { price_per_py: number } | null,
  transactionRows: Array<{ price: number; area_m2: number }>,
) {
  const listingQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: listingData, error: null }),
  }
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'listing_prices') return listingQuery
    throw new Error(`Unexpected table: ${table}`)
  })
  return { from } as unknown as Parameters<typeof getGapLabelData>[1]
}
```

**facility-edu.test.ts 전용 mock 구조:**
- `from('facility_school')` → schoolQuery (select/eq/order)
- `from('facility_poi')` → poiQuery (select/eq/in/order)
- `from('complexes')` → scoreQuery (select/eq/maybeSingle)
- `rpc('hagwon_score_percentile_by_si', ...)` → percentileResult

**describe 블록 패턴:**
```typescript
describe('getComplexFacilityEdu', () => {
  it('유치원 poi_name 포함 시 kindergartens에 분류', async () => { ... })
  it('병설 포함 시 kindergartens에 분류', async () => { ... })
  it('유치원 미포함 daycare는 daycares에 분류', async () => { ... })
  it('hagwon_score 없으면 hagwonStats null 반환', async () => { ... })
})
```

---

### `src/lib/hagwon-category.test.ts` (test) — 신규

**Analog:** `src/lib/data/gap-label.test.ts`

**순수 함수 테스트 패턴** (lines 76-99, formatGap 테스트):
```typescript
describe('formatGap', () => {
  it('500 → "500만원"', () => {
    expect(formatGap(500)).toBe('500만원')
  })
  it('10000 → "1억"', () => {
    expect(formatGap(10000)).toBe('1억')
  })
})
```

**hagwon-category.test.ts 전용 구조:**
```typescript
import { describe, it, expect } from 'vitest'
import { classifyHagwon, walkColor } from '../hagwon-category'

describe('classifyHagwon', () => {
  it('수학 키워드 → "수학"', () => {
    expect(classifyHagwon('엠투에스수학1지구학원')).toBe('수학')
  })
  it('영어 키워드 → "영어"', () => {
    expect(classifyHagwon('에이든영어학원')).toBe('영어')
  })
  it('미술 키워드 → "예체능"', () => {
    expect(classifyHagwon('미나한아트미술스튜디오')).toBe('예체능')
  })
  it('매칭 없음 → "기타"', () => {
    expect(classifyHagwon('율하IT컴퓨터학원')).toBe('기타')
  })
})

describe('walkColor', () => {
  it('670m (10분) → "green"', () => {
    expect(walkColor(670)).toBe('green')
  })
  it('671m (10분 1초) → "yellow"', () => {
    expect(walkColor(671)).toBe('yellow')
  })
  it('1005m (15분) → "yellow"', () => {
    expect(walkColor(1005)).toBe('yellow')
  })
  it('1006m (15분+) → "red"', () => {
    expect(walkColor(1006)).toBe('red')
  })
  it('null → "green"', () => {
    expect(walkColor(null)).toBe('green')
  })
})
```

---

## Shared Patterns

### 1. Supabase CLI SQL 실행
**Source:** `scripts/collect-facility-edu.ts` lines 192-211
**Apply to:** `scripts/import-school-districts.ts`
```typescript
const tmpPath = path.join(process.cwd(), 'data', '_school_districts.sql')
fs.writeFileSync(tmpPath, sqlContent, 'utf8')
execSync(`supabase db query --linked --file "${tmpPath}"`, { stdio: 'inherit' })
fs.unlinkSync(tmpPath)
```
SQL 파일 분할 기준: 학교급별(초/중/고) 또는 50개 단위 배치 (Pitfall 4 대응).

### 2. RLS 패턴 (public read + service_role write)
**Source:** `supabase/migrations/20260508000001_district_stats.sql` lines 20-28
**Apply to:** `school_districts`, `school_district_schools` 테이블
```sql
alter table public.school_districts enable row level security;

create policy "school_districts: public read"
  on public.school_districts for select using (true);

create policy "school_districts: service role write"
  on public.school_districts for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
```

### 3. 인라인 스타일 디자인 시스템 (AI 슬롭 금지)
**Source:** `src/components/complex/EducationCard.tsx` lines 65-77, 83-93
**Apply to:** EducationCard.tsx 모든 UI 수정 부분
- `var(--fg-pri)`, `var(--fg-sec)`, `var(--fg-tertiary)` — 텍스트 색상
- `var(--bg-surface-2)`, `var(--line-subtle)`, `var(--line-default)` — 배경/테두리
- `var(--dj-orange)`, `var(--font-sans)` — 브랜드, 폰트
- 절대 금지: `backdrop-blur`, `gradient-text`, `glow`, 보라/인디고(`#6366f1`, `#7c3aed`)

### 4. 순수 함수 유틸 파일 구조
**Source:** `src/lib/format.ts` lines 1-40
**Apply to:** `src/lib/hagwon-category.ts`
- 파일 상단 한 줄 주석 (`// src/lib/hagwon-category.ts`)
- named export만, default export 없음
- 상수는 `const` (UPPER_SNAKE_CASE Record 또는 배열)
- 타입은 `export type`으로 파일 상단 선언

### 5. Vitest 테스트 파일 구조
**Source:** `src/lib/data/gap-label.test.ts` lines 1-99
**Apply to:** `facility-edu.test.ts`, `hagwon-category.test.ts`
- `import { describe, it, expect, vi } from 'vitest'`
- `vi.mock('server-only', () => ({}))` — server-only 모듈 있으면 추가
- `describe` → `it` → AAA (Arrange-Act-Assert)
- it 설명: 한국어로 행동 서술 (`'유치원 포함 시 kindergartens에 분류'`)

### 6. DRY_RUN 플래그 패턴
**Source:** `scripts/collect-facility-edu.ts` lines 38-40, 193
**Apply to:** `scripts/import-school-districts.ts`
```typescript
const DRY_RUN = process.argv.includes('--dry-run')
// ...
if (DRY_RUN) {
  console.log('[import-districts] DRY RUN — SQL 출력만, DB 미실행')
  return
}
```

---

## No Analog Found

없음 — 모든 파일에 대해 동일 역할 또는 동일 데이터 흐름의 analog가 존재한다.

---

## Critical Constraints (CLAUDE.md)

이하 제약은 모든 파일에 적용된다:

| 제약 | 대상 파일 | 비고 |
|------|----------|------|
| Supabase 쿼리는 서버 컴포넌트/API Route에서만 | EducationCard.tsx | 이미 props 수신 구조, 직접 쿼리 추가 금지 |
| RLS 정책 필수 | school_districts 마이그레이션 | service_role write만 허용 |
| complexes 골든 레코드 — 위치 기반 매칭 | import-school-districts.ts | ST_Within + location 사용, 단지명 단독 매칭 금지 |
| AI 슬롭 금지 | EducationCard.tsx | backdrop-blur/gradient-text/glow/보라인디고 금지 |
| 거래 데이터 조회 시 cancel/superseded 제외 | facility-edu.ts (해당 없음) | 학교/POI 쿼리는 무관 |

---

## Metadata

**Analog search scope:** `scripts/`, `src/lib/`, `src/components/complex/`, `supabase/migrations/`
**Files scanned:** 13 (scripts: 1, migrations: 3, components: 1, lib: 2, tests: 4, roadmap: 0)
**Pattern extraction date:** 2026-05-15
