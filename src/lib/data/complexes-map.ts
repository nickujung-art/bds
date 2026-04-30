import type { SupabaseClient } from '@supabase/supabase-js'
import Supercluster from 'supercluster'

export interface ComplexMapItem {
  id:             string
  canonical_name: string
  lat:            number
  lng:            number
  sgg_code:       string
}

export async function getComplexesForMap(
  sggCodes: string[],
  supabase: SupabaseClient,
): Promise<ComplexMapItem[]> {
  if (sggCodes.length === 0) return []

  const { data, error } = await supabase
    .from('complexes')
    .select('id, canonical_name, lat, lng, sgg_code')
    .in('sgg_code', sggCodes)
    .not('lat', 'is', null)
    .not('lng', 'is', null)

  if (error) throw new Error(`getComplexesForMap failed: ${error.message}`)
  return (data ?? []) as ComplexMapItem[]
}

// ── supercluster 래퍼 (순수 함수) ─────────────────────────

export type ClusterFeature = ReturnType<Supercluster['getClusters']>[number]

export function clusterComplexes(
  complexes: ComplexMapItem[],
  bounds: [number, number, number, number],  // [westLng, southLat, eastLng, northLat]
  zoom: number,
): ClusterFeature[] {
  if (complexes.length === 0) return []

  const index = new Supercluster({ radius: 60, maxZoom: 16 })
  index.load(
    complexes.map((c) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [c.lng, c.lat] },
      properties: { id: c.id, name: c.canonical_name, cluster: false },
    })),
  )

  return index.getClusters(bounds, zoom)
}
