import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { generatePriceAlerts } from '@/lib/notifications/generate-alerts'
import { deliverPendingNotifications } from '@/lib/notifications/deliver'

export const runtime = 'nodejs'

export async function POST(request: Request): Promise<NextResponse> {
  const secret = request.headers.get('x-cron-secret')
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  const generated = await generatePriceAlerts(supabase)
  const { sent, failed } = await deliverPendingNotifications(supabase)

  return NextResponse.json({ generated, sent, failed })
}
