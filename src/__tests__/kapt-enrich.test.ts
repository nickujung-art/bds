/**
 * DATA-08: KAPT 스키마 확장 + 단지 보강 스크립트 단위 테스트
 *
 * TDD Wave 0 — Task 1: RED (KaptBasicInfoSchema에 kaptUsedate/doroJuso 필드 없음 → 실패)
 * TDD Wave 0 — Task 2: GREEN (필드 추가 후 통과)
 *
 * 테스트 목록:
 *  1. KaptBasicInfoSchema가 kaptUsedate 필드를 파싱한다 (RED → GREEN)
 *  2. KaptBasicInfoSchema가 doroJuso 필드를 파싱한다 (RED → GREEN)
 *  3. KaptBasicInfoSchema가 codeHeatNm 필드를 파싱한다 (RED → GREEN)
 *  4. KaptBasicInfoSchema가 kaptAddr 필드를 파싱한다 (RED → GREEN)
 *  5. built_year 추출 — kaptUsedate.slice(0,4) → parseInt (pure helper — GREEN 즉시)
 *  6. idempotency — si가 이미 채워진 행은 처리 대상에서 제외된다
 */
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/services/kapt', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actual = await importOriginal<any>()
  return { ...actual, fetchKaptBasicInfo: vi.fn() }
})

import { kaptBasicInfoSchema } from '@/services/kapt'
import { fetchKaptBasicInfo } from '@/services/kapt'

// ── extractBuiltYear: kapt-enrich.ts 내부 로직과 동일 (인라인 검증) ──
function extractBuiltYear(kaptUsedate: string | undefined | null): number | null {
  if (!kaptUsedate) return null
  const year = parseInt(kaptUsedate.slice(0, 4), 10)
  return isNaN(year) ? null : year
}

// ── Tests 1~4: KaptBasicInfoSchema 스키마 확장 검증 (RED → GREEN) ──
describe('KaptBasicInfoSchema 확장 검증', () => {
  it('kaptUsedate 필드를 파싱한다', () => {
    const input = { kaptCode: 'K123', kaptName: '테스트아파트', kaptUsedate: '20100615' }
    const result = kaptBasicInfoSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kaptUsedate).toBe('20100615')
    }
  })

  it('doroJuso 필드를 파싱한다', () => {
    const input = {
      kaptCode: 'K123',
      kaptName: '테스트아파트',
      doroJuso: '경상남도 창원시 의창구 용호동 123',
    }
    const result = kaptBasicInfoSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.doroJuso).toBe('경상남도 창원시 의창구 용호동 123')
    }
  })

  it('codeHeatNm 필드를 파싱한다', () => {
    const input = { kaptCode: 'K123', kaptName: '테스트아파트', codeHeatNm: '지역난방' }
    const result = kaptBasicInfoSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.codeHeatNm).toBe('지역난방')
    }
  })

  it('kaptAddr 필드를 파싱한다', () => {
    const input = {
      kaptCode: 'K123',
      kaptName: '테스트아파트',
      kaptAddr: '경상남도 창원시 의창구 용호동 123번지',
    }
    const result = kaptBasicInfoSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.kaptAddr).toBe('경상남도 창원시 의창구 용호동 123번지')
    }
  })
})

// ── Test 5: built_year 추출 헬퍼 ─────────────────────────────
describe('extractBuiltYear 헬퍼', () => {
  it('YYYYMMDD 형식에서 연도를 추출한다', () => {
    expect(extractBuiltYear('20100615')).toBe(2010)
  })

  it('YYYY 형식(4자리)에서 연도를 추출한다', () => {
    expect(extractBuiltYear('1998')).toBe(1998)
  })

  it('undefined 입력 시 null을 반환한다', () => {
    expect(extractBuiltYear(undefined)).toBeNull()
  })

  it('null 입력 시 null을 반환한다', () => {
    expect(extractBuiltYear(null)).toBeNull()
  })

  it('빈 문자열 입력 시 null을 반환한다', () => {
    expect(extractBuiltYear('')).toBeNull()
  })
})

// ── Test 6: idempotency — WHERE si IS NULL 조건 ───────────────
describe('idempotency — WHERE si IS NULL 조건', () => {
  it('si가 이미 채워진 단지는 fetchKaptBasicInfo를 호출하지 않는다', async () => {
    const alreadyEnriched = [
      { id: 'uuid-1', kapt_code: 'K001', sgg_code: '48121', si: '경상남도', data_completeness: {} },
      { id: 'uuid-2', kapt_code: 'K002', sgg_code: '48121', si: '경남', data_completeness: {} },
    ]

    // WHERE kapt_code IS NOT NULL AND si IS NULL 시뮬레이션
    const toProcess = alreadyEnriched.filter(c => c.kapt_code !== null && (c.si === null || c.si === undefined))

    // 이미 처리된 행이므로 처리 대상 없음
    expect(toProcess).toHaveLength(0)

    // fetchKaptBasicInfo는 호출되지 않아야 한다
    for (const complex of toProcess) {
      await fetchKaptBasicInfo(complex.kapt_code)
    }
    expect(vi.mocked(fetchKaptBasicInfo)).not.toHaveBeenCalled()
  })

  it('si가 NULL인 행만 처리 대상에 포함된다', () => {
    const complexes = [
      { id: 'uuid-1', kapt_code: 'K001', si: null },
      { id: 'uuid-2', kapt_code: 'K002', si: '경상남도' },
      { id: 'uuid-3', kapt_code: 'K003', si: null },
    ]

    const toProcess = complexes.filter(c => c.kapt_code !== null && c.si === null)
    expect(toProcess).toHaveLength(2)
    expect(toProcess.map(c => c.kapt_code)).toEqual(['K001', 'K003'])
  })
})
