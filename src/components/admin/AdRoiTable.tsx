import type { AdRoiRow } from '@/lib/data/ads'

interface AdRoiTableProps {
  rows: AdRoiRow[]
}

export function AdRoiTable({ rows }: AdRoiTableProps) {
  if (rows.length === 0) return null

  return (
    <div style={{ marginBottom: '32px' }}>
      <h2
        style={{
          font: '700 16px/1.4 var(--font-sans)',
          letterSpacing: '-0.02em',
          color: 'var(--fg-pri)',
          margin: '0 0 12px',
        }}
      >
        광고 ROI 현황
      </h2>
      <div className="card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <caption className="sr-only">광고 ROI 현황</caption>
          <thead>
            <tr
              style={{
                background: 'var(--bg-surface-2)',
                borderBottom: '1px solid var(--line-default)',
              }}
            >
              <th
                scope="col"
                style={{
                  padding: '10px 16px',
                  font: '600 12px/1 var(--font-sans)',
                  color: 'var(--fg-sec)',
                  textAlign: 'left',
                }}
              >
                광고명
              </th>
              <th
                scope="col"
                style={{
                  padding: '10px 16px',
                  font: '600 12px/1 var(--font-sans)',
                  color: 'var(--fg-sec)',
                  textAlign: 'right',
                  width: '80px',
                }}
              >
                노출
              </th>
              <th
                scope="col"
                style={{
                  padding: '10px 16px',
                  font: '600 12px/1 var(--font-sans)',
                  color: 'var(--fg-sec)',
                  textAlign: 'right',
                  width: '80px',
                }}
              >
                클릭
              </th>
              <th
                scope="col"
                style={{
                  padding: '10px 16px',
                  font: '600 12px/1 var(--font-sans)',
                  color: 'var(--fg-sec)',
                  textAlign: 'right',
                  width: '80px',
                }}
              >
                전환
              </th>
              <th
                scope="col"
                style={{
                  padding: '10px 16px',
                  font: '600 12px/1 var(--font-sans)',
                  color: 'var(--fg-sec)',
                  textAlign: 'right',
                  width: '80px',
                }}
              >
                CTR%
              </th>
              <th
                scope="col"
                style={{
                  padding: '10px 16px',
                  font: '600 12px/1 var(--font-sans)',
                  color: 'var(--fg-sec)',
                  textAlign: 'center',
                  width: '100px',
                }}
              >
                이상트래픽
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={row.campaignId}
                style={{
                  borderBottom:
                    idx < rows.length - 1
                      ? '1px solid var(--line-subtle)'
                      : 'none',
                }}
              >
                <td
                  style={{
                    padding: '12px 16px',
                    font: '600 13px/1.3 var(--font-sans)',
                    color: 'var(--fg-pri)',
                  }}
                >
                  {row.title}
                </td>
                <td
                  className="tnum"
                  style={{
                    padding: '12px 16px',
                    font: '500 13px/1 var(--font-sans)',
                    color: 'var(--fg-sec)',
                    textAlign: 'right',
                  }}
                >
                  {row.impressions.toLocaleString('ko-KR')}
                </td>
                <td
                  className="tnum"
                  style={{
                    padding: '12px 16px',
                    font: '500 13px/1 var(--font-sans)',
                    color: 'var(--fg-sec)',
                    textAlign: 'right',
                  }}
                >
                  {row.clicks.toLocaleString('ko-KR')}
                </td>
                <td
                  className="tnum"
                  style={{
                    padding: '12px 16px',
                    font: '500 13px/1 var(--font-sans)',
                    color: 'var(--fg-sec)',
                    textAlign: 'right',
                  }}
                >
                  {row.conversions.toLocaleString('ko-KR')}
                </td>
                <td
                  className="tnum"
                  style={{
                    padding: '12px 16px',
                    font: '600 13px/1 var(--font-sans)',
                    color: 'var(--fg-pri)',
                    textAlign: 'right',
                  }}
                >
                  {row.ctr !== null ? `${row.ctr.toFixed(1)}%` : '—'}
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  {row.anomaly ? (
                    <span
                      className="badge caut"
                      aria-label="이상 트래픽 감지됨"
                    >
                      이상감지
                    </span>
                  ) : (
                    <span
                      style={{
                        font: '500 12px/1 var(--font-sans)',
                        color: 'var(--fg-tertiary)',
                      }}
                    >
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
