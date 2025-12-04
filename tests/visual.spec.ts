import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

test('map reflects target and protocol changes', async ({ page }) => {
  await page.goto(BASE_URL)

  // Ensure protocol pills are visible and select Site-to-Site
  await page.getByRole('button', { name: 'AWS Site-to-Site (IPsec)' }).click()
  await expect(page.getByText('Protocol · AWS Site-to-Site')).toBeVisible()

  // Change target to AWS Sidecar
  await page.getByRole('button', { name: 'AWS Sidecar' }).click()
  await expect(page.getByText('Target · aws-sidecar')).toBeVisible()

  // Trigger connect to see live state
  await page.getByRole('button', { name: 'Connect & visualize' }).click()
  await expect(page.getByText('Connected')).toBeVisible()

  // Grab a focused screenshot of the map area for visual inspection
  const map = page.locator('.map')
  await expect(map).toBeVisible()
  await map.screenshot({ path: 'tests/output/map.png' })
})
