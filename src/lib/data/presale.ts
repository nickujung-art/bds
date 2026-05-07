// 분양 공고 마스터 (Phase 4에서 신규 생성)
export interface NewListing {
  id: string
  name: string
  region: string
  complex_id: string | null
  price_min: number | null
  price_max: number | null
  total_units: number | null
  move_in_date: string | null
  fetched_at: string
}

// 분양권전매 실거래 (transactions 대원칙 적용)
export interface PresaleTransaction {
  id: string
  listing_id: string
  area: number | null
  floor: number | null
  price: number
  deal_date: string
  cancel_date: string | null
  superseded_by: string | null
  created_at: string
}

// Phase 4 테이블은 database.ts에 아직 미반영 — SupabaseClient의 제네릭에 구애받지 않는 최소 인터페이스 사용
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = { from: (table: string) => any }

export async function getActiveListings(
  supabase: AnySupabaseClient,
  limit = 20,
): Promise<NewListing[]> {
  const { data } = await supabase
    .from('new_listings')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(limit)
  return (data as NewListing[] | null) ?? []
}

export async function getPresaleTransactions(
  listingId: string,
  supabase: AnySupabaseClient,
): Promise<PresaleTransaction[]> {
  const { data } = await supabase
    .from('presale_transactions')
    .select('*')
    .eq('listing_id', listingId)
    .is('cancel_date', null) // transactions 대원칙
    .is('superseded_by', null) // transactions 대원칙
    .order('deal_date', { ascending: false })
  return (data as PresaleTransaction[] | null) ?? []
}
