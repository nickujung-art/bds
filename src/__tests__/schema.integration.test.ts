/**
 * Step2 수용 기준 통합 테스트
 * 로컬 Supabase DB가 실행 중이어야 함 (supabase start)
 */
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { URL_, AKEY, admin } from './helpers/db'

const anon = createClient(URL_, AKEY)

const TEST_COMPLEX_ID = '00000000-0000-0000-0000-000000000001'
const TEST_DEDUPE_KEY = 'test_dedupe_key_schema_test'

beforeAll(async () => {
  // 테스트용 단지 삽입 (service_role)
  await admin.from('complexes').upsert({
    id: TEST_COMPLEX_ID,
    canonical_name: '테스트아파트',
    name_normalized: '테스트아파트',
    sgg_code: '48121',
    status: 'active',
  })
})

afterAll(async () => {
  await admin.from('transactions').delete().eq('dedupe_key', TEST_DEDUPE_KEY)
  await admin.from('complexes').delete().eq('id', TEST_COMPLEX_ID)
})

describe('RLS: favorites 비인증 SELECT', () => {
  it('비인증 사용자가 favorites에 SELECT 시도 → 0건 반환', async () => {
    const { data, error } = await anon.from('favorites').select('*')
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})

describe('dedupe_key UNIQUE 제약', () => {
  it('동일 dedupe_key 두 번 insert → 두 번째는 UNIQUE 오류', async () => {
    const row = {
      complex_id: TEST_COMPLEX_ID,
      deal_type: 'sale' as const,
      deal_date: '2024-01-15',
      price: 50000,
      area_m2: 84.99,
      sgg_code: '48121',
      dedupe_key: TEST_DEDUPE_KEY,
    }
    const first = await admin.from('transactions').insert(row)
    expect(first.error).toBeNull()

    const second = await admin.from('transactions').insert(row)
    expect(second.error).not.toBeNull()
    expect(second.error?.code).toBe('23505')  // unique_violation
  })
})

describe('complexes.status enum 유효성', () => {
  it('유효한 status 6개 값 → insert 성공', async () => {
    const validStatuses = [
      'pre_sale', 'under_construction', 'recently_built',
      'active', 'in_redevelopment', 'demolished',
    ] as const

    for (const status of validStatuses) {
      const { error } = await admin.from('complexes').upsert({
        id: `00000000-0000-0000-0000-${validStatuses.indexOf(status).toString().padStart(12, '0')}`,
        canonical_name: `테스트_${status}`,
        name_normalized: `테스트_${status}`,
        sgg_code: '48121',
        status,
      })
      expect(error, `status '${status}' should be valid`).toBeNull()
    }

    // 정리
    for (let i = 0; i < validStatuses.length; i++) {
      await admin.from('complexes').delete().eq(
        'id', `00000000-0000-0000-0000-${i.toString().padStart(12, '0')}`
      )
    }
  })

  it('유효하지 않은 status → insert 실패', async () => {
    const { error } = await admin.from('complexes').insert({
      canonical_name: '테스트',
      name_normalized: '테스트',
      sgg_code: '48121',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: 'invalid_status' as any,
    })
    expect(error).not.toBeNull()
  })
})
