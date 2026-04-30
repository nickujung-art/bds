'use client'

import { useState } from 'react'
import { TransactionChart } from './TransactionChart'
import type { MonthlyPriceSummary } from '@/lib/data/complex-detail'

interface Props {
  saleData:    MonthlyPriceSummary[]
  jeonseData:  MonthlyPriceSummary[]
  monthlyData: MonthlyPriceSummary[]
}

type Tab = 'sale' | 'jeonse' | 'monthly'

const TABS: { id: Tab; label: string }[] = [
  { id: 'sale',    label: '매매' },
  { id: 'jeonse',  label: '전세' },
  { id: 'monthly', label: '월세' },
]

export function DealTypeTabs({ saleData, jeonseData, monthlyData }: Props) {
  const [active, setActive] = useState<Tab>('sale')

  const dataMap: Record<Tab, MonthlyPriceSummary[]> = {
    sale:    saleData,
    jeonse:  jeonseData,
    monthly: monthlyData,
  }

  return (
    <div>
      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className="tab"
            data-orange-active={active === tab.id ? 'true' : undefined}
            style={{ background: 'none' }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <TransactionChart data={dataMap[active]} dealType={active} />
    </div>
  )
}
