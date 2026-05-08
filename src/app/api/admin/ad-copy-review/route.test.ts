import { describe, it, expect, vi, beforeEach } from 'vitest'

// Supabase server client mock
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

// Anthropic SDK mock
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"violations":[],"suggestions":[]}' }],
      }),
    },
  })),
}))

import type { Mock } from 'vitest'

describe('POST /api/admin/ad-copy-review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('인증되지 않은 사용자는 401 반환', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    ;(createSupabaseServerClient as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    })

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/admin/ad-copy-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy: '최저가 보장' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('비관리자 사용자는 403 반환', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    ;(createSupabaseServerClient as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'user' },
            }),
          }),
        }),
      }),
    })

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/admin/ad-copy-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy: '최저가 보장' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('copy 없으면 400 반환', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    ;(createSupabaseServerClient as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
            }),
          }),
        }),
      }),
    })

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/admin/ad-copy-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json() as { error: string }
    expect(body.error).toContain('copy')
  })

  it('500자 초과 copy는 400 반환', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    ;(createSupabaseServerClient as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
            }),
          }),
        }),
      }),
    })

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/admin/ad-copy-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy: 'a'.repeat(501) }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('관리자 요청 시 Claude API 호출 후 violations/suggestions 반환', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    ;(createSupabaseServerClient as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
            }),
          }),
        }),
      }),
    })

    // Anthropic mock 재설정: violations 포함 응답
    const Anthropic = ((await import('@anthropic-ai/sdk')).default as unknown) as Mock
    Anthropic.mockImplementationOnce(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: '{"violations":["100% 투자 수익 보장 위반"],"suggestions":["표현 완화 필요"]}',
          }],
        }),
      },
    }))

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/admin/ad-copy-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy: '100% 투자 수익 보장!' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json() as { violations: string[]; suggestions: string[] }
    expect(Array.isArray(body.violations)).toBe(true)
    expect(Array.isArray(body.suggestions)).toBe(true)
  })

  it('Claude API 실패 시 error:true + status 200 반환 (등록 차단 안 함)', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    ;(createSupabaseServerClient as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'superadmin' },
            }),
          }),
        }),
      }),
    })

    // Anthropic mock: throw error
    const Anthropic = ((await import('@anthropic-ai/sdk')).default as unknown) as Mock
    Anthropic.mockImplementationOnce(() => ({
      messages: {
        create: vi.fn().mockRejectedValue(new Error('API timeout')),
      },
    }))

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/admin/ad-copy-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy: '합리적인 가격의 좋은 아파트' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)  // 차단하지 않음
    const body = await res.json() as { violations: string[]; suggestions: string[]; error: boolean }
    expect(body.error).toBe(true)
    expect(body.violations).toEqual([])
    expect(body.suggestions).toEqual([])
  })

  it('Claude API가 마크다운 코드 블록으로 감싼 JSON 파싱 성공', async () => {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server')
    ;(createSupabaseServerClient as Mock).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'admin-123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'admin' },
            }),
          }),
        }),
      }),
    })

    const Anthropic = ((await import('@anthropic-ai/sdk')).default as unknown) as Mock
    Anthropic.mockImplementationOnce(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{
            type: 'text',
            text: '```json\n{"violations":[],"suggestions":["문구 자연스럽게"]}\n```',
          }],
        }),
      },
    }))

    const { POST } = await import('./route')
    const req = new Request('http://localhost/api/admin/ad-copy-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ copy: '넓고 쾌적한 아파트' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json() as { violations: string[]; suggestions: string[] }
    expect(body.violations).toEqual([])
    expect(body.suggestions).toContain('문구 자연스럽게')
  })
})
