import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { generatePriceAlerts } from '@/lib/notifications/generate-alerts'
import { deliverPendingNotifications } from '@/lib/notifications/deliver'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const generated = await generatePriceAlerts(supabase)
  const { sent, failed } = await deliverPendingNotifications(supabase)

  return NextResponse.json({ generated, sent, failed })
}
