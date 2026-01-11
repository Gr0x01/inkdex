import { test, expect } from '@playwright/test'

test.describe('Search', () => {
  // Use desktop navbar search (hidden class="hidden md:block")
  const getDesktopSearchInput = (page: import('@playwright/test').Page) =>
    page.locator('.hidden.md\\:block input[placeholder*="Search artists"]')

  const getDesktopSearchButton = (page: import('@playwright/test').Page) =>
    page.locator('.hidden.md\\:block button[type="submit"]:has-text("Search")')

  test('text search returns results', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    // Find the search input in the desktop navbar
    const searchInput = getDesktopSearchInput(page)
    await expect(searchInput).toBeVisible()

    // Enter a search query using keyboard (triggers React onChange properly)
    await searchInput.click()
    await searchInput.pressSequentially('traditional japanese', { delay: 20 })

    // Wait for React state to update and button to enable
    const searchButton = getDesktopSearchButton(page)
    await expect(searchButton).toBeEnabled({ timeout: 5000 })

    // Submit the search form
    await searchButton.click()

    // Wait for navigation to search results page
    await expect(page).toHaveURL(/\/search\?id=/, { timeout: 30000 })

    // Verify search results page loaded
    await expect(page.locator('text=/\\d+ artists? found/')).toBeVisible({ timeout: 15000 })

    // Should have at least one artist result (link to artist page)
    const artistLinks = page.locator('a[href^="/artist/"]')
    await expect(artistLinks.first()).toBeVisible({ timeout: 10000 })
  })

  test('search requires minimum 3 characters', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const searchInput = getDesktopSearchInput(page)
    await expect(searchInput).toBeVisible()

    // Enter only 2 characters using keyboard
    await searchInput.click()
    await searchInput.pressSequentially('ab', { delay: 20 })

    // Search button should be disabled (need at least 3 chars)
    const searchButton = getDesktopSearchButton(page)
    await expect(searchButton).toBeDisabled()
  })

  test('search input accepts Instagram URL', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const searchInput = getDesktopSearchInput(page)
    await expect(searchInput).toBeVisible()

    // Enter an Instagram profile URL using keyboard
    await searchInput.click()
    await searchInput.pressSequentially('https://instagram.com/testuser', { delay: 20 })

    // Should show Instagram badge indicating profile detected
    const instagramBadge = page.locator('text=/testuser/')
    await expect(instagramBadge).toBeVisible({ timeout: 5000 })

    // Search button should be enabled
    const searchButton = getDesktopSearchButton(page)
    await expect(searchButton).toBeEnabled()
  })

  test('search results page shows result count', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const searchInput = getDesktopSearchInput(page)
    await searchInput.click()
    await searchInput.pressSequentially('blackwork', { delay: 20 })

    const searchButton = getDesktopSearchButton(page)
    await expect(searchButton).toBeEnabled({ timeout: 5000 })
    await searchButton.click()

    // Wait for search results page
    await expect(page).toHaveURL(/\/search\?id=/, { timeout: 30000 })

    // Should show result count (e.g., "42 artists found")
    await expect(page.locator('text=/\\d+ artists? found/')).toBeVisible({ timeout: 15000 })
  })

  test('search input accepts @username format', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

    const searchInput = getDesktopSearchInput(page)
    await expect(searchInput).toBeVisible()

    // Enter @username format
    await searchInput.click()
    await searchInput.pressSequentially('@someartist', { delay: 20 })

    // Should detect as Instagram profile
    const badge = page.locator('text=/someartist/')
    await expect(badge).toBeVisible({ timeout: 5000 })

    // Search button should be enabled
    const searchButton = getDesktopSearchButton(page)
    await expect(searchButton).toBeEnabled()
  })
})
