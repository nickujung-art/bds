'use client'

import { useState, useMemo } from 'react'
import { parseAsString, parseAsStringEnum, useQueryState } from 'nuqs'
import { TransactionChart } from './TransactionChart'
import type { RawTransaction } from '@/lib/data/complex-detail'
import { filterByPeriod, type PeriodKey } from '@/lib/utils/period-filter'
import { extractAreaGroups, filterByArea } from '@/lib/utils/area-groups'
import { computeIqrOutliers } from '@/lib/utils/iqr'

interface Props {
  rawSaleData:   RawTransaction[]
  rawJeonseData: RawTransaction[]
}

type DealTab = 'sale' | 'jeonse'

// D-01: 월세 탭 제거 — 매매/전세 두 탭만 유지
const TABS: { id: DealTab; label: string }[] = [
  { id: 'sale',   label: '매매' },
  { id: 'jeonse', label: '전세' },
]

const PERIOD_OPTIONS: { id: PeriodKey; label: string }[] = [
  { id: '1y',  label: '1년' },
  { id: '3y',  label: '3년' },
  { id: '5y',  label: '5년' },
  { id: 'all', label: '전체' },
]

export function DealTypeTabs({ rawSaleData, rawJeonseData }: Props) {
  const [active, setActive] = useState<DealTab>('sale')

  // D-02: 기간 필터 nuqs URL 상태 (기본값 '3y', clearOnDefault로 URL 청소)
  // shallow:true — 필터 변경 시 서버 컴포넌트 재요청 방지 (클라이언트 슬라이스만)
  const [period, setPeriod] = useQueryState(
    'period',
    parseAsStringEnum<PeriodKey>(['1y', '3y', '5y', 'all'])
      .withDefault('3y')
      .withOptions({ clearOnDefault: true, shallow: true, history: 'replace' }),
  )

  // 활성 탭의 raw 데이터
  const rawActive = active === 'sale' ? rawSaleData : rawJeonseData

  // 평형 그룹 추출 (전체 거래 기준 — 기간 무관)
  const areaGroups = useMemo(() => extractAreaGroups(rawActive), [rawActive])
  const defaultArea = areaGroups[0] ?? null  // 최다 거래 평형

  // D-04: 평형 필터 nuqs URL 상태 (기본값 = 최다 거래 평형)
  const [area, setArea] = useQueryState(
    'area',
    parseAsString
      .withDefault(defaultArea != null ? String(defaultArea) : '')
      .withOptions({ shallow: true, history: 'replace' }),
  )

  // 현재 선택된 평형 (URL에 없거나 빈 값이면 default)
  const selectedArea = useMemo(() => {
    const parsed = parseInt(area, 10)
    if (!Number.isFinite(parsed)) return defaultArea
    if (!areaGroups.includes(parsed)) return defaultArea
    return parsed
  }, [area, areaGroups, defaultArea])

  // 평형 + 기간 slice → IQR
  const { normal, outliers } = useMemo(() => {
    if (selectedArea == null) return { normal: [], outliers: [] }
    const byArea   = filterByArea(rawActive, selectedArea)
    const byPeriod = filterByPeriod(byArea, period)
    const points = byPeriod.map(r => ({
      yearMonth: r.yearMonth,
      price:     r.price,
      area:      r.area,
    }))
    return computeIqrOutliers(points)
  }, [rawActive, selectedArea, period])

  return (
    <div>
      {/* 탭 행 */}
      <div className="tabs" style={{ marginBottom: 12 }}>
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

      {/* 평형 칩 + 기간 필터 행 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        {/* 평형 칩 (좌측) */}
        <div role="radiogroup" aria-label="평형 선택" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {areaGroups.length === 0 ? (
            <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
              거래 없음
            </span>
          ) : (
            areaGroups.map((m2) => {
              const isActive = selectedArea === m2
              return (
                <button
                  key={m2}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => void setArea(String(m2))}
                  className={`btn btn-sm ${isActive ? 'btn-orange' : 'btn-secondary'}`}
                  style={{ minHeight: 32, padding: '4px 12px' }}
                  title={`약 ${Math.round(m2 / 3.3058)}평`}
                >
                  {m2}㎡
                </button>
              )
            })
          )}
        </div>

        {/* 기간 필터 (우측) */}
        <div role="radiogroup" aria-label="기간 선택" style={{ display: 'flex', gap: 6 }}>
          {PERIOD_OPTIONS.map((opt) => {
            const isActive = period === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => void setPeriod(opt.id)}
                className={`btn btn-sm ${isActive ? 'btn-orange' : 'btn-secondary'}`}
                style={{ minHeight: 32, padding: '4px 10px' }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 차트 */}
      <TransactionChart normal={normal} outliers={outliers} dealType={active} />
    </div>
  )
}
