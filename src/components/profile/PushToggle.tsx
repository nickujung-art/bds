'use client'

import { useState, useEffect } from 'react'
import { registerPushSubscription, unregisterPushSubscription } from '@/lib/auth/push-actions'

interface Props {
  initialSubscribed: boolean
  vapidPublicKey:    string
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export function PushToggle({ initialSubscribed, vapidPublicKey }: Props) {
  const [subscribed, setSubscribed] = useState(initialSubscribed)
  const [supported, setSupported]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    setSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  async function toggle() {
    setLoading(true)
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready

      if (subscribed) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await sub.unsubscribe()
          await unregisterPushSubscription(sub.endpoint)
        }
        setSubscribed(false)
      } else {
        if (Notification.permission === 'denied') {
          setError('브라우저 알림이 차단되어 있습니다. 브라우저 설정에서 허용해주세요.')
          return
        }
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setError('알림 권한이 필요합니다.')
          return
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        })
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        const result = await registerPushSubscription({
          endpoint: json.endpoint,
          p256dh:   json.keys.p256dh,
          auth:     json.keys.auth,
        })
        if (result.error) { setError(result.error); return }
        setSubscribed(true)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  if (!supported) {
    return (
      <span style={{ font: '500 12px/1.4 var(--font-sans)', color: 'var(--fg-tertiary)' }}>
        이 브라우저는 푸시 알림을 지원하지 않습니다.
      </span>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={toggle}
          disabled={loading}
          aria-pressed={subscribed}
          style={{
            position:     'relative',
            width:        44,
            height:       26,
            borderRadius: 13,
            border:       'none',
            cursor:       loading ? 'not-allowed' : 'pointer',
            background:   subscribed ? 'var(--dj-orange)' : 'var(--line-default)',
            transition:   'background 0.2s',
            flexShrink:   0,
          }}
        >
          <span
            style={{
              position:     'absolute',
              top:          3,
              left:         subscribed ? 21 : 3,
              width:        20,
              height:       20,
              borderRadius: '50%',
              background:   '#fff',
              boxShadow:    '0 1px 3px rgba(0,0,0,0.2)',
              transition:   'left 0.2s',
            }}
          />
        </button>
        <div>
          <div style={{ font: '600 13px/1.3 var(--font-sans)' }}>
            {subscribed ? '푸시 알림 켜짐' : '푸시 알림 꺼짐'}
          </div>
          <div style={{ font: '500 11px/1.4 var(--font-sans)', color: 'var(--fg-tertiary)', marginTop: 2 }}>
            관심단지 신고가 발생 시 브라우저로 알림을 받습니다.
          </div>
        </div>
      </div>
      {error && (
        <div
          style={{
            marginTop: 8,
            font:      '500 12px/1.4 var(--font-sans)',
            color:     '#dc2626',
          }}
        >
          {error}
        </div>
      )}
    </div>
  )
}
