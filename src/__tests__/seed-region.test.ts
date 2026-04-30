/**
 * Step3 수용 기준 통합 테스트
 * - data_sources 6건 이상
 * - regions 창원·김해 sgg_code 6건
 * - sgg_code: 국토부 LAWD_CD + 행안부 admCd 형식 검증
 */
import { describe, it, expect } from 'vitest'
import { admin } from './helpers/db'

// 경상남도(48) 창원·김해 시군구코드 (국토부 LAWD_CD 기준)
const TARGET_SGG_CODES = ['48121', '48123', '48125', '48127', '48129', '48250'] as const
const LAWD_CD_REGEX = /^\d{5}$/

describe('step3: sgg_code 형식 (unit)', () => {
  it('국토부 LAWD_CD: 5자리 숫자 형식', () => {
    for (const code of TARGET_SGG_CODES) {
      expect(code).toMatch(LAWD_CD_REGEX)
    }
  })

  it('행안부 admCd 호환: 시도코드 48(경남) 접두사', () => {
    // 행안부 admCd = 시도(2)+시군구(3)+읍면동(5) = 10자리
    // sgg_code 5자리는 admCd 앞 5자리와 동일
    for (const code of TARGET_SGG_CODES) {
      expect(code.startsWith('48')).toBe(true)
    }
  })

  it('창원시 구코드: 481XX 범위', () => {
    const changwonCodes = TARGET_SGG_CODES.filter(c => c.startsWith('481'))
    expect(changwonCodes).toHaveLength(5)
  })

  it('김해시 코드: 48250', () => {
    expect(TARGET_SGG_CODES).toContain('48250')
  })
})

describe('step3: DB 시드 (integration)', () => {
  it('data_sources: 6건 이상 존재', async () => {
    const { count, error } = await admin
      .from('data_sources')
      .select('*', { count: 'exact', head: true })
    expect(error).toBeNull()
    expect(count).toBeGreaterThanOrEqual(6)
  })

  it('data_sources: cadence 값 유효', async () => {
    const { data, error } = await admin.from('data_sources').select('id, cadence')
    expect(error).toBeNull()
    const validCadences = ['daily', 'monthly', 'quarterly', 'annual', 'event', 'manual']
    for (const row of data ?? []) {
      expect(validCadences).toContain(row.cadence)
    }
  })

  it('regions: 창원·김해 sgg_code 6건 존재', async () => {
    const { data, error } = await admin
      .from('regions')
      .select('sgg_code')
      .in('sgg_code', TARGET_SGG_CODES)
    expect(error).toBeNull()
    expect(data).toHaveLength(6)
  })

  it('regions.sgg_code: 전체 레코드 LAWD_CD 형식 일치', async () => {
    const { data, error } = await admin.from('regions').select('sgg_code')
    expect(error).toBeNull()
    for (const row of data ?? []) {
      expect(row.sgg_code, `sgg_code '${row.sgg_code}' must match ${LAWD_CD_REGEX}`).toMatch(LAWD_CD_REGEX)
    }
  })
})
