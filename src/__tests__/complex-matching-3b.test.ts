/**
 * Step3b 수용 기준 테스트 — 3축 단지 매칭 파이프라인
 *
 * 축 우선순위 (ADR-034):
 *   1) 도로명주소 + 건축연도 exact match → confidence 1.0
 *   2) 좌표 ±200m + trigram ≥ 0.7 → confidence = trigram score
 *   3) sgg_code + trigram ≥ 0.5 → confidence = score × 0.85 (캡)
 *   미달 → complex_match_queue 적재
 *
 * 신뢰도 임계 (ADR-039):
 *   ≥ 0.9  → 자동 매칭 + complex_aliases 기록
 *   0.7~0.9 → 운영자 큐 (low_confidence), null 반환
 *   < 0.7  → 운영자 큐 (no_match), null 반환
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { URL_, SKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
})

const {
  matchComplex,
  matchByAddress,
  matchByCoordinate,
  matchByAdminCode,
} = await import('@/lib/data/complex-matching')

// 테스트용 단지 — 창원시 의창구 일대 실제 좌표 근사값
const TEST_PREFIX = 'M3B_'
const COMPLEX_A = {
  kapt_code:        `${TEST_PREFIX}ADDR001`,
  canonical_name:   '테스트래미안아파트',
  name_normalized:  '테스트래미안',
  sgg_code:         '48121',
  road_address:     '경상남도 창원시 의창구 매칭테스트로 100',
  jibun_address:    '경상남도 창원시 의창구 팔용동 100',
  lat:              35.2286,
  lng:              128.6816,
  household_count:  500,
  built_year:       2010,
  status:           'active',
  data_completeness: { transactions: false, school: false, kapt: false, poi: false },
}

// 200m 안에 있는 단지 (다른 이름 → trigram 낮음)
const COMPLEX_B = {
  kapt_code:        `${TEST_PREFIX}COORD001`,
  canonical_name:   '테스트자이아파트',
  name_normalized:  '테스트자이',
  sgg_code:         '48121',
  road_address:     '경상남도 창원시 의창구 매칭테스트로 200',
  lat:              35.2289,   // ~35m 떨어진 좌표
  lng:              128.6820,
  household_count:  300,
  built_year:       2015,
  status:           'active',
  data_completeness: { transactions: false, school: false, kapt: false, poi: false },
}

// 800m 거리 — 200m 반경 밖
const COMPLEX_C = {
  kapt_code:        `${TEST_PREFIX}FAR001`,
  canonical_name:   '테스트힐스테이트아파트',
  name_normalized:  '테스트힐스테이트',
  sgg_code:         '48121',
  road_address:     null,
  lat:              35.2350,   // ~700m 이상
  lng:              128.6900,
  household_count:  800,
  built_year:       2020,
  status:           'active',
  data_completeness: { transactions: false, school: false, kapt: false, poi: false },
}

let complexAId: string
let complexBId: string
let complexCId: string

beforeAll(async () => {
  // 테스트 단지 삽입
  const { data: a, error: eA } = await admin
    .from('complexes')
    .upsert(COMPLEX_A, { onConflict: 'kapt_code' })
    .select('id')
    .single()
  if (eA) throw new Error(`complexA insert failed: ${eA.message}`)
  complexAId = a!.id as string

  const { data: b, error: eB } = await admin
    .from('complexes')
    .upsert(COMPLEX_B, { onConflict: 'kapt_code' })
    .select('id')
    .single()
  if (eB) throw new Error(`complexB insert failed: ${eB.message}`)
  complexBId = b!.id as string

  const { data: c, error: eC } = await admin
    .from('complexes')
    .upsert(COMPLEX_C, { onConflict: 'kapt_code' })
    .select('id')
    .single()
  if (eC) throw new Error(`complexC insert failed: ${eC.message}`)
  complexCId = c!.id as string
})

afterAll(async () => {
  await admin.from('complex_aliases').delete().in('complex_id', [complexAId, complexBId, complexCId])
  await admin.from('complex_match_queue').delete().like('source', `${TEST_PREFIX}%`)
  await admin.from('complexes').delete().like('kapt_code', `${TEST_PREFIX}%`)
})

// ─────────────────────────────────────────────
// Axis 1: 도로명주소 + 건축연도
// ─────────────────────────────────────────────
describe('matchByAddress (axis 1)', () => {
  it('exact road_address + built_year → complexAId, confidence 1.0', async () => {
    const result = await matchByAddress(
      {
        doroJuso: COMPLEX_A.road_address,
        builtYear: COMPLEX_A.built_year,
      },
      admin,
    )
    expect(result).not.toBeNull()
    expect(result!.complexId).toBe(complexAId)
    expect(result!.confidence).toBe(1.0)
    expect(result!.axis).toBe('address')
  })

  it('correct address but wrong built_year → null', async () => {
    const result = await matchByAddress(
      { doroJuso: COMPLEX_A.road_address, builtYear: 1999 },
      admin,
    )
    expect(result).toBeNull()
  })

  it('no road_address → null', async () => {
    const result = await matchByAddress({ doroJuso: undefined, builtYear: 2010 }, admin)
    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────
// Axis 2: 좌표 + trigram
// ─────────────────────────────────────────────
describe('matchByCoordinate (axis 2)', () => {
  it('좌표 200m 이내 + 이름 유사 → complexA 반환, confidence = trigram score', async () => {
    const result = await matchByCoordinate(
      {
        coordX: COMPLEX_A.lng,
        coordY: COMPLEX_A.lat,
        nameNormalized: '테스트래미안',   // COMPLEX_A.name_normalized와 동일
      },
      admin,
    )
    expect(result).not.toBeNull()
    expect(result!.complexId).toBe(complexAId)
    expect(result!.confidence).toBeGreaterThanOrEqual(0.7)
    expect(result!.axis).toBe('coordinate')
  })

  it('좌표 200m 이내지만 이름 다름 → null', async () => {
    const result = await matchByCoordinate(
      {
        coordX: COMPLEX_A.lng,
        coordY: COMPLEX_A.lat,
        nameNormalized: '전혀다른단지이름xyz',
      },
      admin,
    )
    expect(result).toBeNull()
  })

  it('좌표 800m 이상 → null', async () => {
    const result = await matchByCoordinate(
      {
        coordX: COMPLEX_C.lng,   // 800m 밖에 있는 COMPLEX_C 좌표로 검색
        coordY: COMPLEX_C.lat,
        nameNormalized: '테스트래미안',  // COMPLEX_A 이름으로 검색해도 범위 밖
      },
      admin,
    )
    // complexA is ~700m from complexC → should not match
    expect(result?.complexId).not.toBe(complexAId)
  })

  it('좌표 없음 → null', async () => {
    const result = await matchByCoordinate(
      { coordX: undefined, coordY: undefined, nameNormalized: '테스트래미안' },
      admin,
    )
    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────
// Axis 3: sgg_code + trigram
// ─────────────────────────────────────────────
describe('matchByAdminCode (axis 3)', () => {
  it('sgg_code 일치 + 이름 유사 → complexA 반환, confidence ≤ 0.85', async () => {
    const result = await matchByAdminCode(
      {
        sggCode: '48121',
        nameNormalized: '테스트래미안',
      },
      admin,
    )
    expect(result).not.toBeNull()
    expect(result!.complexId).toBe(complexAId)
    expect(result!.confidence).toBeLessThanOrEqual(0.85)
    expect(result!.axis).toBe('admin_code')
  })

  it('sgg_code 일치하나 이름 너무 다름 → null', async () => {
    const result = await matchByAdminCode(
      { sggCode: '48121', nameNormalized: '전혀다른이름xyz' },
      admin,
    )
    expect(result).toBeNull()
  })

  it('sgg_code 불일치 → null', async () => {
    const result = await matchByAdminCode(
      { sggCode: '99999', nameNormalized: '테스트래미안' },
      admin,
    )
    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────
// matchComplex 통합 (ADR-039 임계)
// ─────────────────────────────────────────────
describe('matchComplex (end-to-end)', () => {
  const MATCH_SOURCE = `${TEST_PREFIX}source`

  afterEach(async () => {
    await admin.from('complex_aliases').delete().in('complex_id', [complexAId, complexBId, complexCId])
    await admin.from('complex_match_queue').delete().like('source', `${TEST_PREFIX}%`)
  })

  it('axis 1 (주소 exact) → 자동 매칭 + complex_aliases 기록', async () => {
    const id = await matchComplex(
      {
        rawName: '테스트래미안아파트',
        doroJuso: COMPLEX_A.road_address,
        sggCode: '48121',
        builtYear: COMPLEX_A.built_year,
        source: MATCH_SOURCE,
        rawPayload: { test: true },
      },
      admin,
    )
    expect(id).toBe(complexAId)

    const { data: alias } = await admin
      .from('complex_aliases')
      .select('*')
      .eq('complex_id', complexAId)
      .eq('source', MATCH_SOURCE)
    expect(alias).toHaveLength(1)
    expect(alias![0]!.confidence).toBeCloseTo(1.0, 1)
  })

  it('axis 2 (좌표 + trigram) → 자동 매칭', async () => {
    const id = await matchComplex(
      {
        rawName: '테스트래미안아파트',
        sggCode: '48121',
        coordX: COMPLEX_A.lng,
        coordY: COMPLEX_A.lat,
        source: MATCH_SOURCE,
        rawPayload: {},
      },
      admin,
    )
    expect(id).toBe(complexAId)
  })

  it('신뢰도 미달(no_match) → null + 큐에 no_match 기록', async () => {
    const id = await matchComplex(
      {
        rawName: '전혀없는단지xyz',
        sggCode: '48121',
        source: MATCH_SOURCE,
        rawPayload: {},
      },
      admin,
    )
    expect(id).toBeNull()

    const { data: queued } = await admin
      .from('complex_match_queue')
      .select('reason, status')
      .like('source', `${TEST_PREFIX}%`)
    expect(queued).toHaveLength(1)
    expect(queued![0]!.reason).toBe('no_match')
    expect(queued![0]!.status).toBe('pending')
  })
})
