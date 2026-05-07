'use client'

import { useState, useTransition } from 'react'
import {
  upsertNotificationTopic,
  deleteNotificationTopic,
  type TopicType,
} from '@/lib/auth/topic-actions'

const TOPICS: Array<{ key: TopicType; label: string; description: string }> = [
  { key: 'high_price',     label: '신고가 알림',    description: '관심 단지 신고가 갱신 시' },
  { key: 'presale',        label: '신축 분양 알림', description: '창원·김해 신규 분양 등록 시' },
  { key: 'complex_update', label: '단지 업데이트',  description: '관심 단지 정보 변경 시' },
]

interface Props {
  initialTopics: TopicType[]
}

export function TopicToggle({ initialTopics }: Props) {
  const [activeTopics, setActiveTopics] = useState<Set<TopicType>>(
    () => new Set(initialTopics),
  )
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleToggle(topic: TopicType) {
    const isActive = activeTopics.has(topic)
    // 낙관적 업데이트: 즉시 UI 전환
    const next = new Set(activeTopics)
    if (isActive) next.delete(topic)
    else next.add(topic)
    setActiveTopics(next)
    setErrorMsg(null)

    startTransition(async () => {
      const result = isActive
        ? await deleteNotificationTopic(topic)
        : await upsertNotificationTopic(topic)

      if (result.error) {
        // rollback
        setActiveTopics(new Set(activeTopics))
        setErrorMsg('저장에 실패했습니다. 다시 시도해 주세요.')
      }
    })
  }

  return (
    <div
      role="group"
      aria-labelledby="topic-section-title"
      style={{ marginTop: 16 }}
    >
      <div
        style={{
          borderTop:    '1px solid var(--line-subtle)',
          marginBottom: 12,
          paddingTop:   16,
        }}
      >
        <span
          id="topic-section-title"
          style={{ font: '700 13px/1 var(--font-sans)', color: 'var(--fg-pri)' }}
        >
          알림 받을 항목
        </span>
      </div>

      {TOPICS.map(({ key, label, description }) => {
        const isActive = activeTopics.has(key)
        return (
          <div
            key={key}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              gap:            12,
              padding:        '10px 0',
              minHeight:      44,
            }}
          >
            <div>
              <div style={{ font: '700 13px/1 var(--font-sans)', color: 'var(--fg-pri)' }}>
                {label}
              </div>
              <div
                className="sm:block hidden"
                style={{ font: '500 11px/1.3 var(--font-sans)', color: 'var(--fg-tertiary)', marginTop: 2 }}
              >
                {description}
              </div>
            </div>

            {/* pill 토글 */}
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              aria-label={`${label} ${isActive ? '끄기' : '켜기'}`}
              onClick={() => handleToggle(key)}
              style={{
                width:        40,
                height:       22,
                borderRadius: 11,
                border:       'none',
                cursor:       'pointer',
                background:   isActive ? 'var(--dj-orange)' : 'var(--line-default)',
                position:     'relative',
                flexShrink:   0,
                transition:   'background 150ms ease',
              }}
            >
              <span
                style={{
                  position:     'absolute',
                  top:          2,
                  left:         isActive ? 20 : 2,
                  width:        18,
                  height:       18,
                  borderRadius: '50%',
                  background:   '#fff',
                  transition:   'left 150ms ease',
                }}
              />
            </button>
          </div>
        )
      })}

      {errorMsg && (
        <p
          aria-live="polite"
          style={{ font: '500 11px/1.4 var(--font-sans)', color: '#dc2626', marginTop: 8 }}
        >
          {errorMsg}
        </p>
      )}
    </div>
  )
}
