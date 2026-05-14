import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ManagementCostRow {
  year_month:              string  // "YYYY-MM-01"
  common_cost_total:       number | null
  labor_cost:              number | null
  cleaning_cost:           number | null
  guard_cost:              number | null
  disinfection_cost:       number | null
  elevator_cost:           number | null
  repair_cost:             number | null
  network_cost:            number | null
  vehicle_cost:            number | null
  consignment_fee:         number | null
  individual_cost_total:   number | null
  electricity_cost:        number | null
  water_cost:              number | null
  heating_cost:            number | null
  hot_water_cost:          number | null
  gas_cost:                number | null
  long_term_repair_monthly: number | null
}

export async function getManagementCostMonthly(
  complexId: string,
  supabase: SupabaseClient,
): Promise<ManagementCostRow[]> {
  const { data, error } = await supabase
    .from('management_cost_monthly')
    .select(
      'year_month,common_cost_total,labor_cost,cleaning_cost,guard_cost,disinfection_cost,elevator_cost,repair_cost,network_cost,vehicle_cost,consignment_fee,individual_cost_total,electricity_cost,water_cost,heating_cost,hot_water_cost,gas_cost,long_term_repair_monthly',
    )
    .eq('complex_id', complexId)
    .order('year_month', { ascending: false })
    .limit(6)

  if (error) {
    console.error('[management-cost] getManagementCostMonthly 조회 실패:', error.message)
    return []
  }
  if (!data) return []
  return data as ManagementCostRow[]
}

export interface SeasonalAverages {
  summerAvg:     number | null  // 하절기 (6~9월) 총 단지 합계 월평균
  winterAvg:     number | null  // 동절기 (10~3월) 총 단지 합계 월평균
  summerPerUnit: number | null  // 세대당 하절기 월평균
  winterPerUnit: number | null  // 세대당 동절기 월평균
  summerCount:   number         // 하절기 row 개수
  winterCount:   number         // 동절기 row 개수
}

function monthOf(yearMonth: string): number {
  // "YYYY-MM-01" → 6,7,8,9,...
  return parseInt(yearMonth.slice(5, 7), 10)
}

function isSummer(m: number): boolean {
  return m >= 6 && m <= 9
}

function isWinter(m: number): boolean {
  return m >= 10 || m <= 3
}

function rowTotal(r: ManagementCostRow): number {
  return (r.common_cost_total ?? 0)
    + (r.individual_cost_total ?? 0)
    + (r.long_term_repair_monthly ?? 0)
}

/**
 * UX-04 — 하절기(6~9월) vs 동절기(10~3월) 월평균 집계
 * 호출자(ManagementCostCard)가 summerCount/winterCount로 D-08 "4개월 이상 데이터 있을 때만 표시" 분기 결정.
 * 평균은 단지 합계 기준. 세대당은 합계 / householdCount.
 */
export function getSeasonalAverages(
  rows: ManagementCostRow[],
  householdCount: number | null,
): SeasonalAverages {
  const summer = rows.filter(r => isSummer(monthOf(r.year_month)))
  const winter = rows.filter(r => isWinter(monthOf(r.year_month)))

  const avg = (subset: ManagementCostRow[]): number | null => {
    if (subset.length === 0) return null
    const total = subset.reduce((sum, r) => sum + rowTotal(r), 0)
    return Math.round(total / subset.length)
  }

  const perUnit = (av: number | null): number | null => {
    if (av == null) return null
    if (householdCount == null || householdCount <= 0) return null
    return Math.round(av / householdCount)
  }

  const summerAvg = avg(summer)
  const winterAvg = avg(winter)

  return {
    summerAvg,
    winterAvg,
    summerPerUnit: perUnit(summerAvg),
    winterPerUnit: perUnit(winterAvg),
    summerCount: summer.length,
    winterCount: winter.length,
  }
}
