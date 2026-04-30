import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface ComplexDetail {
  id:              string
  canonical_name:  string
  road_address:    string | null
  si:              string | null
  gu:              string | null
  dong:            string | null
  built_year:      number | null
  household_count: number | null
  floors_above:    number | null
  sgg_code:        string
  status:          string
  lat:             number | null
  lng:             number | null
}

export interface MonthlyPriceSummary {
  yearMonth: string   // "YYYY-MM"
  avgPrice:  number   // 만원
  count:     number
  avgArea:   number
}

export async function getComplexById(
  id: string,
  supabase: SupabaseClient,
): Promise<ComplexDetail | null> {
  const { data, error } = await supabase
    .from('complexes')
    .select(`
      id, canonical_name, road_address,
      si, gu, dong,
      built_year, household_count, floors_above,
      sgg_code, status, lat, lng
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`getComplexById failed: ${error.message}`)
  return data as ComplexDetail | null
}

export async function getComplexTransactionSummary(
  complexId: string,
  dealType: 'sale' | 'jeonse' | 'monthly',
  supabase: SupabaseClient,
  months = 120,
): Promise<MonthlyPriceSummary[]> {
  const { data, error } = await supabase.rpc('complex_monthly_prices', {
    p_complex_id: complexId,
    p_deal_type:  dealType,
    p_months:     months,
  })

  if (error) throw new Error(`getComplexTransactionSummary failed: ${error.message}`)
  if (!data) return []

  return (data as { year_month: string; avg_price: number; count: number; avg_area: number }[]).map(
    (row) => ({
      yearMonth: row.year_month,
      avgPrice:  Number(row.avg_price),
      count:     Number(row.count),
      avgArea:   Number(row.avg_area),
    }),
  )
}
