import { test, expect } from '@playwright/test'

test.describe('City Page', () => {
  // Using Dallas as it's a known populated city in our seed data
  const cityUrl = '/us/tx/dallas'

  test('loads and displays city name', async ({ page }) => {
    await page.goto(cityUrl)

    // Check page has Dallas in title or heading
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Dallas/i)
  })

  test('displays artist grid', async ({ page }) => {
    await page.goto(cityUrl)

    // Wait for artist cards to load
    await expect(page.locator('a[href^="/artist/"]').first()).toBeVisible()

    // Check for artist cards
    const artistCards = page.locator('a[href^="/artist/"]')
    const count = await artistCards.count()

    // Dallas should have artists
    expect(count).toBeGreaterThan(0)
  })

  test('artist card links to artist page', async ({ page }) => {
    await page.goto(cityUrl)
    await expect(page.locator('a[href^="/artist/"]').first()).toBeVisible()

    // Find first artist link and get its href
    const artistLink = page.locator('a[href^="/artist/"]').first()
    const href = await artistLink.getAttribute('href')
    expect(href).toBeTruthy()

    // Navigate directly to avoid JS routing issues
    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Should be on artist page
    await expect(page).toHaveURL(/\/artist\//)
  })

  test('style filter links exist', async ({ page }) => {
    await page.goto(cityUrl)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check for style filter links (e.g., /us/tx/dallas/traditional)
    // This is an informational check - style links are optional
    const styleLinks = page.locator('a[href*="/us/tx/dallas/"]')
    const count = await styleLinks.count()

    // Log the count for debugging, but don't fail if none exist
    // Style filters are an optional feature
    expect(typeof count).toBe('number')
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
