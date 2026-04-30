import 'server-only'
import { Resend } from 'resend'
import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const BATCH_SIZE = 50

function initWebPush() {
  const pub  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (pub && priv) {
    webpush.setVapidDetails('mailto:support@danjiondo.kr', pub, priv)
    return true
  }
  return false
}

async function sendEmail(
  resend: Resend,
  to: string,
  subject: string,
  body: string,
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL ?? 'danjiondo <onboarding@resend.dev>'
  await resend.emails.send({ from, to, subject, html: `<p>${body}</p>` })
}

async function sendPushToUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  payload: string,
): Promise<void> {
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  for (const sub of subs ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = sub as any
    await webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      payload,
    )
  }
}

export async function deliverPendingNotifications(
  supabase: SupabaseClient<Database>,
): Promise<{ sent: number; failed: number }> {
  const resendKey = process.env.RESEND_API_KEY
  const resend    = resendKey ? new Resend(resendKey) : null
  const pushReady = initWebPush()

  const { data: pending } = await supabase
    .from('notifications')
    .select('id, user_id, title, body, type')
    .eq('status', 'pending')
    .order('created_at')
    .limit(BATCH_SIZE)

  if (!pending?.length) return { sent: 0, failed: 0 }

  let sent   = 0
  let failed = 0

  for (const n of pending) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notif = n as any
    try {
      // 이메일 주소: auth.admin API로 조회
      // service role 클라이언트는 auth.admin을 지원하지만 타입에 없어서 캐스팅
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: authUser } = await (supabase as any).auth.admin.getUserById(notif.user_id)
      const email = authUser?.user?.email as string | undefined

      if (resend && email) {
        await sendEmail(resend, email, notif.title as string, notif.body as string)
      }

      if (pushReady) {
        const payload = JSON.stringify({
          title: notif.title,
          body:  notif.body,
        })
        await sendPushToUser(supabase, notif.user_id as string, payload)
      }

      await supabase
        .from('notifications')
        .update({ status: 'sent', delivered_at: new Date().toISOString() })
        .eq('id', notif.id as string)

      sent++
    } catch {
      await supabase
        .from('notifications')
        .update({ status: 'failed' })
        .eq('id', notif.id as string)
      failed++
    }
  }

  return { sent, failed }
}
