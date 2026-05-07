import type { Metadata } from 'next'
import Link from 'next/link'
import { createReadonlyClient } from '@/lib/supabase/readonly'
import { getActiveListings } from '@/lib/data/presale'
import { PresaleCard } from '@/components/presale/PresaleCard'

export const revalidate = 3600 // 1시간 (일배치 갱신 주기에 맞춤)

export const metadata: Metadata = {
  title: '신축 분양 | 단지온도',
  description: '창원·김해 신축 분양 정보. 분양가, 세대수, 입주예정일을 확인하세요.',
}

export default async function PresalePage() {
  const supabase = createReadonlyClient()
  const listings = await getActiveListings(supabase, 30)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg-canvas)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          padding: '16px 24px',
          borderBottom: '1px solid var(--line-default)',
        }}
      >
        <nav
          style={{
            display: 'flex',
            gap: 24,
            font: '600 14px/1 var(--font-sans)',
          }}
        >
          <Link href="/" style={{ color: 'var(--fg-sec)', textDecoration: 'none' }}>
            홈
          </Link>
          <Link href="/map" style={{ color: 'var(--fg-sec)', textDecoration: 'none' }}>
            지도
          </Link>
          <Link href="/presale" style={{ color: 'var(--dj-orange)', textDecoration: 'none' }}>
            분양
          </Link>
          <Link href="/favorites" style={{ color: 'var(--fg-sec)', textDecoration: 'none' }}>
            관심단지
          </Link>
        </nav>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              font: '700 22px/1.3 var(--font-sans)',
              letterSpacing: '-0.02em',
              margin: '0 0 8px',
              color: 'var(--fg-pri)',
            }}
          >
            창원·김해 신축 분양
          </h1>
          <p
            style={{
              font: '500 13px/1.4 var(--font-sans)',
              color: 'var(--fg-sec)',
              margin: 0,
            }}
          >
            MOLIT 분양권전매 데이터 기준
          </p>
        </div>

        {listings.length === 0 ? (
          <div style={{ padding: '64px 0', textAlign: 'center' }}>
            <p
              style={{
                font: '500 13px/1.6 var(--font-sans)',
                color: 'var(--fg-tertiary)',
                margin: 0,
              }}
            >
              아직 등록된 분양 정보가 없습니다.
              <br />
              국토부 데이터가 업데이트되면 표시됩니다.
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {listings.map((listing) => (
              <PresaleCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
