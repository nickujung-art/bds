import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/** 개발 전용 — 프로덕션에서는 Vercel 헬스체크로 대체 */
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ status: 'ok' })
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('complexes' as never).select('count').limit(1)

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ status: 'fail', error: error.message }, { status: 503 })
    }

    return NextResponse.json({ status: 'ok', db: 'connected' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ status: 'fail', error: message }, { status: 503 })
  }
}
