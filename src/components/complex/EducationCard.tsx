'use client'

import { useState } from 'react'
import type { FacilityEduData, SchoolItem, PoiItem } from '@/lib/data/facility-edu'

// ─── 아이콘 ────────────────────────────────────────────────────────────────

function WalkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="5" r="2" />
      <path d="M8 21l2-6 2 2 2-6 2 6" />
      <path d="M10 15l-2 6m6-6l2 6" />
    </svg>
  )
}

function SchoolIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 10 12 5l9 5-9 5z" />
      <path d="M7 12v5c2 1.5 3 2 5 2s3-.5 5-2v-5" />
    </svg>
  )
}

function HagwonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function DaycareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────

function fmtDist(m: number | null): string {
  if (m == null) return '-'
  if (m >= 1000) return `${(m / 1000).toFixed(1)}km`
  return `${m}m`
}

function fmtWalk(m: number | null): string {
  if (m == null) return ''
  const min = Math.round(m / 67)  // 도보 67m/분 기준
  return `도보 ${min}분`
}

const SCHOOL_TYPE_LABEL: Record<string, string> = {
  elementary: '초등학교',
  middle:     '중학교',
  high:       '고등학교',
}

const GRADE_COLOR: Record<string, string> = {
  A: '#16a34a',
  B: '#2563eb',
  C: '#d97706',
  D: '#9ca3af',
}

const GRADE_BG: Record<string, string> = {
  A: '#f0fdf4',
  B: '#eff6ff',
  C: '#fffbeb',
  D: '#f9fafb',
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────────────────────

function EmptyNote({ text }: { text: string }) {
  return (
    <p style={{
      font:      '500 13px/1.6 var(--font-sans)',
      color:     'var(--fg-tertiary)',
      textAlign: 'center',
      padding:   '28px 0',
      margin:    0,
    }}>
      {text}
    </p>
  )
}

function SchoolList({ schools }: { schools: SchoolItem[] }) {
  const [schoolTab, setSchoolTab] = useState<'elementary' | 'middle' | 'high'>('elementary')

  const filtered = schools
    .filter(s => s.school_type === schoolTab)
    .sort((a, b) => (a.distance_m ?? 99999) - (b.distance_m ?? 99999))

  return (
    <div>
      {/* 초/중/고 탭 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['elementary', 'middle', 'high'] as const).map(type => {
          const count = schools.filter(s => s.school_type === type).length
          const active = schoolTab === type
          return (
            <button
              key={type}
              onClick={() => setSchoolTab(type)}
              style={{
                padding:      '5px 10px',
                borderRadius: 6,
                border:       `1px solid ${active ? 'var(--dj-orange)' : 'var(--line-default)'}`,
                background:   active ? '#fff5ed' : '#fff',
                color:        active ? 'var(--dj-orange)' : 'var(--fg-sec)',
                font:         `600 12px/1 var(--font-sans)`,
                cursor:       'pointer',
              }}
            >
              {SCHOOL_TYPE_LABEL[type]}
              {count > 0 && (
                <span style={{
                  marginLeft: 4,
                  color: active ? 'var(--dj-orange)' : 'var(--fg-tertiary)',
                  fontWeight: 500,
                }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyNote text="반경 1.5km 내 해당 학교가 없습니다." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filtered.map((s, i) => (
            <div
              key={i}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          10,
                padding:      '10px 0',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--line-subtle)' : 'none',
              }}
            >
              {/* 아이콘 */}
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'var(--bg-surface-2)',
                display: 'grid', placeItems: 'center',
                flexShrink: 0, color: 'var(--fg-sec)',
              }}>
                <SchoolIcon />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ font: '600 13px/1.3 var(--font-sans)', color: 'var(--fg-pri)' }}>
                    {s.school_name}
                  </span>
                  {s.is_assignment && (
                    <span style={{
                      font: '600 10px/1 var(--font-sans)',
                      color: '#2563eb', background: '#eff6ff',
                      padding: '2px 5px', borderRadius: 4,
                      flexShrink: 0,
                    }}>
                      배정
                    </span>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-pri)' }}>
                  {fmtDist(s.distance_m)}
                </div>
                {s.distance_m != null && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end',
                    marginTop: 3,
                    font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)',
                  }}>
                    <WalkIcon />
                    {fmtWalk(s.distance_m)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HagwonSection({ hagwons, stats }: {
  hagwons: PoiItem[]
  stats: FacilityEduData['hagwonStats']
}) {
  if (!stats && hagwons.length === 0) {
    return <EmptyNote text="학원 데이터를 수집 중입니다." />
  }

  const topHagwons = hagwons.slice(0, 8)
  const grade = stats?.grade ?? 'D'
  const above = stats ? 100 - stats.percentile : null

  return (
    <div>
      {/* 등급 카드 */}
      {stats && (
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          16,
          padding:      '14px 16px',
          borderRadius: 10,
          background:   GRADE_BG[grade] ?? '#f9fafb',
          border:       `1px solid ${GRADE_COLOR[grade] ?? '#e5e7eb'}22`,
          marginBottom: 16,
        }}>
          {/* 등급 뱃지 */}
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: GRADE_COLOR[grade],
            display: 'grid', placeItems: 'center',
            flexShrink: 0,
          }}>
            <span style={{ font: '800 22px/1 var(--font-sans)', color: '#fff' }}>
              {grade}
            </span>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ font: '700 14px/1.3 var(--font-sans)', color: 'var(--fg-pri)', marginBottom: 3 }}>
              학원 밀도 {grade}등급
              {above !== null && (
                <span style={{
                  marginLeft: 8,
                  font: '500 12px/1 var(--font-sans)',
                  color: GRADE_COLOR[grade],
                }}>
                  창원·김해 상위 {above}%
                </span>
              )}
            </div>
            <div style={{ font: '500 12px/1.4 var(--font-sans)', color: 'var(--fg-sec)' }}>
              500m 내 {stats.cnt500}개 · 1km 내 {stats.cnt1000}개
              {stats.cnt1000 >= 45 && ' (45개 이상)'}
            </div>
          </div>
        </div>
      )}

      {/* 학원 목록 */}
      {topHagwons.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {topHagwons.map((h, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0',
              borderBottom: i < topHagwons.length - 1 ? '1px solid var(--line-subtle)' : 'none',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: 'var(--bg-surface-2)',
                display: 'grid', placeItems: 'center',
                flexShrink: 0, color: 'var(--fg-sec)',
              }}>
                <HagwonIcon />
              </div>
              <span style={{ flex: 1, font: '500 13px/1.3 var(--font-sans)', color: 'var(--fg-pri)' }}>
                {h.poi_name}
              </span>
              <span style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-sec)', flexShrink: 0 }}>
                {fmtDist(h.distance_m)}
              </span>
            </div>
          ))}
          {hagwons.length > 8 && (
            <p style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-tertiary)', textAlign: 'center', padding: '10px 0 0', margin: 0 }}>
              외 {hagwons.length - 8}개
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function DaycareList({ daycares }: { daycares: PoiItem[] }) {
  if (daycares.length === 0) {
    return <EmptyNote text="반경 1km 내 보육시설 데이터를 수집 중입니다." />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {daycares.slice(0, 10).map((d, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 0',
          borderBottom: i < Math.min(daycares.length, 10) - 1 ? '1px solid var(--line-subtle)' : 'none',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--bg-surface-2)',
            display: 'grid', placeItems: 'center',
            flexShrink: 0, color: 'var(--fg-sec)',
          }}>
            <DaycareIcon />
          </div>
          <span style={{ flex: 1, font: '500 13px/1.3 var(--font-sans)', color: 'var(--fg-pri)' }}>
            {d.poi_name}
          </span>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ font: '600 13px/1 var(--font-sans)', color: 'var(--fg-sec)' }}>
              {fmtDist(d.distance_m)}
            </div>
            {d.distance_m != null && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end',
                marginTop: 2,
                font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)',
              }}>
                <WalkIcon />
                {fmtWalk(d.distance_m)}
              </div>
            )}
          </div>
        </div>
      ))}
      {daycares.length > 10 && (
        <p style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-tertiary)', textAlign: 'center', padding: '10px 0 0', margin: 0 }}>
          외 {daycares.length - 10}개
        </p>
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────

type Tab = 'school' | 'hagwon' | 'daycare'

interface Props {
  data: FacilityEduData
}

export function EducationCard({ data }: Props) {
  const [tab, setTab] = useState<Tab>('school')
  const { schools, hagwons, daycares, hagwonStats } = data

  const hasData = schools.length > 0 || hagwons.length > 0 || daycares.length > 0

  const tabs: Array<{ key: Tab; label: string; count?: number }> = [
    { key: 'school',  label: '학교',         count: schools.length },
    { key: 'hagwon',  label: '학원·교육',     count: hagwons.length },
    { key: 'daycare', label: '어린이집·유치원', count: daycares.length },
  ]

  return (
    <div className="card" style={{ padding: 20 }}>
      <h3 style={{ font: '700 15px/1.4 var(--font-sans)', margin: '0 0 14px' }}>
        교육 환경
      </h3>

      {/* 탭 */}
      <div style={{
        display:      'flex',
        borderBottom: '1px solid var(--line-default)',
        marginBottom: 16,
        gap:          0,
      }}>
        {tabs.map(t => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding:       '8px 14px',
                border:        'none',
                borderBottom:  active ? '2px solid var(--dj-orange)' : '2px solid transparent',
                background:    'none',
                color:         active ? 'var(--dj-orange)' : 'var(--fg-sec)',
                font:          `${active ? 700 : 500} 13px/1 var(--font-sans)`,
                cursor:        'pointer',
                marginBottom:  -1,
                whiteSpace:    'nowrap',
              }}
            >
              {t.label}
              {(t.count ?? 0) > 0 && (
                <span style={{
                  marginLeft: 5,
                  font: '500 11px/1 var(--font-sans)',
                  color: active ? 'var(--dj-orange)' : 'var(--fg-tertiary)',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {!hasData ? (
        <EmptyNote text="교육 환경 데이터를 수집 중입니다." />
      ) : (
        <>
          {tab === 'school'  && <SchoolList schools={schools} />}
          {tab === 'hagwon'  && <HagwonSection hagwons={hagwons} stats={hagwonStats} />}
          {tab === 'daycare' && <DaycareList daycares={daycares} />}
        </>
      )}

      <p style={{
        font:       '500 11px/1 var(--font-sans)',
        color:      'var(--fg-tertiary)',
        marginTop:  14,
        marginBottom: 0,
        textAlign:  'right',
      }}>
        카카오맵 기준 · 반경 1~1.5km
      </p>
    </div>
  )
}
