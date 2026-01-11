import { test, expect } from '@playwright/test'

test.describe('Add Artist Page', () => {
  test('loads and displays main sections', async ({ page }) => {
    await page.goto('/add-artist')

    // Check page title
    await expect(page).toHaveTitle(/Add Your Studio/i)

    // Check main heading
    await expect(page.getByRole('heading', { name: /add artist/i })).toBeVisible()

    // Check both columns exist
    await expect(page.getByRole('heading', { name: /I'm a Tattoo Artist/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Recommend an Artist/i })).toBeVisible()
  })

  test('Instagram OAuth button exists and links correctly', async ({ page }) => {
    await page.goto('/add-artist')

    // Find the Instagram OAuth link
    const oauthLink = page.locator('a[href="/api/add-artist/self-add"]')
    await expect(oauthLink).toBeVisible()
    await expect(oauthLink).toContainText(/Connect with Instagram/i)
  })

  test('recommend form validates empty input', async ({ page }) => {
    await page.goto('/add-artist')

    // Find the submit button - should be disabled when input is empty
    const submitButton = page.getByRole('button', { name: /Submit Recommendation/i })
    await expect(submitButton).toBeVisible()
    await expect(submitButton).toBeDisabled()
  })

  test('recommend form enables button with input', async ({ page }) => {
    await page.goto('/add-artist')

    // Find input and type a username
    const input = page.locator('#instagram-handle')
    await expect(input).toBeVisible()

    await input.fill('testartist')

    // Button should now be enabled
    const submitButton = page.getByRole('button', { name: /Submit Recommendation/i })
    await expect(submitButton).toBeEnabled()
  })

  test('how it works section displays steps', async ({ page }) => {
    await page.goto('/add-artist')

    // Check "How It Works" section
    await expect(page.getByRole('heading', { name: /how it works/i })).toBeVisible()

    // Check the 3 steps exist
    await expect(page.getByRole('heading', { name: /Visual Search/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /AI Matching/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Connect/i })).toBeVisible()
  })

  test('FAQ section displays questions', async ({ page }) => {
    await page.goto('/add-artist')

    // Check FAQ section
    await expect(page.getByRole('heading', { name: /Frequently Asked/i })).toBeVisible()

    // Check at least one FAQ question exists
    await expect(page.getByRole('heading', { name: /How is this different from Instagram/i })).toBeVisible()
  })
})
