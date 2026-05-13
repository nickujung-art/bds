import type { ManagementCostRow } from '@/lib/data/management-cost'

interface Props {
  rows: ManagementCostRow[]
  householdCount: number | null
}

function fmtWon(val: number | null): string {
  if (val === null || val === 0) return '—'
  if (val >= 100_000_000) {
    const uk = Math.floor(val / 100_000_000)
    const rem = Math.floor((val % 100_000_000) / 10_000)
    return rem > 0 ? `${uk}억 ${rem.toLocaleString('ko-KR')}만원` : `${uk}억원`
  }
  if (val >= 10_000) return `${Math.floor(val / 10_000).toLocaleString('ko-KR')}만원`
  return `${val.toLocaleString('ko-KR')}원`
}

function fmtMonth(dateStr: string): string {
  // "2026-01-01" → "2026.01"
  return dateStr.slice(0, 7).replace('-', '.')
}

const COST_LABELS: Array<{ key: keyof ManagementCostRow; label: string }> = [
  { key: 'common_cost_total',     label: '공용관리비' },
  { key: 'labor_cost',            label: '인건비' },
  { key: 'cleaning_cost',         label: '청소비' },
  { key: 'guard_cost',            label: '경비비' },
  { key: 'elevator_cost',         label: '승강기유지비' },
  { key: 'repair_cost',           label: '수선비' },
  { key: 'consignment_fee',       label: '위탁관리수수료' },
  { key: 'individual_cost_total', label: '개별사용료' },
  { key: 'electricity_cost',      label: '전기료' },
  { key: 'water_cost',            label: '수도료' },
  { key: 'heating_cost',          label: '난방비' },
  { key: 'gas_cost',              label: '가스료' },
  { key: 'long_term_repair_monthly', label: '장기수선충당금' },
]

export function ManagementCostCard({ rows, householdCount }: Props) {
  if (rows.length === 0) return null

  const latest = rows[0]!
  const total =
    (latest.common_cost_total ?? 0) +
    (latest.individual_cost_total ?? 0) +
    (latest.long_term_repair_monthly ?? 0)

  const perUnit =
    householdCount && householdCount > 0 && total > 0
      ? Math.round(total / householdCount)
      : null

  const visibleItems = COST_LABELS.filter(
    ({ key }) => (latest[key] as number | null) !== null && (latest[key] as number | null)! > 0,
  )

  return (
    <div className="card" style={{ padding: 20 }}>
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'baseline',
          marginBottom:   12,
        }}
      >
        <h3 style={{ font: '700 15px/1.4 var(--font-sans)', margin: 0 }}>
          관리비
        </h3>
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
          K-apt 기준 · {fmtMonth(latest.year_month)}
        </span>
      </div>

      {/* 합계 + 세대당 */}
      <div
        style={{
          display:      'flex',
          gap:          16,
          marginBottom: 16,
          padding:      '12px 0',
          borderBottom: '1px solid var(--line-subtle)',
        }}
      >
        <div>
          <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginBottom: 4 }}>
            단지 합계
          </div>
          <div className="tnum" style={{ font: '700 20px/1 var(--font-sans)' }}>
            {fmtWon(total)}
          </div>
        </div>
        {perUnit !== null && (
          <div>
            <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginBottom: 4 }}>
              세대당 (평균)
            </div>
            <div className="tnum" style={{ font: '700 20px/1 var(--font-sans)', color: 'var(--dj-orange)' }}>
              {perUnit.toLocaleString('ko-KR')}원
            </div>
          </div>
        )}
      </div>

      {/* 항목별 내역 */}
      <div>
        {visibleItems.map((item, i) => (
          <div
            key={item.key}
            style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
              padding:        '8px 0',
              borderBottom:   i < visibleItems.length - 1 ? '1px solid var(--line-subtle)' : 'none',
            }}
          >
            <span style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-sec)' }}>
              {item.label}
            </span>
            <span className="tnum" style={{ font: '500 13px/1 var(--font-sans)', color: 'var(--fg-pri)' }}>
              {fmtWon(latest[item.key] as number | null)}
            </span>
          </div>
        ))}
      </div>

      {/* 월별 추이 (최대 4개월) */}
      {rows.length > 1 && (
        <div
          style={{
            marginTop:    16,
            paddingTop:   12,
            borderTop:    '1px solid var(--line-subtle)',
          }}
        >
          <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginBottom: 8 }}>
            월별 합계 추이
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[...rows].reverse().map(row => {
              const t =
                (row.common_cost_total ?? 0) +
                (row.individual_cost_total ?? 0) +
                (row.long_term_repair_monthly ?? 0)
              return (
                <div key={row.year_month} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginBottom: 4 }}>
                    {fmtMonth(row.year_month)}
                  </div>
                  <div className="tnum" style={{ font: '600 12px/1 var(--font-sans)' }}>
                    {fmtWon(t)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
