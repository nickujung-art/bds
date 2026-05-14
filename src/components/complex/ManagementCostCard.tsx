import type { ManagementCostRow } from '@/lib/data/management-cost'
import { getSeasonalAverages } from '@/lib/data/management-cost'
import type { SeasonalAverages } from '@/lib/data/management-cost'

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

function rowTotal(row: ManagementCostRow): number {
  return (row.common_cost_total ?? 0)
    + (row.individual_cost_total ?? 0)
    + (row.long_term_repair_monthly ?? 0)
}

/**
 * UX-04 (D-08): 계절별 표시 + 항목별 상세 내역 제거
 * - 4개월 이상 데이터 있을 때 계절 비교 표시
 * - summerCount/winterCount 중 하나가 0이면 해당 계절은 "데이터 부족" 표시
 * - 전체 데이터 부족 (summerCount + winterCount < 4) 시 월별 추이 fallback
 */
export function ManagementCostCard({ rows, householdCount }: Props) {
  if (rows.length === 0) return null

  const latest = rows[0]!
  const seasonal = getSeasonalAverages(rows, householdCount)
  const totalSeasonRows = seasonal.summerCount + seasonal.winterCount
  const hasSeasonalData = totalSeasonRows >= 4  // D-08: 4개월 이상 조건

  return (
    <div className="card" style={{ padding: 20 }}>
      {/* 헤더 */}
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
          K-apt 기준 · 최근 {fmtMonth(latest.year_month)}
        </span>
      </div>

      {hasSeasonalData ? (
        <SeasonalView seasonal={seasonal} />
      ) : (
        <FallbackTotalsView rows={rows} householdCount={householdCount} />
      )}

      {/* 월별 합계 추이 (참고용 — 항상 표시) */}
      {rows.length > 1 && (
        <div
          style={{
            marginTop:  16,
            paddingTop: 12,
            borderTop:  '1px solid var(--line-subtle)',
          }}
        >
          <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginBottom: 8 }}>
            월별 합계 추이
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[...rows].reverse().map(row => (
              <div key={row.year_month} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginBottom: 4 }}>
                  {fmtMonth(row.year_month)}
                </div>
                <div className="tnum" style={{ font: '600 12px/1 var(--font-sans)' }}>
                  {fmtWon(rowTotal(row))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SeasonalView({ seasonal }: { seasonal: SeasonalAverages }) {
  return (
    <div
      style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:                 12,
        padding:             '4px 0 12px',
        borderBottom:        '1px solid var(--line-subtle)',
      }}
    >
      <SeasonBlock
        label="하절기 (6~9월)"
        avg={seasonal.summerAvg}
        perUnit={seasonal.summerPerUnit}
        count={seasonal.summerCount}
      />
      <SeasonBlock
        label="동절기 (10~3월)"
        avg={seasonal.winterAvg}
        perUnit={seasonal.winterPerUnit}
        count={seasonal.winterCount}
      />
    </div>
  )
}

interface SeasonBlockProps {
  label:   string
  avg:     number | null
  perUnit: number | null
  count:   number
}

function SeasonBlock({ label, avg, perUnit, count }: SeasonBlockProps) {
  return (
    <div>
      <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginBottom: 6 }}>
        {label}
      </div>
      {count === 0 ? (
        <div style={{ font: '500 13px/1.4 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
          데이터 부족
        </div>
      ) : (
        <>
          <div className="tnum" style={{ font: '700 20px/1 var(--font-sans)', color: 'var(--dj-orange)' }}>
            {fmtWon(avg)}
          </div>
          {perUnit !== null && (
            <div style={{ font: '500 12px/1.4 var(--font-sans)', color: 'var(--fg-sec)', marginTop: 4 }}>
              세대당 약 {fmtWon(perUnit)}
            </div>
          )}
          <div style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginTop: 4 }}>
            {count}개월 평균
          </div>
        </>
      )}
    </div>
  )
}

function FallbackTotalsView({
  rows,
  householdCount,
}: {
  rows: ManagementCostRow[]
  householdCount: number | null
}) {
  const latest = rows[0]!
  const total = rowTotal(latest)
  const perUnit =
    householdCount && householdCount > 0 && total > 0
      ? Math.round(total / householdCount)
      : null

  return (
    <div
      style={{
        display:      'flex',
        gap:          16,
        marginBottom: 12,
        padding:      '8px 0 12px',
        borderBottom: '1px solid var(--line-subtle)',
      }}
    >
      <div>
        <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginBottom: 4 }}>
          최근 단지 합계
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
            {fmtWon(perUnit)}
          </div>
        </div>
      )}
      <div
        style={{
          marginLeft: 'auto',
          alignSelf:  'flex-end',
          font:       '500 11px/1.4 var(--font-sans)',
          color:      'var(--fg-tertiary)',
          textAlign:  'right',
        }}
      >
        계절 비교는 4개월 이상<br />데이터가 쌓이면 표시됩니다.
      </div>
    </div>
  )
}
