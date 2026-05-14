'use client'

import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { PricePoint } from '@/lib/utils/iqr'

interface Props {
  normal:   PricePoint[]
  outliers: PricePoint[]
  dealType: 'sale' | 'jeonse'
}

const LABEL: Record<'sale' | 'jeonse', string> = {
  sale:   '매매가',
  jeonse: '보증금',
}

function formatPrice(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}억`
  return `${value.toLocaleString()}만`
}

function tooltipPrice(value: unknown): [string, string] {
  const n = Number(value)
  if (!Number.isFinite(n)) return ['-', '']
  return [formatPrice(n), '']
}

/**
 * 월별 normal 평균 계산 — D-03: 이상치 제외한 평균선
 */
function aggregateMonthlyAverage(points: PricePoint[]): Array<{ yearMonth: string; avgPrice: number }> {
  const buckets = new Map<string, number[]>()
  for (const p of points) {
    const arr = buckets.get(p.yearMonth) ?? []
    arr.push(p.price)
    buckets.set(p.yearMonth, arr)
  }
  return [...buckets.entries()]
    .map(([yearMonth, prices]) => ({
      yearMonth,
      avgPrice: Math.round(prices.reduce((s, v) => s + v, 0) / prices.length),
    }))
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
}

export function TransactionChart({ normal, outliers, dealType }: Props) {
  if (normal.length === 0 && outliers.length === 0) {
    return (
      <div
        style={{
          minHeight: 240,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--fg-tertiary)',
          font: '500 13px/1.4 var(--font-sans)',
        }}
      >
        거래 데이터가 없습니다
      </div>
    )
  }

  // D-03: 평균선은 normal만으로 계산 (이상치 제외)
  const avgSeries = aggregateMonthlyAverage(normal)

  // Scatter용 데이터 (normal/outlier 각 점)
  const normalDots  = normal.map(p => ({ yearMonth: p.yearMonth, price: p.price }))
  const outlierDots = outliers.map(p => ({ yearMonth: p.yearMonth, price: p.price }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="yearMonth"
          type="category"
          allowDuplicatedCategory={false}
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => (typeof v === 'string' ? v.slice(2) : '')}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={formatPrice}
          width={56}
          dataKey="price"
        />
        <Tooltip
          formatter={tooltipPrice}
          labelFormatter={(label) => String(label)}
          contentStyle={{ fontSize: 12 }}
        />
        {/* 정상 거래 점 — 채워진 원 */}
        <Scatter
          name={LABEL[dealType]}
          data={normalDots}
          fill="#1d4ed8"
          shape="circle"
        />
        {/* 이상치 — 투명 점 (D-03), 분기 IQR 1.5x 기준 */}
        <Scatter
          name="이상 거래 의심 (분기 IQR 기준)"
          data={outlierDots}
          fill="transparent"
          stroke="#9ca3af"
          opacity={0.4}
          shape="circle"
        />
        {/* 평균선 (normal 기반 월평균) */}
        <Line
          type="monotone"
          dataKey="avgPrice"
          data={avgSeries}
          stroke="#1d4ed8"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
          name="월평균 (이상치 제외)"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
