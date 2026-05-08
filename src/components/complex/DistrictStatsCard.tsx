interface DistrictStatsCardProps {
  districtName: string
  population: number | null
  households: number | null
  dataYear: number | null
  dataQuarter: number | null // 1–4
}

export function DistrictStatsCard({
  districtName,
  population,
  households,
  dataYear,
  dataQuarter,
}: DistrictStatsCardProps) {
  const hasData = population !== null || households !== null

  return (
    <div
      className="card"
      role="region"
      aria-labelledby="district-stats-heading"
      style={{ padding: '24px' }}
    >
      {/* 카드 헤더 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h3
          id="district-stats-heading"
          style={{
            font: '700 15px/1.4 var(--font-sans)',
            color: 'var(--fg-pri)',
            margin: 0,
          }}
        >
          지역 통계
        </h3>
        <span
          style={{
            font: '500 12px/1 var(--font-sans)',
            color: 'var(--fg-tertiary)',
          }}
        >
          {districtName} 기준
        </span>
      </div>

      {!hasData ? (
        <p
          style={{
            font: '500 13px/1.6 var(--font-sans)',
            color: 'var(--fg-tertiary)',
            textAlign: 'center',
            padding: '32px 0',
            margin: 0,
          }}
        >
          해당 지역 통계 데이터가 아직 수집되지 않았습니다.
        </p>
      ) : (
        <>
          {dataYear !== null && dataQuarter !== null && (
            <p
              style={{
                font: '500 11px/1 var(--font-sans)',
                color: 'var(--fg-tertiary)',
                marginBottom: '16px',
                margin: '0 0 16px',
              }}
            >
              SGIS 통계청 기준 · {dataYear}년 {dataQuarter}분기
            </p>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
            }}
          >
            <div>
              <div
                style={{
                  font: '500 11px/1 var(--font-sans)',
                  color: 'var(--fg-tertiary)',
                  marginBottom: '4px',
                }}
              >
                인구수
              </div>
              <div
                className="tnum"
                style={{
                  font: '700 24px/1 var(--font-sans)',
                  color: 'var(--fg-pri)',
                }}
              >
                {population !== null
                  ? `${population.toLocaleString('ko-KR')}명`
                  : '—'}
              </div>
            </div>
            <div>
              <div
                style={{
                  font: '500 11px/1 var(--font-sans)',
                  color: 'var(--fg-tertiary)',
                  marginBottom: '4px',
                }}
              >
                세대수
              </div>
              <div
                className="tnum"
                style={{
                  font: '700 24px/1 var(--font-sans)',
                  color: 'var(--fg-pri)',
                }}
              >
                {households !== null
                  ? `${households.toLocaleString('ko-KR')}세대`
                  : '—'}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
