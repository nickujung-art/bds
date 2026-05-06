/**
 * Phase 2 ShareButton 수용 기준 테스트 — SHARE-02
 *
 * RED 단계: ShareButton 컴포넌트가 미구현이면 import 실패 → 테스트 전체 FAIL
 * GREEN 단계: Wave 2에서 ShareButton 구현 후 PASS
 *
 * 검증 목표:
 * - window.Kakao 없을 때 handleKakaoShare가 오류 없이 반환
 * - handleCopyLink가 navigator.clipboard.writeText 호출
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// RED 단계: 이 import는 Wave 2 완료 전까지 실패한다 (ShareButton 미존재)
// GREEN 단계: Wave 2에서 src/components/complex/ShareButton.tsx 생성 후 PASS
// @ts-expect-error Wave 2 구현 전까지 모듈 미존재 (RED 단계)
import { handleKakaoShare, handleCopyLink } from '@/components/complex/ShareButton'

describe('ShareButton — Kakao SDK 없을 때 폴백', () => {
  beforeEach(() => {
    // window.Kakao 제거 (Kakao SDK 미로드 시나리오)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).Kakao
  })

  it('window.Kakao 없을 때 handleKakaoShare가 조용히 반환 (오류 없음)', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      handleKakaoShare({
        complexId: 'test-id',
        complexName: '테스트단지',
        location: '창원 성산구',
        siteUrl: 'https://danjiondo.vercel.app',
      })
    }).not.toThrow()
  })

  it('handleCopyLink가 navigator.clipboard.writeText 호출', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await handleCopyLink({
      complexId: 'test-complex-id',
      siteUrl: 'https://danjiondo.vercel.app',
    })

    expect(writeText).toHaveBeenCalledWith(
      'https://danjiondo.vercel.app/complexes/test-complex-id',
    )
  })
})
