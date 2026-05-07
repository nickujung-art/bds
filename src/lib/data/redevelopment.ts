import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface RedevelopmentProject {
  id: string
  complexId: string
  phase: string
  notes: string | null
  updatedAt: string
}

export async function getRedevelopmentProject(
  complexId: string,
  supabase: SupabaseClient<Database>,
): Promise<RedevelopmentProject | null> {
  const { data, error } = await supabase
    .from('redevelopment_projects')
    .select('id, complex_id, phase, notes, updated_at')
    .eq('complex_id', complexId)
    .maybeSingle()

  if (error) throw new Error(`getRedevelopmentProject failed: ${error.message}`)
  if (!data) return null

  return {
    id: data.id,
    complexId: data.complex_id ?? '',
    phase: data.phase,
    notes: data.notes ?? null,
    updatedAt: data.updated_at,
  }
}
