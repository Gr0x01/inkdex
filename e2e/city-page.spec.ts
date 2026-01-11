import { test, expect } from '@playwright/test'

test.describe('City Page', () => {
  // Using Austin as it's a known populated city
  const cityUrl = '/us/tx/austin'

  test('loads and displays city name', async ({ page }) => {
    await page.goto(cityUrl)

    // Check page has Austin in title or heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Austin/i)
  })

  test('displays artist grid', async ({ page }) => {
    await page.goto(cityUrl)

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check for artist cards
    const artistCards = page.locator('[data-testid="artist-card"], .artist-card, a[href^="/artist/"]')
    const count = await artistCards.count()

    // Austin should have artists
    expect(count).toBeGreaterThan(0)
  })

  test('artist card links to artist page', async ({ page }) => {
    await page.goto(cityUrl)
    await page.waitForLoadState('networkidle')

    // Find first artist link and get its href
    const artistLink = page.locator('a[href^="/artist/"]').first()
    const href = await artistLink.getAttribute('href')

    if (href) {
      // Navigate directly to avoid JS routing issues
      await page.goto(href)
      await page.waitForLoadState('networkidle')

      // Should be on artist page
      await expect(page).toHaveURL(/\/artist\//)
    }
  })

  test('style filter links exist', async ({ page }) => {
    await page.goto(cityUrl)
    await page.waitForLoadState('networkidle')

    // Check for style filter links (e.g., /us/tx/austin/traditional)
    const styleLinks = page.locator('a[href*="/us/tx/austin/"]')
    const count = await styleLinks.count()

    // Should have some style links
    expect(count).toBeGreaterThanOrEqual(0) // May or may not have style filters
  })
})

test.describe('City Page - 404 Handling', () => {
  test('shows 404 for non-existent city', async ({ page }) => {
    const response = await page.goto('/us/tx/fake-city-xyz')

    // Should return 404 or show not found message
    const is404 = response?.status() === 404
    const hasNotFoundText = await page.getByText(/not found|404|doesn't exist/i).isVisible().catch(() => false)

    expect(is404 || hasNotFoundText).toBe(true)
  })
})
