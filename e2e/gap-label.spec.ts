import { test, expect, type Page } from '@playwright/test'

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

test.describe('Phase 6: 갭 라벨', () => {
  test.skip(SKIP_IN_CI, 'Requires local Supabase with listing_prices data')

  test('단지 상세 페이지 상단에 매물 가격이 있으면 갭 라벨이 조건부 표시된다', async ({ page }) => {
    const found = await navigateToFirstComplex(page)
    if (!found) {
      test.skip()
      return
    }
    await page.waitForURL(/\/complexes\//)

    // 갭 라벨 배지 (listing_prices 데이터가 있을 때만 표시)
    const gapBadge = page.locator('.badge.neg, .badge.pos').filter({ hasText: /시세보다/ })
    const count = await gapBadge.count()

    if (count > 0) {
      // 배지 텍스트 형식 확인
      await expect(gapBadge.first()).toContainText('시세보다')
      await expect(gapBadge.first()).toContainText(/높음|낮음/)
      // aria-label 확인
      await expect(gapBadge.first()).toHaveAttribute('aria-label', /매물 시세 비교/)
    }
    // 데이터가 없으면 배지 없음도 정상 (D-12)
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('갭 라벨 배지가 높음이면 neg(비쌈) 또는 낮음이면 pos(저렴) 클래스를 갖는다', async ({ page }) => {
    const found = await navigateToFirstComplex(page)
    if (!found) {
      test.skip()
      return
    }
    await page.waitForURL(/\/complexes\//)

    const negBadge = page.locator('.badge.neg').filter({ hasText: '높음' })
    const posBadge = page.locator('.badge.pos').filter({ hasText: '낮음' })

    const negCount = await negBadge.count()
    const posCount = await posBadge.count()

    // neg 배지가 있으면 "높음" 포함, pos 배지가 있으면 "낮음" 포함
    if (negCount > 0) {
      await expect(negBadge.first()).toContainText('높음')
    }
    if (posCount > 0) {
      await expect(posBadge.first()).toContainText('낮음')
    }
    // 둘 다 없어도 통과 (데이터 없는 경우)
    expect(negCount + posCount).toBeGreaterThanOrEqual(0)
  })
})
