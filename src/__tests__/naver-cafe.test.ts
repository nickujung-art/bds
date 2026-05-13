/**
 * DIFF-02 — Naver 카페 검색 + Gemini NER
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

describe('naver-cafe searchCafePosts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    vi.stubEnv('NAVER_CLIENT_ID',     'test-naver-id')
    vi.stubEnv('NAVER_CLIENT_SECRET', 'test-naver-secret')
  })

  it('정상 응답 → CafePost[] 반환', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          title:       '래미안더센트럴 후기',
          description: '창원 래미안더센트럴 입주 후기입니다.',
          link:        'https://cafe.naver.com/changwon/1',
          pubDate:     'Mon, 01 May 2026 00:00:00 +0900',
          cafename:    '창원부동산카페',
        }],
      }),
    } as Response)

    const { searchCafePosts } = await import('@/services/naver-cafe')
    const posts = await searchCafePosts('창원 래미안')
    expect(posts).toHaveLength(1)
    expect(posts[0]!.title).toBe('래미안더센트럴 후기')
    expect(posts[0]!.cafeName).toBe('창원부동산카페')
    expect(posts[0]!.url).toBe('https://cafe.naver.com/changwon/1')
  })

  it('HTML 태그 제거 — title/contents에서 <b> 태그 strip', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{
          title:       '<b>래미안</b>더센트럴',
          description: '창원 <b>래미안</b> 후기',
          link:        'https://cafe.naver.com/test/1',
          pubDate:     'Mon, 01 May 2026 00:00:00 +0900',
          cafename:    '테스트카페',
        }],
      }),
    } as Response)

    const { searchCafePosts } = await import('@/services/naver-cafe')
    const posts = await searchCafePosts('래미안')
    expect(posts[0]!.title).toBe('래미안더센트럴')
    expect(posts[0]!.contents).toBe('창원 래미안 후기')
  })

  it('HTTP 오류 → Error throw', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401 } as Response)

    const { searchCafePosts } = await import('@/services/naver-cafe')
    await expect(searchCafePosts('테스트')).rejects.toThrow('Naver cafe search HTTP 401')
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
    vi.resetModules()
    vi.doMock('@google/generative-ai', () => ({ GoogleGenerativeAI: vi.fn(() => mockGenAI) }))
    vi.doMock('server-only', () => ({}))

    const { extractComplexNames } = await import('@/services/naver-cafe')
    const result = await extractComplexNames('창원 래미안더센트럴 매매 후기')
    expect(result).toContain('래미안더센트럴')
    const callArg = mockGenAI.getGenerativeModel().generateContent.mock.calls[0]?.[0] as string
    expect(callArg).toContain('[텍스트]')
  })
})
