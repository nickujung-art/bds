import type { ManagementCostRow } from '@/lib/data/management-cost'
import { getSeasonalAverages } from '@/lib/data/management-cost'

interface Props {
  rows: ManagementCostRow[]
  householdCount: number | null
}

function fmtWon(val: number | null): string {
  if (val === null || val === 0) return '—'
  if (val >= 10_000) return `${Math.floor(val / 10_000).toLocaleString('ko-KR')}만원`
  return `${val.toLocaleString('ko-KR')}원`
}

function fmtMonth(dateStr: string): string {
  return dateStr.slice(0, 7).replace('-', '.')
}

/**
 * UX-04: 단지 합계 제거, 세대당 월평균/하절기/동절기 3-column 표시
 */
export function ManagementCostCard({ rows, householdCount }: Props) {
  if (rows.length === 0) return null

  const latest = rows[0]!
  const oldest = rows[rows.length - 1]!
  const seasonal = getSeasonalAverages(rows, householdCount)
  const noUnitData = householdCount == null || householdCount <= 0

  const hasBothSeasons = seasonal.summerCount > 0 && seasonal.winterCount > 0
  const onlyWinter = seasonal.winterCount > 0 && seasonal.summerCount === 0
  const onlySummer = seasonal.summerCount > 0 && seasonal.winterCount === 0

  const gridStyle: React.CSSProperties = {
    gap:          1,
    background:   'var(--line-subtle)',
    border:       '1px solid var(--line-subtle)',
    borderRadius: 8,
    overflow:     'hidden',
  }

  return (
    <div className="card" style={{ padding: 20 }}>
      <div
        style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'baseline',
          marginBottom:   16,
        }}
      >
        <h3 style={{ font: '700 15px/1.4 var(--font-sans)', margin: 0 }}>관리비</h3>
        <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
          K-apt 기준 · 최근 {fmtMonth(latest.year_month)}
        </span>
      </div>

      {hasBothSeasons ? (
        <div style={{ ...gridStyle, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
          <CostBlock label="월평균" sub="전체" perUnit={noUnitData ? null : seasonal.overallPerUnit} count={rows.length} noUnit={noUnitData} />
          <CostBlock label="하절기" sub="6~9월" perUnit={noUnitData ? null : seasonal.summerPerUnit} count={seasonal.summerCount} noUnit={noUnitData} />
          <CostBlock label="동절기" sub="10~3월" perUnit={noUnitData ? null : seasonal.winterPerUnit} count={seasonal.winterCount} noUnit={noUnitData} />
        </div>
      ) : (
        <div style={{ ...gridStyle, display: 'block' }}>
          <CostBlock label="월평균" sub="전체" perUnit={noUnitData ? null : seasonal.overallPerUnit} count={rows.length} noUnit={noUnitData} />
        </div>
      )}

      {noUnitData && (
        <p style={{ font: '500 11px/1.4 var(--font-sans)', color: 'var(--fg-tertiary)', margin: '10px 0 0' }}>
          세대수 정보가 없어 세대당 환산이 불가합니다.
        </p>
      )}

      {onlyWinter && !noUnitData && (
        <p style={{ font: '500 11px/1.4 var(--font-sans)', color: 'var(--fg-secondary)', margin: '10px 0 0' }}>
          동절기({fmtMonth(oldest.year_month)}~{fmtMonth(latest.year_month)}) 데이터만 있습니다. 하절기 데이터는 6월 이후 표시됩니다.
        </p>
      )}
      {onlySummer && !noUnitData && (
        <p style={{ font: '500 11px/1.4 var(--font-sans)', color: 'var(--fg-secondary)', margin: '10px 0 0' }}>
          하절기({fmtMonth(oldest.year_month)}~{fmtMonth(latest.year_month)}) 데이터만 있습니다. 동절기 데이터는 10월 이후 표시됩니다.
        </p>
      )}
    </div>
  )
}

interface CostBlockProps {
  label:   string
  sub:     string
  perUnit: number | null
  count:   number
  noUnit:  boolean
}

function CostBlock({ label, sub, perUnit, count, noUnit }: CostBlockProps) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        padding:    '14px 12px',
        textAlign:  'center',
      }}
    >
      <div style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginBottom: 8 }}>
        {label}
        <span style={{ marginLeft: 4, opacity: 0.7 }}>({sub})</span>
      </div>

      {noUnit || perUnit === null ? (
        <div style={{ font: '500 14px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>—</div>
      ) : (
        <>
          <div
            className="tnum"
            style={{ font: '700 18px/1.1 var(--font-sans)', color: 'var(--dj-orange)', marginBottom: 4 }}
          >
            약 {fmtWon(perUnit)}
          </div>
          <div style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
            /세대
          </div>
        </>
      )}

      {count > 0 && !noUnit && perUnit !== null && (
        <div style={{ font: '500 10px/1 var(--font-sans)', color: 'var(--fg-tertiary)', marginTop: 6 }}>
          {count}개월 평균
        </div>
      )}
    </div>
  )
}
