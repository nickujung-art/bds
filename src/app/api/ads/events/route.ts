import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { adEventRatelimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  // 1. IP 추출 (D-07)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? '127.0.0.1'

  // 2. Rate limit 체크 (D-06 — slidingWindow 100/1m)
  const { success, reset } = await adEventRatelimit.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      },
    )
  }

  // 3. Body 파싱 + 검증 (기존 로직 유지)
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

  // 4. IP hash 생성 — PII 비저장 (D-07)
  const secret = process.env.RATE_LIMIT_SECRET ?? ''
  const ip_hash = createHash('sha256').update(`${ip}:${secret}`).digest('hex')

  // 5. admin client로 INSERT (SEC-02 — createSupabaseAdminClient() 단일 경유)
  const supabase = createSupabaseAdminClient()
  await supabase.from('ad_events').insert({
    campaign_id: b.campaign_id,
    event_type: b.event_type as string,
    ip_hash,
  })

  return NextResponse.json({ ok: true }, { status: 201 })
}
