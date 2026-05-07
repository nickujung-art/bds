import { describe, it, expect, vi } from 'vitest'
import { fetchKaptBasicInfo } from '@/services/kapt'

describe('fetchKaptBasicInfo (DATA-01)', () => {
  it('KAPT_API_KEY 미설정 시 에러를 throw한다', async () => {
    const orig = process.env.KAPT_API_KEY
    delete process.env.KAPT_API_KEY
    await expect(fetchKaptBasicInfo('A1234567')).rejects.toThrow('KAPT_API_KEY')
    process.env.KAPT_API_KEY = orig
  })

  it('API 응답이 올바른 경우 KaptBasicInfo를 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        response: { body: { item: { kaptCode: 'A1234567', kaptName: '테스트아파트', kaptdaCnt: 300 } } }
      }),
    }))
    const result = await fetchKaptBasicInfo('A1234567')
    expect(result?.kaptCode).toBe('A1234567')
    vi.unstubAllGlobals()
  })

  it('API 응답 item이 null이면 null을 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ response: { body: { item: null } } }),
    }))
    const result = await fetchKaptBasicInfo('UNKNOWN')
    expect(result).toBeNull()
    vi.unstubAllGlobals()
  })
})
