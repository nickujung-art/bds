import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type AdCampaign = Database['public']['Tables']['ad_campaigns']['Row']

// CRITICAL: 반드시 now() BETWEEN starts_at AND ends_at AND status='approved' 포함 (CLAUDE.md)
export async function getActiveAds(
  placement: 'banner_top' | 'sidebar' | 'in_feed',
  supabase: SupabaseClient<Database>,
): Promise<AdCampaign[]> {
  const now = new Date().toISOString()
  const { data } = await supabase
    .from('ad_campaigns')
    .select('*')
    .eq('placement', placement)
    .eq('status', 'approved')
    .lte('starts_at', now)
    .gte('ends_at', now)
    .order('created_at')
  return data ?? []
}

export async function getAllAdCampaigns(
  supabase: SupabaseClient<Database>,
): Promise<AdCampaign[]> {
  const { data } = await supabase
    .from('ad_campaigns')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}
