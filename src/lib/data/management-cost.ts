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

  if (error || !data) return []
  return data as ManagementCostRow[]
}
