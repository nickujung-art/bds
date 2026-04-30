import type { SupabaseClient } from '@supabase/supabase-js'

export interface ComplexSearchResult {
  id:             string
  canonical_name: string
  road_address:   string | null
  si:             string | null
  gu:             string | null
  dong:           string | null
  sgg_code:       string
  lat:            number | null
  lng:            number | null
  similarity:     number
}

export async function searchComplexes(
  query: string,
  sggCodes: string[],
  supabase: SupabaseClient,
  limit = 20,
): Promise<ComplexSearchResult[]> {
  const q = query.trim()
  if (!q || sggCodes.length === 0) return []

  const { data, error } = await supabase.rpc('search_complexes', {
    p_query:     q,
    p_sgg_codes: sggCodes,
    p_limit:     limit,
  })

  if (error) throw new Error(`searchComplexes failed: ${error.message}`)
  return (data ?? []) as ComplexSearchResult[]
}
