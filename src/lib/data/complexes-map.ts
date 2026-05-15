import type { SupabaseClient } from '@supabase/supabase-js'
import Supercluster from 'supercluster'

export interface ComplexMapItem {
  id:                  string
  canonical_name:      string
  lat:                 number
  lng:                 number
  sgg_code:            string
  // Phase 11 추가
  avg_sale_per_pyeong: number | null
  view_count:          number
  price_change_30d:    number | null
  tx_count_30d:        number
  status:              string
  built_year:          number | null
  household_count:     number | null
  hagwon_grade:        string | null
}

/**
 * complexes.hagwon_score (0~1 백분위) → 등급 문자열 변환.
 * 임계값은 src/lib/data/facility-edu.ts의 HagwonStats.grade 계산과 동일.
 * facility_edu 테이블 JOIN 없이 complexes 컬럼만 사용.
 */
function scoreToGradeInline(score: number | null): string | null {
  if (score === null) return null
  if (score >= 0.933) return 'A+'
  if (score >= 0.867) return 'A'
  if (score >= 0.800) return 'A-'
  if (score >= 0.700) return 'B+'
  if (score >= 0.600) return 'B'
  if (score >= 0.500) return 'B-'
  if (score >= 0.400) return 'C+'
  if (score >= 0.300) return 'C'
  if (score >= 0.200) return 'C-'
  return 'D'
}

export async function getComplexesForMap(
  sggCodes: string[],
  supabase: SupabaseClient,
): Promise<ComplexMapItem[]> {
  if (sggCodes.length === 0) return []

  const { data, error } = await supabase
    .from('complexes')
    .select(
      `id, canonical_name, lat, lng, sgg_code,
       avg_sale_per_pyeong, view_count, price_change_30d, tx_count_30d,
       status, built_year, household_count, hagwon_score`,
    )
    .in('sgg_code', sggCodes)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .neq('status', 'demolished')

  if (error) throw new Error(`getComplexesForMap failed: ${error.message}`)

  return (data ?? []).map((row) => {
    const r = row as {
      id:                  string
      canonical_name:      string
      lat:                 number
      lng:                 number
      sgg_code:            string
      avg_sale_per_pyeong: number | null
      view_count:          number
      price_change_30d:    number | null
      tx_count_30d:        number
      status:              string
      built_year:          number | null
      household_count:     number | null
      hagwon_score:        number | null
    }
    return {
      id:                  r.id,
      canonical_name:      r.canonical_name,
      lat:                 r.lat,
      lng:                 r.lng,
      sgg_code:            r.sgg_code,
      avg_sale_per_pyeong: r.avg_sale_per_pyeong ?? null,
      view_count:          r.view_count ?? 0,
      price_change_30d:    r.price_change_30d ?? null,
      tx_count_30d:        r.tx_count_30d ?? 0,
      status:              r.status ?? 'active',
      built_year:          r.built_year ?? null,
      household_count:     r.household_count ?? null,
      hagwon_grade:        scoreToGradeInline(r.hagwon_score ?? null),
    } satisfies ComplexMapItem
  })
}

// ── supercluster 래퍼 ──────────────────────────────────────

export type ClusterFeature = ReturnType<Supercluster['getClusters']>[number]

export function buildClusterIndex(complexes: ComplexMapItem[]) {
  const index = new Supercluster({ radius: 60, maxZoom: 12 })
  index.load(
    complexes.map((c) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
      properties: {
        id:                  c.id,
        name:                c.canonical_name,
        cluster:             false,
        avg_sale_per_pyeong: c.avg_sale_per_pyeong,
        view_count:          c.view_count,
        price_change_30d:    c.price_change_30d,
        tx_count_30d:        c.tx_count_30d,
        status:              c.status,
        built_year:          c.built_year,
        household_count:     c.household_count,
        hagwon_grade:        c.hagwon_grade,
      },
    })),
  )
  return index
}

export function clusterComplexes(
  complexes: ComplexMapItem[],
  bounds: [number, number, number, number],  // [westLng, southLat, eastLng, northLat]
  zoom: number,
): ClusterFeature[] {
  if (complexes.length === 0) return []
  return buildClusterIndex(complexes).getClusters(bounds, zoom)
}
