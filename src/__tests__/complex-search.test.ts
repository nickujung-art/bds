/**
 * Step7 수용 기준 테스트 — 단지 검색 데이터 레이어
 *
 * - searchComplexes: trigram 검색, 빈 쿼리, sgg_code 필터
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { URL_, AKEY, SKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
})

// ── 픽스처 ──────────────────────────────────────────────────
const inserted: string[] = []

beforeAll(async () => {
  if (!SKEY) return
  const fixtures = [
    { canonical_name: '래미안창원아파트', name_normalized: '래미안창원아파트', sgg_code: '48121', status: 'active' as const },
    { canonical_name: '래미안김해아파트', name_normalized: '래미안김해아파트', sgg_code: '48250', status: 'active' as const },
    { canonical_name: '자이성산아파트',   name_normalized: '자이성산아파트',   sgg_code: '48123', status: 'active' as const },
  ]
  for (const f of fixtures) {
    const { data } = await admin.from('complexes').insert(f).select('id').single()
    inserted.push((data as { id: string }).id)
  }
})

afterAll(async () => {
  if (!SKEY) return
  await admin.from('complexes').delete().in('id', inserted)
})

// ── searchComplexes ─────────────────────────────────────────
import { searchComplexes } from '@/lib/data/complex-search'

describe.skipIf(!SKEY)('searchComplexes', () => {
  it('빈 쿼리 → 빈 배열 (검색 안 함)', async () => {
    const result = await searchComplexes('', ['48121', '48250'], admin)
    expect(result).toEqual([])
  })

  it('공백만 있는 쿼리 → 빈 배열', async () => {
    const result = await searchComplexes('   ', ['48121'], admin)
    expect(result).toEqual([])
  })

  it('"래미안" 검색 → 래미안 단지만 포함', async () => {
    const result = await searchComplexes('래미안', ['48121', '48250', '48123'], admin)
    const names = result.map((c) => c.canonical_name)
    expect(names.some((n) => n.includes('래미안'))).toBe(true)
    expect(names.some((n) => n.includes('자이'))).toBe(false)
  })

  it('sgg_code 필터 — 48121만 → 김해(48250) 단지 제외', async () => {
    const result = await searchComplexes('래미안', ['48121'], admin)
    const codes = result.map((c) => c.sgg_code)
    expect(codes.every((c) => c === '48121')).toBe(true)
  })

  it('결과에 id, canonical_name, sgg_code 포함', async () => {
    const result = await searchComplexes('래미안', ['48121'], admin)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toMatchObject({
      id:             expect.any(String),
      canonical_name: expect.any(String),
      sgg_code:       expect.any(String),
    })
  })

  it('빈 sgg_code 배열 → 빈 배열', async () => {
    const result = await searchComplexes('래미안', [], admin)
    expect(result).toEqual([])
  })
})
