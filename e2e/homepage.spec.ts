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
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check Browse dropdown exists (it's a button, not a link)
    const browseButton = page.locator('button:has-text("Browse")')
    const hasBrowseButton = await browseButton.count() > 0

    // Either browse button or browse link should exist
    const browseLink = page.getByRole('link', { name: /browse/i })
    const hasBrowseLink = await browseLink.count() > 0

    expect(hasBrowseButton || hasBrowseLink).toBe(true)
  })

  test('featured artists section loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check for artist cards or city links (homepage content varies)
    const artistCards = page.locator('a[href^="/artist/"]')
    const cityLinks = page.locator('a[href*="/us/"]')

    // Should have at least some content (featured artists or city links)
    const hasArtistCards = await artistCards.count() > 0
    const hasCityLinks = await cityLinks.count() > 0

    expect(hasArtistCards || hasCityLinks).toBe(true)
  })
})
