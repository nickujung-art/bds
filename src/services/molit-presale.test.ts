import { describe, it, expect, vi } from 'vitest'
import { fetchPresaleTrades } from '@/services/molit-presale'

describe('fetchPresaleTrades (DATA-02)', () => {
  it('MOLIT_API_KEY 미설정 시 에러를 throw한다', async () => {
    const orig = process.env.MOLIT_API_KEY
    delete process.env.MOLIT_API_KEY
    await expect(fetchPresaleTrades('38110', '202605')).rejects.toThrow('MOLIT_API_KEY')
    process.env.MOLIT_API_KEY = orig
  })

  it('API ok=false이면 에러를 throw한다', async () => {
    process.env.MOLIT_API_KEY = 'test-key'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))
    await expect(fetchPresaleTrades('38110', '202605')).rejects.toThrow('MOLIT API 500')
    vi.unstubAllGlobals()
  })

  it('정상 XML 응답에서 PresaleTrade 배열을 파싱한다', async () => {
    process.env.MOLIT_API_KEY = 'test-key'
    const xml = `<?xml version="1.0"?><response><body><items><item><aptNm>테스트분양</aptNm><umdNm>의창구</umdNm><dealAmount>50,000</dealAmount><dealYear>2026</dealYear><dealMonth>05</dealMonth><dealDay>01</dealDay></item></items></body></response>`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(xml),
    }))
    const result = await fetchPresaleTrades('38110', '202605')
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]?.aptNm).toBe('테스트분양')
    vi.unstubAllGlobals()
  })
})
