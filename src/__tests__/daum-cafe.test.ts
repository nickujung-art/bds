/**
 * DIFF-02 — Daum 카페 검색 + Gemini NER
 * RED: 구현 없음 → 실패 예상
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

describe('daum-cafe searchCafePosts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubEnv('KAKAO_REST_API_KEY', 'test-kakao-key')
  })

  it('정상 응답 → CafePost[] 반환', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        documents: [{
          title: '래미안더센트럴 후기',
          contents: '창원 래미안더센트럴 입주 후기입니다.',
          url: 'https://cafe.daum.net/test/1',
          datetime: '2026-05-01T00:00:00.000+09:00',
          cafename: '창원부동산카페',
        }],
      }),
    } as Response)

    const { searchCafePosts } = await import('@/services/daum-cafe')
    const posts = await searchCafePosts('창원 래미안')
    expect(posts).toHaveLength(1)
    expect(posts[0]!.title).toBe('래미안더센트럴 후기')
    expect(posts[0]!.cafeName).toBe('창원부동산카페')
  })

  it('HTTP 오류 → Error throw', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 } as Response)

    const { searchCafePosts } = await import('@/services/daum-cafe')
    await expect(searchCafePosts('테스트')).rejects.toThrow('Daum cafe search HTTP 401')
  })
})

describe('extractComplexNames', () => {
  it('프롬프트 인젝션 방지: [텍스트] 구분자 사용 확인', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key')
    const mockGenAI = {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: { text: () => '{"complexes": ["래미안더센트럴"]}' },
        }),
      }),
    }
    vi.doMock('@google/generative-ai', () => ({ GoogleGenerativeAI: vi.fn(() => mockGenAI) }))

    const { extractComplexNames } = await import('@/services/daum-cafe')
    const result = await extractComplexNames('창원 래미안더센트럴 매매 후기')
    expect(result).toContain('래미안더센트럴')
    // 프롬프트에 [텍스트] 구분자가 포함되어야 함 (구현에서 검증)
    const callArg = mockGenAI.getGenerativeModel().generateContent.mock.calls[0]?.[0] as string
    expect(callArg).toContain('[텍스트]')
  })
})
