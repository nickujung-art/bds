import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
    from: vi.fn(),
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

describe('upsertRedevelopmentProject', () => {
  it('returns error for unauthenticated user', async () => {
    const { upsertRedevelopmentProject } = await import('@/lib/actions/redevelopment-actions')
    const result = await upsertRedevelopmentProject('', 'rumor', null)
    expect(result.error).toBeTruthy()
  })

  it('rejects invalid phase enum value', async () => {
    const { upsertRedevelopmentProject } = await import('@/lib/actions/redevelopment-actions')
    const result = await upsertRedevelopmentProject(
      '550e8400-e29b-41d4-a716-446655440000',
      'invalid_phase',
      null
    )
    expect(result.error).toBeTruthy()
  })

  it('rejects invalid uuid complexId', async () => {
    const { upsertRedevelopmentProject } = await import('@/lib/actions/redevelopment-actions')
    const result = await upsertRedevelopmentProject('not-a-uuid', 'rumor', null)
    expect(result.error).toBeTruthy()
  })
})
