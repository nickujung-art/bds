import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  if (!b || typeof b.campaign_id !== 'string' || !b.campaign_id) {
    return NextResponse.json({ error: 'campaign_id required' }, { status: 400 })
  }
  if (!['impression', 'click'].includes(b.event_type as string)) {
    return NextResponse.json({ error: 'invalid event_type' }, { status: 400 })
  }

  // service role으로 RLS 우회 (익명 방문자 이벤트도 기록)
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  await supabase.from('ad_events').insert({
    campaign_id: b.campaign_id as string,
    event_type:  b.event_type as string,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
