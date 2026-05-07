import type { NewListing } from '@/lib/data/presale'
import Link from 'next/link'

interface Props {
  listing: NewListing
}

function formatPrice(price: number | null | undefined): string {
  if (!price) return '미정'
  const uk = price / 10000
  return `${uk.toFixed(1)}억`
}

export function PresaleCard({ listing }: Props) {
  const inner = (
    <article
      aria-label={`${listing.name} 분양 정보`}
      className="card-flat"
      style={{
        padding: 20,
        cursor: listing.complex_id ? 'pointer' : 'default',
        transition: 'border-color 120ms ease, box-shadow 120ms ease',
      }}
    >
      {/* 상단 메타 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="chip sm outlined">{listing.region}</span>
        <span className="badge neutral" style={{ font: '500 11px/1 var(--font-sans)' }}>
          {listing.move_in_date
            ? new Date(listing.move_in_date)
                .toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit' })
                .replace('. ', '.')
                .replace('.', '')
            : '입주일 미정'}
        </span>
      </div>

      {/* 단지명 */}
      <div
        style={{
          font: '700 16px/1.3 var(--font-sans)',
          color: 'var(--fg-pri)',
          marginBottom: 6,
        }}
      >
        {listing.name}
      </div>

      {/* 분양가 */}
      <div
        className="tnum"
        aria-label={`${formatPrice(listing.price_min)}에서 ${formatPrice(listing.price_max)}`}
        style={{
          font: '700 22px/1.2 var(--font-sans)',
          color: 'var(--dj-orange)',
          marginBottom: 8,
        }}
      >
        {listing.price_min && listing.price_max && listing.price_min !== listing.price_max
          ? `${formatPrice(listing.price_min)} ~ ${formatPrice(listing.price_max)}`
          : formatPrice(listing.price_min ?? listing.price_max)}
      </div>

      {/* 보조 정보 */}
      <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
        {listing.total_units != null && (
          <span className="tnum">총 {listing.total_units}세대</span>
        )}
      </div>
    </article>
  )

  return listing.complex_id ? (
    <Link href={`/complexes/${listing.complex_id}`} style={{ textDecoration: 'none' }}>
      {inner}
    </Link>
  ) : (
    inner
  )
}
