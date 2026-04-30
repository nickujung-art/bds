/**
 * Step3a 수용 기준 테스트
 * - nameNormalize 단위 테스트
 * - seedComplex 멱등성 통합 테스트 (로컬 DB 필요)
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { nameNormalize } from '@/lib/data/name-normalize'
import { URL_, SKEY, admin } from './helpers/db'

vi.mock('server-only', () => ({}))

beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_)
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SKEY)
})

// dynamic import: stubEnv 이후에 실행되어야 admin client가 env를 읽음
const { seedComplex } = await import('@/lib/data/complex-matching')

const TEST_PREFIX = 'TEST_'
const TEST_COMPLEXES = Array.from({ length: 10 }, (_, i) => ({
  kaptCode: `${TEST_PREFIX}${String(i + 1).padStart(8, '0')}`,
  kaptName: `테스트자이아파트 ${i + 1}단지`,
  doroJuso: `경상남도 창원시 의창구 테스트로 ${(i + 1) * 10}`,
  kaptdaCnt: 300 + i * 50,
  kaptUseApproveYmd: '20100101',
  sggCode: '48121',
}))

afterAll(async () => {
  await admin.from('complexes').delete().like('kapt_code', `${TEST_PREFIX}%`)
})

describe('nameNormalize (unit)', () => {
  it('"OO자이아파트" → "oo자이"', () => {
    expect(nameNormalize('OO자이아파트')).toBe('oo자이')
  })

  it('공백·괄호·하이픈 제거', () => {
    expect(nameNormalize('창원 더샵 (1단지)')).toBe('창원더샵1단지')
  })

  it('NFC 정규화 + lowercase', () => {
    expect(nameNormalize('SAMSUNG래미안')).toBe('samsung래미안')
  })

  it('한자 수 + 단지/차 → 아라비아 수', () => {
    // '아파트'는 접미사(끝)일 때만 제거: "현대일단지아파트" → "현대1단지"
    expect(nameNormalize('현대일단지아파트')).toBe('현대1단지')
    expect(nameNormalize('롯데캐슬이차')).toBe('롯데캐슬2차')
  })

  it('접미사 없는 이름은 그대로', () => {
    expect(nameNormalize('래미안')).toBe('래미안')
  })
})

describe('seedComplex 멱등성 (integration)', () => {
  it('10건을 2회 upsert → 레코드 수 변화 없음', async () => {
    for (const c of TEST_COMPLEXES) await seedComplex(c, admin)
    const { count: count1 } = await admin
      .from('complexes')
      .select('*', { count: 'exact', head: true })
      .like('kapt_code', `${TEST_PREFIX}%`)

    for (const c of TEST_COMPLEXES) await seedComplex(c, admin)
    const { count: count2 } = await admin
      .from('complexes')
      .select('*', { count: 'exact', head: true })
      .like('kapt_code', `${TEST_PREFIX}%`)

    expect(count1).toBe(10)
    expect(count2).toBe(10)
  })

  it('seedComplex 결과에 id 포함', async () => {
    const result = await seedComplex(TEST_COMPLEXES[0]!, admin)
    expect(result.id).toBeTruthy()
  })
})
