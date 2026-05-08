'use client'
import { useState, useRef } from 'react'
// NOTE: NO createClientComponentClient — CLAUDE.md forbids client-side Supabase queries
// Storage upload is done via Server Action uploadL3Document in gps-badge.ts
import { uploadL3Document, submitL3VerificationRequest } from '@/lib/auth/gps-badge'

interface GpsVerifyL3UploadProps {
  complexId: string
  onSuccess?: () => void
}

type DocType = '등본' | '관리비'
type UploadState = 'idle' | 'uploading' | 'success' | 'error'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export function GpsVerifyL3Upload({ complexId, onSuccess }: GpsVerifyL3UploadProps) {
  const [docType, setDocType] = useState<DocType>('등본')
  const [state, setState] = useState<UploadState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg('JPG, PNG, PDF 파일만 업로드 가능합니다.')
      return
    }
    if (file.size > MAX_SIZE) {
      setErrorMsg('파일 크기는 5MB 이하여야 합니다.')
      return
    }

    setState('uploading')
    setErrorMsg(null)

    try {
      // Server Action으로 Storage 업로드 (CLAUDE.md 준수)
      const formData = new FormData()
      formData.append('file', file)
      const uploadResult = await uploadL3Document(complexId, docType, formData)
      if (!uploadResult.success || !uploadResult.storagePath) {
        throw new Error(uploadResult.error ?? '업로드 실패')
      }

      // Server Action으로 DB 기록
      const result = await submitL3VerificationRequest(complexId, docType, uploadResult.storagePath)
      if (!result.success) throw new Error(result.error ?? '신청 실패')

      setState('success')
      onSuccess?.()
    } catch (err) {
      console.error('[GpsVerifyL3Upload]', err)
      setErrorMsg(err instanceof Error ? err.message : '업로드 실패')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div style={{ font: '500 13px/1.6 var(--font-sans)', color: 'var(--fg-positive)', padding: '12px 0' }}>
        서류가 제출되었습니다. 관리자 검토 후 배지가 업그레이드됩니다. (1~3 영업일 소요)
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {(['등본', '관리비'] as DocType[]).map(type => (
          <button
            key={type}
            className={`chip${docType === type ? ' selected' : ''}`}
            onClick={() => setDocType(type)}
            type="button"
          >
            {type === '등본' ? '주민등록등본' : '관리비 납부 확인서'}
          </button>
        ))}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        style={{ display: 'none' }}
        aria-label="서류 파일 선택"
        onChange={(e) => {
          setErrorMsg(null)
          setFileName(e.target.files?.[0]?.name ?? null)
        }}
      />

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          className="btn btn-md btn-secondary"
          onClick={() => fileRef.current?.click()}
          disabled={state === 'uploading'}
          type="button"
        >
          파일 선택
        </button>
        {fileName && (
          <span style={{ font: '500 12px/1 var(--font-sans)', color: 'var(--fg-sec)' }}>
            {fileName}
          </span>
        )}
        <button
          className="btn btn-md btn-orange"
          onClick={() => void handleUpload()}
          disabled={state === 'uploading'}
          type="button"
        >
          {state === 'uploading' ? '업로드 중...' : '제출'}
        </button>
      </div>

      {errorMsg && (
        <p style={{ font: '500 12px/1.4 var(--font-sans)', color: 'var(--fg-negative)', margin: 0 }}>
          {errorMsg}
        </p>
      )}
    </div>
  )
}
