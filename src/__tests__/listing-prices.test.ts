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

describe('upsertListingPrice', () => {
  it('returns error for unauthenticated user', async () => {
    const { upsertListingPrice } = await import('@/lib/actions/listing-price-actions')
    const result = await upsertListingPrice({
      complexId: '550e8400-e29b-41d4-a716-446655440000',
      pricePerPy: 1000,
      recordedDate: '2026-01-01',
      source: 'KB시세',
    })
    expect(result.error).toBeTruthy()
  })

  it('rejects invalid uuid complexId', async () => {
    const { upsertListingPrice } = await import('@/lib/actions/listing-price-actions')
    const result = await upsertListingPrice({
      complexId: 'not-a-uuid',
      pricePerPy: 1000,
      recordedDate: '2026-01-01',
      source: 'KB시세',
    })
    expect(result.error).toBeTruthy()
  })

  it('rejects pricePerPy below minimum (< 100)', async () => {
    const { upsertListingPrice } = await import('@/lib/actions/listing-price-actions')
    const result = await upsertListingPrice({
      complexId: '550e8400-e29b-41d4-a716-446655440000',
      pricePerPy: 50,
      recordedDate: '2026-01-01',
      source: 'KB시세',
    })
    expect(result.error).toBeTruthy()
  })

  it('rejects pricePerPy above maximum (> 99999)', async () => {
    const { upsertListingPrice } = await import('@/lib/actions/listing-price-actions')
    const result = await upsertListingPrice({
      complexId: '550e8400-e29b-41d4-a716-446655440000',
      pricePerPy: 100000,
      recordedDate: '2026-01-01',
      source: 'KB시세',
    })
    expect(result.error).toBeTruthy()
  })

  it('rejects invalid date format', async () => {
    const { upsertListingPrice } = await import('@/lib/actions/listing-price-actions')
    const result = await upsertListingPrice({
      complexId: '550e8400-e29b-41d4-a716-446655440000',
      pricePerPy: 1000,
      recordedDate: '2026-01',   // 형식 오류
      source: 'KB시세',
    })
    expect(result.error).toBeTruthy()
  })
})

describe('deleteListingPrice', () => {
  it('returns error for unauthenticated user', async () => {
    const { deleteListingPrice } = await import('@/lib/actions/listing-price-actions')
    const result = await deleteListingPrice('550e8400-e29b-41d4-a716-446655440000')
    expect(result.error).toBeTruthy()
  })

  it('rejects invalid uuid id', async () => {
    const { deleteListingPrice } = await import('@/lib/actions/listing-price-actions')
    const result = await deleteListingPrice('not-a-uuid')
    expect(result.error).toBeTruthy()
  })
})
