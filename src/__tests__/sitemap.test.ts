/**
 * Step13 수용 기준 테스트 — SEO / 사이트맵
 *
 * - getComplexesForSitemap: active 단지만 반환, id·updated_at 포함
 * - sitemap(): 정적 URL + 단지 URL 포함
 * - robots(): allow/disallow 규칙 확인
 */
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { URL_, SKEY, AKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/readonly', () => {
  const chain: Record<string, unknown> = {
    data: [{ id: 'mock-complex-id', updated_at: '2024-01-01T00:00:00Z' }],
    error: null,
  }
  const fn = () => chain
  chain.eq    = fn
  chain.order = fn
  chain.limit = fn
  chain.neq   = fn
  return {
    createReadonlyClient: () => ({
      from: () => ({ select: () => chain }),
    }),
  }
})

const SITE = 'https://danjiondo.kr'

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', AKEY)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE)
})

// ── 픽스처 ─────────────────────────────────────────────────────
const insertedIds: string[] = []

afterAll(async () => {
  if (!SKEY) return
  if (insertedIds.length) await admin.from('complexes').delete().in('id', insertedIds)
})

// ── getComplexesForSitemap ──────────────────────────────────────
import { getComplexesForSitemap } from '@/lib/data/sitemap'

describe.skipIf(!SKEY)('getComplexesForSitemap', () => {
  it('active 단지 → id·updated_at 포함하여 반환', async () => {
    const { data } = await admin
      .from('complexes')
      .insert({
        canonical_name:  '사이트맵테스트아파트',
        name_normalized: '사이트맵테스트아파트',
        sgg_code:        '48121',
        status:          'active' as const,
      })
      .select('id')
      .single()
    insertedIds.push((data as { id: string }).id)

    const result = await getComplexesForSitemap(admin)
    const found = result.find(r => r.id === (data as { id: string }).id)
    expect(found).toBeDefined()
    expect(found).toHaveProperty('id')
    expect(found).toHaveProperty('updated_at')
  })

  it('demolished status 단지 → 반환 안 됨', async () => {
    const { data } = await admin
      .from('complexes')
      .insert({
        canonical_name:  '사이트맵철거단지아파트',
        name_normalized: '사이트맵철거단지아파트',
        sgg_code:        '48121',
        status:          'demolished' as const,
      })
      .select('id')
      .single()
    insertedIds.push((data as { id: string }).id)

    const result = await getComplexesForSitemap(admin)
    expect(result.find(r => r.id === (data as { id: string }).id)).toBeUndefined()
  })
})

// ── sitemap() ──────────────────────────────────────────────────
describe('sitemap()', () => {
  it('/ 와 /map 정적 URL 포함', async () => {
    const { default: sitemap } = await import('@/app/sitemap')
    const entries = await sitemap()
    const urls = entries.map(e => e.url)
    expect(urls).toContain(`${SITE}/`)
    expect(urls).toContain(`${SITE}/map`)
  })

  it('단지 URL /complexes/{id} 형식으로 포함', async () => {
    const { default: sitemap } = await import('@/app/sitemap')
    const entries = await sitemap()
    const complexEntries = entries.filter(e => e.url.includes('/complexes/'))
    expect(complexEntries.length).toBeGreaterThan(0)
  })
})

// ── robots() ───────────────────────────────────────────────────
describe('robots()', () => {
  it('sitemap URL 포함', async () => {
    const { default: robots } = await import('@/app/robots')
    const result = robots()
    expect(result.sitemap).toContain('sitemap.xml')
  })

  it('/admin/ 경로 disallow', async () => {
    const { default: robots } = await import('@/app/robots')
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const disallowed = rules.flatMap(r => (Array.isArray(r.disallow) ? r.disallow : [r.disallow]))
    expect(disallowed.some(d => d?.includes('/admin'))).toBe(true)
  })
})
