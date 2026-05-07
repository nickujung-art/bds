import { describe, it, expect, vi, beforeEach } from 'vitest'

// 구현 파일이 없으므로 RED 상태
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

describe('getRedevelopmentProject', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('should return project data with correct shape for existing complex', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'proj-uuid-001',
          complex_id: 'complex-uuid-001',
          phase: 'construction',
          notes: '공사 중',
          updated_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      }),
    }

    const { getRedevelopmentProject } = await import('@/lib/data/redevelopment')
    const result = await getRedevelopmentProject('complex-uuid-001', mockSupabase as any)

    expect(result).not.toBeNull()
    expect(result?.id).toBe('proj-uuid-001')
    expect(result?.phase).toBe('construction')
    expect(result?.notes).toBe('공사 중')
    expect(result?.updatedAt).toBe('2026-01-01T00:00:00Z')
  })

  it('should return null for non-existent complex', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    }

    const { getRedevelopmentProject } = await import('@/lib/data/redevelopment')
    const result = await getRedevelopmentProject('non-existent-uuid', mockSupabase as any)

    expect(result).toBeNull()
  })

  it('returns cancelled project with phase equal to cancelled and notes intact', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'proj-uuid-002',
          complex_id: 'complex-uuid-002',
          phase: 'cancelled',
          notes: '주민 반대로 취소',
          updated_at: '2026-02-01T00:00:00Z',
        },
        error: null,
      }),
    }

    const { getRedevelopmentProject } = await import('@/lib/data/redevelopment')
    const result = await getRedevelopmentProject('complex-uuid-002', mockSupabase as any)

    expect(result).not.toBeNull()
    expect(result?.phase).toBe('cancelled')
    expect(result?.notes).toBe('주민 반대로 취소')
  })
})
