import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getComplexFacilityEdu } from './facility-edu'

vi.mock('server-only', () => ({}))

function makeSupabaseMock(opts: {
  schools?: unknown[]
  pois?: unknown[]
  hagwonScore?: number | null
  si?: string | null
}) {
  const { schools = [], pois = [], hagwonScore = null, si = null } = opts

  const schoolQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: schools, error: null }),
  }

  const poiQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: pois, error: null }),
  }

  const scoreQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: hagwonScore != null || si != null ? { hagwon_score: hagwonScore, si } : null,
      error: null,
    }),
  }

  const rpc = vi.fn().mockResolvedValue({ data: 0.7, error: null })

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === 'facility_school') return schoolQuery
    if (table === 'facility_poi') return poiQuery
    if (table === 'complexes') return scoreQuery
    throw new Error(`Unexpected table: ${table}`)
  })

  return { from, rpc } as unknown as SupabaseClient
}

describe('getComplexFacilityEdu', () => {
  it('유치원 poi_name 포함 시 kindergartens에 분류', async () => {
    const supabase = makeSupabaseMock({
      pois: [
        { category: 'daycare', poi_name: '행복유치원', distance_m: 200 },
        { category: 'daycare', poi_name: '해달별어린이집', distance_m: 300 },
      ],
    })
    const result = await getComplexFacilityEdu('cx-1', supabase)
    expect(result.kindergartens).toHaveLength(1)
    expect(result.kindergartens.at(0)?.poi_name).toBe('행복유치원')
    expect(result.daycares).toHaveLength(1)
    expect(result.daycares.at(0)?.poi_name).toBe('해달별어린이집')
  })

  it('병설 포함 시 kindergartens에 분류', async () => {
    const supabase = makeSupabaseMock({
      pois: [
        { category: 'daycare', poi_name: '율하초등학교병설유치원', distance_m: 150 },
      ],
    })
    const result = await getComplexFacilityEdu('cx-1', supabase)
    expect(result.kindergartens).toHaveLength(1)
    expect(result.daycares).toHaveLength(0)
  })

  it('유치원 미포함 daycare는 daycares에 분류', async () => {
    const supabase = makeSupabaseMock({
      pois: [
        { category: 'daycare', poi_name: '해달별어린이집', distance_m: 300 },
        { category: 'daycare', poi_name: '웃음꽃어린이집', distance_m: 400 },
      ],
    })
    const result = await getComplexFacilityEdu('cx-1', supabase)
    expect(result.kindergartens).toHaveLength(0)
    expect(result.daycares).toHaveLength(2)
  })

  it('si 기반 hagwon_score_percentile_by_si RPC 호출됨', async () => {
    const supabase = makeSupabaseMock({ hagwonScore: 50, si: '창원시' })
    await getComplexFacilityEdu('cx-1', supabase)
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(supabase.rpc).toHaveBeenCalledWith('hagwon_score_percentile_by_si', {
      target_score: 50,
      p_si: '창원시',
    })
  })
})
