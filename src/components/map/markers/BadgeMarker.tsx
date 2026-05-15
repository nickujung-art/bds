'use client'

import type { BadgeType } from './badge-logic'
import { getPriceColor } from './badge-logic'

interface BadgeMarkerProps {
  badge:      BadgeType
  priceLabel: number | null  // null이면 라벨 숨김
}

// ── SVG 배지 컴포넌트 ──────────────────────────────────────

function PreSalePin() {
  // 골드 핀 — pre_sale (분양 단지)
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-label="분양 단지">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 16 24 16 24S32 26.67 32 16C32 7.16 24.84 0 16 0z" fill="#D97706"/>
      <circle cx="16" cy="16" r="7" fill="#FDE68A"/>
      <path d="M13 18l-3-3 1.4-1.4 1.6 1.6 4.6-4.6L19 12l-6 6z" fill="#92400E"/>
    </svg>
  )
}

function NewBuildPin() {
  // 민트 핀 — new_build (신축 2021+)
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-label="신축 단지">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 16 24 16 24S32 26.67 32 16C32 7.16 24.84 0 16 0z" fill="#059669"/>
      <circle cx="16" cy="16" r="7" fill="#A7F3D0"/>
      <path d="M16 10v12M10 16h12" stroke="#065F46" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function CrownPin() {
  // 왕관 핀 — crown (거래량 상위 5%)
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-label="거래 활발 단지">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 16 24 16 24S32 26.67 32 16C32 7.16 24.84 0 16 0z" fill="#1D4ED8"/>
      <path d="M8 20l2-7 3.5 4 2.5-7 2.5 7 3.5-4 2 7H8z" fill="#FCD34D" stroke="#FCD34D" strokeWidth="0.5"/>
    </svg>
  )
}

function HotPin() {
  // 불꽃 핀 — hot (조회수 상위 5%)
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-label="인기 단지">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 16 24 16 24S32 26.67 32 16C32 7.16 24.84 0 16 0z" fill="#DC2626"/>
      <path d="M16 8c0 4-3 6-3 10a3 3 0 006 0c0-4-3-6-3-10z" fill="#FEF2F2"/>
      <path d="M16 14c0 2-1.5 3-1.5 5a1.5 1.5 0 003 0c0-2-1.5-3-1.5-5z" fill="#DC2626"/>
    </svg>
  )
}

function SurgePin() {
  // 빨간 상향 핀 — surge (급등 +5% 이상)
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-label="가격 급등 단지">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 16 24 16 24S32 26.67 32 16C32 7.16 24.84 0 16 0z" fill="#EF4444"/>
      <path d="M16 9l5 8H11l5-8z" fill="white"/>
      <rect x="14" y="18" width="4" height="6" rx="1" fill="white"/>
    </svg>
  )
}

function DropPin() {
  // 파란 하향 핀 — drop (급락 -5% 이하)
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-label="가격 급락 단지">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 16 24 16 24S32 26.67 32 16C32 7.16 24.84 0 16 0z" fill="#3B82F6"/>
      <rect x="14" y="9" width="4" height="6" rx="1" fill="white"/>
      <path d="M11 16l5 8 5-8H11z" fill="white"/>
    </svg>
  )
}

function SchoolPin() {
  // 방패 핀 — school (학군 A/A+)
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-label="학군 우수 단지">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 16 24 16 24S32 26.67 32 16C32 7.16 24.84 0 16 0z" fill="#7C3AED"/>
      <path d="M16 9l7 3v5c0 3.5-3 6-7 7-4-1-7-3.5-7-7v-5l7-3z" fill="#EDE9FE" stroke="#7C3AED" strokeWidth="0.5"/>
      <path d="M13 16l2 2 4-4" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function LargeComplexPin() {
  // 크기 1.2배 기본 핀 — large_complex
  return (
    <svg width="34" height="44" viewBox="0 0 32 40" fill="none" aria-label="대단지">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 16 24 16 24S32 26.67 32 16C32 7.16 24.84 0 16 0z" fill="#374151"/>
      <rect x="10" y="10" width="12" height="12" rx="1" fill="white" opacity="0.9"/>
      <path d="M10 14h12M10 18h12M14 10v12" stroke="#374151" strokeWidth="1" strokeOpacity="0.5"/>
    </svg>
  )
}

function RedevelopPin() {
  // 사선 스트라이프 핀 — redevelop
  return (
    <svg width="32" height="40" viewBox="0 0 32 40" fill="none" aria-label="재건축 단지">
      <path d="M16 0C7.16 0 0 7.16 0 16c0 10.67 16 24 16 24S32 26.67 32 16C32 7.16 24.84 0 16 0z" fill="#6B7280"/>
      <circle cx="16" cy="16" r="8" fill="#F3F4F6"/>
      <path d="M10 22l12-12M13 22l12-12M10 19l9-9" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  )
}

function DefaultPin({ color }: { color: string }) {
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" aria-label="단지">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z" fill={color}/>
      <circle cx="14" cy="14" r="5" fill="white" opacity="0.9"/>
    </svg>
  )
}

// ── 배지 선택 ──────────────────────────────────────────────

function BadgePin({ badge, color }: { badge: BadgeType; color: string }) {
  switch (badge) {
    case 'pre_sale':      return <PreSalePin />
    case 'new_build':     return <NewBuildPin />
    case 'crown':         return <CrownPin />
    case 'hot':           return <HotPin />
    case 'surge':         return <SurgePin />
    case 'drop':          return <DropPin />
    case 'school':        return <SchoolPin />
    case 'large_complex': return <LargeComplexPin />
    case 'redevelop':     return <RedevelopPin />
    default:              return <DefaultPin color={color} />
  }
}

// ── 외부 내보내기 ──────────────────────────────────────────

export function BadgeMarker({ badge, priceLabel }: BadgeMarkerProps) {
  const color = getPriceColor(priceLabel)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <BadgePin badge={badge} color={color} />
      {priceLabel !== null && priceLabel > 0 && (
        <div
          style={{
            marginTop: 2,
            padding: '1px 4px',
            background: 'white',
            border: `1px solid ${color}`,
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 600,
            color,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
          }}
        >
          {priceLabel.toLocaleString()}만
        </div>
      )}
    </div>
  )
}
