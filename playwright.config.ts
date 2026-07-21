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
      testIgnore: /maya-operating-layer\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'maya-operating-layer-desktop',
      testMatch: /maya-operating-layer\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'maya-operating-layer-mobile',
      testMatch: /maya-operating-layer\.spec\.ts/,
      use: {
        ...devices['Pixel 5'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Next.js to start
  },
})
