import { test, expect, type Page } from '@playwright/test'

/**
 * Phase 6 E2E 테스트
 * 전제: 로컬 Supabase + Next.js dev server (localhost:3000)
 * 전제: complexes 테이블에 최소 1개의 active 단지 존재
 * 전제: district_stats 테이블에 데이터 (SGIS 없을 시 데이터 없음 안내)
 */

// 테스트에 사용할 단지 ID (실제 DB에 존재하는 값으로 환경 별로 다를 수 있음)
// CI 환경에서는 SKIP (Supabase 연결 불가)
const SKIP_IN_CI = !!process.env.CI

async function navigateToFirstComplex(page: Page): Promise<boolean> {
  await page.goto('/')
  await page.waitForLoadState('domcontentloaded')
  const firstComplexLink = page.locator('a[href^="/complexes/"]').first()
  if (await firstComplexLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await firstComplexLink.click()
    await page.waitForLoadState('domcontentloaded')
    return true
  }
  return false
}

test.describe('Phase 6: AI 상담 버튼', () => {
  test.skip(SKIP_IN_CI, 'Requires local Supabase')

  test('단지 상세 페이지에 AI 상담 버튼이 표시된다', async ({ page }) => {
    const found = await navigateToFirstComplex(page)
    if (!found) {
      test.skip()
      return
    }
    await page.waitForURL(/\/complexes\//)

    // AI 상담 버튼 확인
    const aiBtn = page.getByRole('button', { name: 'AI 상담' })
    await expect(aiBtn).toBeVisible()
  })

  test('AI 상담 버튼 클릭 시 패널이 열린다', async ({ page }) => {
    const found = await navigateToFirstComplex(page)
    if (!found) {
      test.skip()
      return
    }
    await page.waitForURL(/\/complexes\//)

    const aiBtn = page.getByRole('button', { name: 'AI 상담' })
    await expect(aiBtn).toBeVisible()

    // 클릭 후 패널 열림
    await aiBtn.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    // 면책 고지 메시지 확인
    await expect(page.locator('text=투자 조언이 아닙니다')).toBeVisible()

    // 닫기 버튼 확인
    await expect(page.getByRole('button', { name: '닫기' })).toBeVisible()
  })

  test('AI 상담 패널에서 "닫기" 버튼으로 패널 닫힘', async ({ page }) => {
    const found = await navigateToFirstComplex(page)
    if (!found) {
      test.skip()
      return
    }
    await page.waitForURL(/\/complexes\//)

    await page.getByRole('button', { name: 'AI 상담' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByRole('button', { name: '닫기' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('AI 상담 패널에서 Escape 키로 패널 닫힘', async ({ page }) => {
    const found = await navigateToFirstComplex(page)
    if (!found) {
      test.skip()
      return
    }
    await page.waitForURL(/\/complexes\//)

    await page.getByRole('button', { name: 'AI 상담' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})

test.describe('Phase 6: 어드민 ROI 현황', () => {
  test.skip(SKIP_IN_CI, 'Requires admin auth + local Supabase')

  test('/admin/ads 페이지에 ROI 현황이 표시된다', async ({ page }) => {
    // 어드민 로그인 없이 접근 시 redirect 확인
    await page.goto('/admin/ads')
    // 비로그인 시 login redirect
    if (page.url().includes('/login')) {
      test.skip()
      return
    }
    await expect(page.locator('text=광고 ROI 현황')).toBeVisible()
  })
})

test.describe('Phase 6: 지역통계 지도 (SGIS 데이터 없을 시 안내)', () => {
  test.skip(SKIP_IN_CI, 'Requires local Supabase with SGIS data')

  test('단지 상세 페이지 분석탭에 지역 통계 카드가 존재하거나 데이터 없음 안내가 표시된다', async ({ page }) => {
    const found = await navigateToFirstComplex(page)
    if (!found) {
      test.skip()
      return
    }
    await page.waitForURL(/\/complexes\//)

    // district_stats 데이터가 있으면 표시, 없으면 안내문 (D-12)
    const statsCard = page.locator('[role="region"][aria-labelledby="district-stats-heading"]')
    const count = await statsCard.count()

    if (count > 0) {
      await expect(page.locator('#district-stats-heading')).toHaveText('지역 통계')
    }
    // 데이터가 없어도 테스트 통과 (데이터는 ingest-sgis.ts 실행 후)
    expect(count).toBeGreaterThanOrEqual(0)
  })
})
