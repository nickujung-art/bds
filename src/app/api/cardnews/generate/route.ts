import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getRankingsByType } from '@/lib/data/rankings'
import { CardnewsLayout } from './CardnewsLayout'

// Edge runtime은 TTF 4MB 한도 초과 → nodejs 필수 (RESEARCH.md Pitfall 1)
export const runtime = 'nodejs'

export async function GET(_request: Request): Promise<Response> {
  // 1. 인증 확인
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // 2. 관리자 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes((profile as { role: string }).role ?? '')) {
    return new Response('Forbidden', { status: 403 })
  }

  // 3. 폰트 + 랭킹 데이터 로드
  const fontData = readFileSync(join(process.cwd(), 'public/fonts/PretendardSubset.ttf'))
  const readonly = createReadonlyClient()
  const rankings = await getRankingsByType(readonly, 'high_price', 5)

  // 4. ImageResponse 1080×1080
  // JSX는 CardnewsLayout.tsx에서 관리. route.ts는 JSX-free (Vitest esbuild 호환)
  const img = new ImageResponse(
    createElement(CardnewsLayout, { rankings }),
    {
      width: 1080,
      height: 1080,
      fonts: [{ name: 'Pretendard', data: fontData, style: 'normal', weight: 700 }],
    },
  )

  // 5. Content-Disposition: attachment (다운로드 트리거)
  const headers = new Headers(img.headers)
  headers.set('Content-Disposition', 'attachment; filename="cardnews.png"')
  headers.set('Cache-Control', 'no-store')
  return new Response(img.body, { status: img.status, headers })
}
