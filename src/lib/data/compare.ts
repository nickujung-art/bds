import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getComplexById } from './complex-detail'

export interface ComplexSummary {
  id:                   string
  canonical_name:       string
  built_year:           number | null
  household_count:      number | null
  road_address:         string | null
  si:                   string | null
  gu:                   string | null
  dong:                 string | null
  latestSalePrice:      number | null   // 만원
  latestSalePricePerPy: number | null  // 평당가 만원
  latestJeonsePrice:    number | null
  areaRange:            string | null   // "59~84㎡"
  schoolScore:          number | null
  redevelopmentPhase:   string | null
  heatType:             string | null
}

/**
 * T-8-05: URL 조작 방지 — 최대 4개 제한, falsy 필터링
 */
export function buildCompareIds(ids: (string | null | undefined)[]): string[] {
  return ids
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
    .slice(0, 4)
}

async function getLatestTransactionData(
  complexId: string,
  supabase: SupabaseClient,
): Promise<{
  latestSalePrice:      number | null
  latestSalePricePerPy: number | null
  latestJeonsePrice:    number | null
  areaRange:            string | null
}> {
  try {
    // 3개 쿼리를 Promise.all로 병렬화 (단지당 쿼리 비용 절감)
    const [
      { data: saleData },
      { data: jeonseData },
      { data: areaData },
    ] = await Promise.all([
      supabase
        .from('transactions')
        .select('price, area_m2')
        .eq('complex_id', complexId)
        .eq('deal_type', 'sale')
        .is('cancel_date', null)
        .is('superseded_by', null)
        .order('deal_date', { ascending: false })
        .limit(1),
      supabase
        .from('transactions')
        .select('price')
        .eq('complex_id', complexId)
        .eq('deal_type', 'jeonse')
        .is('cancel_date', null)
        .is('superseded_by', null)
        .order('deal_date', { ascending: false })
        .limit(1),
      supabase
        .from('transactions')
        .select('area_m2')
        .eq('complex_id', complexId)
        .is('cancel_date', null)
        .is('superseded_by', null)
        .order('area_m2', { ascending: true }),
    ])

    const latest     = saleData?.[0] as { price: number; area_m2: number } | undefined
    const latestJeon = jeonseData?.[0] as { price: number } | undefined

    const areas  = (areaData ?? []).map(r => (r as { area_m2: number }).area_m2).filter(Boolean)
    const minArea = areas.length ? Math.min(...areas) : null
    const maxArea = areas.length ? Math.max(...areas) : null
    const areaRange =
      minArea && maxArea && minArea !== maxArea
        ? `${Math.round(minArea)}~${Math.round(maxArea)}㎡`
        : minArea
          ? `${Math.round(minArea)}㎡`
          : null

    const pricePerPy = latest?.area_m2
      ? Math.round(latest.price / (latest.area_m2 / 3.3058))
      : null

    return {
      latestSalePrice:      latest?.price ?? null,
      latestSalePricePerPy: pricePerPy,
      latestJeonsePrice:    latestJeon?.price ?? null,
      areaRange,
    }
  } catch {
    // 거래 데이터 조회 실패 시 null로 graceful 처리 (테스트/개발 환경 대응)
    return {
      latestSalePrice:      null,
      latestSalePricePerPy: null,
      latestJeonsePrice:    null,
      areaRange:            null,
    }
  }
}

export async function getCompareData(
  ids: string[],
  supabase: SupabaseClient,
): Promise<ComplexSummary[]> {
  const validIds = buildCompareIds(ids)
  if (validIds.length === 0) return []

  const results = await Promise.all(
    validIds.map(async id => {
      const detail = await getComplexById(id, supabase)
      if (!detail) return null

      const txData = await getLatestTransactionData(id, supabase)

      return {
        id:                   detail.id,
        canonical_name:       detail.canonical_name,
        built_year:           detail.built_year,
        household_count:      detail.household_count,
        road_address:         detail.road_address,
        si:                   detail.si,
        gu:                   detail.gu,
        dong:                 detail.dong,
        latestSalePrice:      txData.latestSalePrice,
        latestSalePricePerPy: txData.latestSalePricePerPy,
        latestJeonsePrice:    txData.latestJeonsePrice,
        areaRange:            txData.areaRange,
        schoolScore:          null,  // Phase 6 데이터 (미수집 시 null)
        redevelopmentPhase:   null,  // redevelopment_timelines 연동 optional
        heatType:             null,  // facility_kapt 연동 optional
      } satisfies ComplexSummary
    }),
  )

  const filtered: ComplexSummary[] = []
  for (const c of results) {
    if (c !== null) filtered.push(c)
  }
  return filtered
}
