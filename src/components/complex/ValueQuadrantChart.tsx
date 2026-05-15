'use client'

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

export interface QuadrantPoint {
  complexId: string
  complexName: string
  x: number
  y: number
  isTarget: boolean
}

interface ValueQuadrantChartProps {
  data: QuadrantPoint[]
  medianX: number
  medianY: number
  regionLabel: string
  totalCount: number
}

export function ValueQuadrantChart({
  data,
  medianX,
  medianY,
  regionLabel,
  totalCount,
}: ValueQuadrantChartProps) {
  const validPoints = data.filter(p => p.x > 0 && p.y >= 0)

  if (validPoints.length < 3) {
    return (
      <div
        style={{
          display: 'flex',
          height: 280,
          alignItems: 'center',
          justifyContent: 'center',
          font: '500 13px/1.6 var(--font-sans)',
          color: 'var(--fg-tertiary)',
        }}
      >
        이 지역 단지 데이터가 부족하여 차트를 표시할 수 없습니다.
      </div>
    )
  }

  const backgroundPoints = validPoints.filter(p => !p.isTarget)
  const targetPoints = validPoints.filter(p => p.isTarget)

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <h3
          style={{
            font: '700 16px/1.4 var(--font-sans)',
            margin: '0 0 4px',
            color: 'var(--fg-pri)',
          }}
        >
          단지 가성비 분석
        </h3>
        <p
          style={{
            font: '500 11px/1.4 var(--font-sans)',
            color: 'var(--fg-tertiary)',
            margin: 0,
          }}
        >
          평당가(X) · 전세가율(Y) 기준 {regionLabel} 내 {totalCount}개 단지 분포
        </p>
        <p
          style={{
            font: '500 11px/1.4 var(--font-sans)',
            color: 'var(--fg-tertiary)',
            margin: '2px 0 0',
          }}
        >
          왼쪽 위(가성비) ↔ 오른쪽 아래(고위험) · 주황 점 = 이 단지
        </p>
      </div>

      {/* 차트 + 4분면 라벨 오버레이 */}
      <div
        style={{ position: 'relative' }}
        role="img"
        aria-label={`단지 가성비 분석 산점도 — ${regionLabel} 내 단지 평당가와 전세가율 비교`}
      >
        <p className="sr-only">
          현재 단지는 {regionLabel} 내 {totalCount}개 단지와 비교한 평당가×전세가율 분포입니다.
        </p>

        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 24, right: 24, bottom: 24, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="x"
              name="평당가"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${Math.round(v)}만`}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
            />
            <YAxis
              dataKey="y"
              name="전세가율"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(v: number) => `${Math.round(v)}%`}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              width={38}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                fontFamily: 'var(--font-sans)',
                border: '1px solid rgba(112,115,124,.22)',
                borderRadius: 8,
              }}
              formatter={(value, name) => {
                const num = typeof value === 'number' ? value : Number(value)
                return name === '평당가'
                  ? [`${Math.round(num)}만원/평`, '평당가']
                  : [`${num.toFixed(1)}%`, '전세가율']
              }}
              labelFormatter={(label) => String(label ?? '')}
            />
            <ReferenceLine x={medianX} stroke="#d1d5db" strokeDasharray="4 2" strokeWidth={1.5} />
            <ReferenceLine y={medianY} stroke="#d1d5db" strokeDasharray="4 2" strokeWidth={1.5} />
            <Scatter
              name="배경단지"
              data={backgroundPoints}
              fill="#d1d5db"
              opacity={0.6}
              isAnimationActive={false}
            />
            <Scatter
              name="현재단지"
              data={targetPoints}
              fill="#ea580c"
              r={6}
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>

        {/* 4분면 라벨 */}
        <div style={{ position: 'absolute', top: 28, left: 44, font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', pointerEvents: 'none' }}>
          가성비
        </div>
        <div style={{ position: 'absolute', top: 28, right: 12, font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', pointerEvents: 'none' }}>
          프리미엄
        </div>
        <div style={{ position: 'absolute', bottom: 28, left: 44, font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', pointerEvents: 'none' }}>
          주의
        </div>
        <div style={{ position: 'absolute', bottom: 28, right: 12, font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)', pointerEvents: 'none' }}>
          고위험
        </div>
      </div>
    </div>
  )
}
