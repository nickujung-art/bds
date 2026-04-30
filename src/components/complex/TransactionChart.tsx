'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { MonthlyPriceSummary } from '@/lib/data/complex-detail'

interface Props {
  data:      MonthlyPriceSummary[]
  dealType:  'sale' | 'jeonse' | 'monthly'
}

const LABEL: Record<string, string> = {
  sale:    '매매가',
  jeonse:  '보증금',
  monthly: '보증금',
}

function formatPrice(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}억`
  return `${value.toLocaleString()}만`
}

export function TransactionChart({ data, dealType }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        거래 데이터가 없습니다
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="yearMonth"
          tick={{ fontSize: 11 }}
          tickFormatter={(v: string) => v.slice(2)}  // "2024-03" → "24-03"
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={formatPrice}
          width={52}
        />
        <Tooltip
          formatter={(value) => [formatPrice(Number(value)), LABEL[dealType]]}
          labelFormatter={(label) => String(label)}
          contentStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="avgPrice"
          stroke="#1d4ed8"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
