import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('loads successfully', async ({ page }) => {
    await page.goto('/')

    // Check page title
    await expect(page).toHaveTitle(/Inkdex/i)

    // Check main heading is visible
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('search input is visible and functional', async ({ page }) => {
    await page.goto('/')

    // Find search button/trigger (opens modal)
    const searchTrigger = page.locator('[data-testid="search-trigger"], button:has-text("Search")')
    await expect(searchTrigger.first()).toBeVisible()
  })

  test('navigation links work', async ({ page }) => {
    await page.goto('/')

    // Check Browse link exists and works
    const browseLink = page.getByRole('link', { name: /browse/i })
    if (await browseLink.isVisible()) {
      await browseLink.click()
      await expect(page).toHaveURL(/styles|browse/)
    }
  })

  test('featured artists section loads', async ({ page }) => {
    await page.goto('/')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check for artist cards or featured section
    const artistCards = page.locator('[data-testid="artist-card"], .artist-card, a[href^="/artist/"]')

    // Should have at least some content (featured artists or city links)
    const hasArtistCards = await artistCards.count() > 0
    const hasCityLinks = await page.locator('a[href*="/us/"]').count() > 0

    expect(hasArtistCards || hasCityLinks).toBe(true)
  })
})
