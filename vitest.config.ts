import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

const quarantinedSuites = [
  "tests/admin-declutter.test.ts",
  "tests/app-v3-carousel-design-systems.test.ts",
  "tests/blueprint-cleanup-audit.test.ts",
  "tests/brand-engine-broadcast-panel.test.js",
  "tests/checkout-success-next-actions.test.ts",
  "tests/deliverable-experience-slice.test.ts",
  "tests/email-routing.test.ts",
  "tests/external-endpoint-hardening.test.ts",
  "tests/funnel-2026-report.test.ts",
  "tests/funnel-cleanup-admin-page.test.ts",
  "tests/funnel-cleanup-candidates.test.ts",
  "tests/funnel-final-leaks-regression.test.ts",
  "tests/funnel-ladder-regression.test.ts",
  "tests/maya-auto-select-mode.test.ts",
  "tests/maya-generate-image-confirmation.test.tsx",
  "tests/maya-inline-feed-chat-route.test.ts",
  "tests/maya-layout-hygiene.test.ts",
  "tests/maya-mode-header-precedence.test.ts",
  "tests/maya-mode-toggle-labels.test.tsx",
  "tests/maya-photos-home-prompts.test.tsx",
  "tests/maya-prompt-contract.test.ts",
  "tests/maya-tab-handoff-chat-route.test.ts",
  "tests/maya-tab-scope.test.ts",
  "tests/modular-mini-products.test.ts",
  "tests/offer-attribution-semantics.test.ts",
  "tests/phase4-route-hygiene.test.ts",
  "tests/post-purchase-account-setup.test.ts",
  "tests/public-offer-checkout-paths.test.ts",
  "tests/revenue-email-links.test.ts",
  "tests/route-cron-diet.test.ts",
  "tests/selfie-guide-experience-ui.test.tsx",
  "tests/selfie-guide-experience.test.ts",
  "tests/selfie-guide-link-routing.test.ts",
  "tests/selfie-guide-paid-funnel.test.ts",
  "tests/selfie-guide-public-route.test.ts",
  "tests/transform-launch-readiness.test.ts",
  "tests/usd-pricing-copy.test.ts",
  "tests/user-journey-smoke-flows.test.ts",
  "tests/visibility-suite-entitlements.test.ts",
  "tests/welcome-first-generation-followup-email.test.ts",
]

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    maxWorkers: 2,
    minWorkers: 2,
    setupFiles: ["./tests/setup.ts"],
    include: ["**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["node_modules", ".next", "out", "build", ".claude", "tmp", ...quarantinedSuites],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
})
