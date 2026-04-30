import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface SitemapEntry {
  id:         string
  updated_at: string
}

export async function getComplexesForSitemap(
  supabase: SupabaseClient<Database>,
): Promise<SitemapEntry[]> {
  const { data } = await supabase
    .from('complexes')
    .select('id, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(50000)
  return data ?? []
}
