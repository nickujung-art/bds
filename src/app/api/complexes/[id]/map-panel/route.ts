import { NextResponse } from 'next/server'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getMapPanelData } from '@/lib/data/map-panel'

export const runtime = 'nodejs'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 })
  }

  const supabase = createReadonlyClient()

  try {
    const data = await getMapPanelData(id, supabase)
    if (!data) return NextResponse.json(null, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
