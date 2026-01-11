import { test, expect } from '@playwright/test'

test.describe('Artist Page', () => {
  // We'll navigate to an artist from the city page to get a valid slug
  test('loads artist profile from city page link', async ({ page }) => {
    // Start from Austin city page
    await page.goto('/us/tx/austin')
    await expect(page.locator('a[href^="/artist/"]').first()).toBeVisible()

    // Find first artist link and get its href
    const artistLink = page.locator('a[href^="/artist/"]').first()
    const href = await artistLink.getAttribute('href')
    expect(href).toBeTruthy()

    // Navigate directly to avoid any JS routing issues
    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Should be on artist page
    await expect(page).toHaveURL(/\/artist\//)
  })

  test('displays portfolio images', async ({ page }) => {
    await page.goto('/us/tx/austin')
    await expect(page.locator('a[href^="/artist/"]').first()).toBeVisible()

    const artistLink = page.locator('a[href^="/artist/"]').first()
    const href = await artistLink.getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check for any images on the page (portfolio)
    const images = page.locator('img')
    const count = await images.count()

    // Artist should have at least one image
    expect(count).toBeGreaterThan(0)
  })

  test('shows Instagram link or handle', async ({ page }) => {
    await page.goto('/us/tx/austin')
    await expect(page.locator('a[href^="/artist/"]').first()).toBeVisible()

    const artistLink = page.locator('a[href^="/artist/"]').first()
    const href = await artistLink.getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Check for Instagram link (various formats)
    const instagramLink = page.locator('a[href*="instagram.com"]')
    const atHandle = page.locator('text=/@[a-zA-Z]/')

    const hasInstagram = await instagramLink.count() > 0
    const hasHandle = await atHandle.count() > 0

    // Should have some Instagram reference (link or @handle text)
    expect(hasInstagram || hasHandle).toBe(true)
  })

  test('has location information', async ({ page }) => {
    await page.goto('/us/tx/austin')
    await expect(page.locator('a[href^="/artist/"]').first()).toBeVisible()

    const artistLink = page.locator('a[href^="/artist/"]').first()
    const href = await artistLink.getAttribute('href')
    expect(href).toBeTruthy()

    await page.goto(href!)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Page content should contain location info
    const pageContent = await page.textContent('body')
    const hasLocation = /Austin|Texas|TX/i.test(pageContent || '')

    expect(hasLocation).toBe(true)
  })
})

test.describe('Artist Page - Direct Access', () => {
  test('shows 404 for non-existent artist', async ({ page }) => {
    const response = await page.goto('/artist/fake-artist-that-does-not-exist-xyz')
    await page.waitForLoadState('networkidle')

    // Should return 404 status OR show not found content
    // Note: Next.js dev mode may return 200 but still render not-found page
    const is404 = response?.status() === 404

    // Check for "Artist Not Found" heading (h2) or "404" heading (h1)
    const artistNotFoundHeading = page.getByRole('heading', { name: /Artist Not Found/i })
    const notFoundCode = page.getByRole('heading', { name: '404' })

    const hasArtistNotFound = await artistNotFoundHeading.isVisible().catch(() => false)
    const has404 = await notFoundCode.isVisible().catch(() => false)

    expect(is404 || hasArtistNotFound || has404).toBe(true)
  })
})
