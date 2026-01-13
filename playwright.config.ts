import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for SSELFIE Blueprint Funnel E2E Tests
 * 
 * Tests the complete user journey from sign up to paid feed generation
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts$/, // Only run .spec.ts files (exclude .test.ts Vitest files)
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Next.js to start
  },
})
