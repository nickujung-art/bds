// RedevelopmentTimeline: RSC — 재건축 진행 단계 수평 타임라인
// 인터랙션 없는 순수 표시 컴포넌트 — server component (no client directive needed)

const PHASE_ORDER = [
  'rumor',
  'proposed',
  'committee_formed',
  'safety_eval',
  'designated',
  'business_approval',
  'construction_permit',
  'construction',
  'completed',
] as const

const PHASE_LABELS: Record<string, string> = {
  rumor: '재건축 소문',
  proposed: '추진 제안',
  committee_formed: '추진위 구성',
  safety_eval: '안전진단',
  designated: '구역 지정',
  business_approval: '사업 승인',
  construction_permit: '착공 허가',
  construction: '공사 중',
  completed: '완공',
  cancelled: '취소',
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface Props {
  phase: string // DB에서 읽어온 현재 단계 키 ('rumor', 'construction', 'cancelled' 등)
  notes: string | null
}

export function RedevelopmentTimeline({ phase, notes }: Props) {
  const currentIndex = PHASE_ORDER.indexOf(phase as typeof PHASE_ORDER[number])

  // cancelled 상태: 타임라인 미표시, 배지 + notes만 표시
  if (phase === 'cancelled') {
    return (
      <section aria-label="재건축 진행 단계" className="card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <h3 style={{ font: '700 16px/1.4 var(--font-sans)', margin: 0 }}>재건축 진행 단계</h3>
          <span
            className="badge neg"
            aria-label="재건축 취소 상태"
          >
            재건축 취소
          </span>
        </div>
        <p
          style={{
            font: '500 13px/1.4 var(--font-sans)',
            color: 'var(--fg-tertiary)',
            margin: 0,
          }}
        >
          재건축이 취소되었습니다.
        </p>
        {notes && (
          <p style={{ font: '500 13px/1.6 var(--font-sans)', color: 'var(--fg-sec)', margin: '12px 0 0' }}>
            <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
              비고:{' '}
            </span>
            {notes}
          </p>
        )}
      </section>
    )
  }

  return (
    <section aria-label="재건축 진행 단계" className="card" style={{ padding: 20 }}>
      {/* 섹션 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <h3 style={{ font: '700 16px/1.4 var(--font-sans)', margin: 0 }}>재건축 진행 단계</h3>
        <span className="badge orange">재건축 진행 중</span>
      </div>

      {/* 수평 스크롤 컨테이너 */}
      <div
        style={{
          overflowX: 'auto',
          paddingBottom: 8,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <ol
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            alignItems: 'flex-start',
            minWidth: 'max-content',
          }}
        >
          {PHASE_ORDER.map((stepKey, stepIndex) => {
            const isCompleted = stepIndex < currentIndex
            const isCurrent = stepKey === phase
            const label = PHASE_LABELS[stepKey] ?? stepKey

            const statusLabel = isCompleted ? '완료' : isCurrent ? '현재 진행 중' : '예정'

            // 연결선 — 마지막 스텝 이후 불필요
            const showConnector = stepIndex < PHASE_ORDER.length - 1
            const connectorCompleted = stepIndex < currentIndex

            return (
              <li
                key={stepKey}
                style={{ display: 'flex', alignItems: 'flex-start', flexDirection: 'column' }}
                aria-label={`${label} — ${statusLabel}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {/* 스텝 원 */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      ...(isCompleted
                        ? {
                            background: 'var(--dj-orange)',
                            border: 'none',
                          }
                        : isCurrent
                          ? {
                              background: 'var(--dj-orange)',
                              border: '3px solid var(--dj-orange)',
                              boxShadow: '0 0 0 3px var(--dj-orange-tint)',
                            }
                          : {
                              background: 'var(--bg-surface-2)',
                              border: '1px solid var(--line-default)',
                            }),
                    }}
                  >
                    {isCompleted && <CheckIcon />}
                  </div>

                  {/* 연결선 */}
                  {showConnector && (
                    <div
                      style={{
                        height: 2,
                        flex: 1,
                        minWidth: 12,
                        maxWidth: 32,
                        background: connectorCompleted
                          ? 'var(--dj-orange)'
                          : 'var(--line-subtle)',
                      }}
                    />
                  )}
                </div>

                {/* 단계명 */}
                <span
                  style={{
                    font: isCurrent
                      ? '700 11px/1 var(--font-sans)'
                      : '500 11px/1 var(--font-sans)',
                    marginTop: 6,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    paddingRight: showConnector ? 4 : 0,
                    color: isCompleted
                      ? 'var(--fg-sec)'
                      : isCurrent
                        ? 'var(--fg-pri)'
                        : 'var(--fg-tertiary)',
                  }}
                >
                  {label}
                </span>
              </li>
            )
          })}
        </ol>
      </div>

      {/* notes */}
      {notes && (
        <p style={{ font: '500 13px/1.6 var(--font-sans)', color: 'var(--fg-sec)', margin: '12px 0 0' }}>
          <span style={{ font: '500 11px/1 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
            비고:{' '}
          </span>
          {notes}
        </p>
      )}
    </section>
  )
}
