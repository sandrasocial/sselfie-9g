import { chromium } from "@playwright/test"
import { writeReport } from "./audit/_shared"

const BASE_URL = (process.env.JOURNEY_SMOKE_BASE_URL || "https://sselfie.ai").replace(/\/$/, "")
const NAV_TIMEOUT_MS = Number.parseInt(process.env.JOURNEY_SMOKE_TIMEOUT_MS || "30000", 10)

type FlowResult = {
  name: string
  status: "pass" | "fail"
  landingUrl: string
  checkoutUrl: string
  finalUrl: string
  detail: string
}

async function resolveMembershipToggleIfPresent(page: any) {
  const isMembershipLanding = /\/checkout\/membership(?:\?|$)/.test(page.url())
  if (!isMembershipLanding) return false

  const continueButton = page.getByRole("button", { name: /continue to checkout/i })
  if ((await continueButton.count()) === 0) return false

  await continueButton.click()
  await page.waitForURL(/\/checkout(\?|$|\/failure)/, { timeout: NAV_TIMEOUT_MS })
  return true
}

async function resolveCheckoutFromCta(input: {
  landingPath: string
  ctaHref: string
  expectedTitle: RegExp
  name: string
}): Promise<FlowResult> {
  const landingUrl = `${BASE_URL}${input.landingPath}`
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(landingUrl, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })

    const title = await page.title()
    if (!input.expectedTitle.test(title)) {
      return {
        name: input.name,
        status: "fail",
        landingUrl,
        checkoutUrl: "",
        finalUrl: page.url(),
        detail: `Unexpected landing title: ${title}`,
      }
    }

    const cta = page.locator(`a[href="${input.ctaHref}"]`).first()
    if ((await cta.count()) === 0) {
      return {
        name: input.name,
        status: "fail",
        landingUrl,
        checkoutUrl: "",
        finalUrl: page.url(),
        detail: `CTA not found: ${input.ctaHref}`,
      }
    }

    const checkoutUrl = new URL(input.ctaHref, BASE_URL).toString()
    await page.goto(checkoutUrl, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })
    await page.waitForURL(/\/checkout(\?|$|\/failure)/, { timeout: NAV_TIMEOUT_MS })

    const finalUrl = page.url()
    if (/\/auth\/|\/sign-?in|\/sign-?up/i.test(finalUrl)) {
      return {
        name: input.name,
        status: "fail",
        landingUrl,
        checkoutUrl,
        finalUrl,
        detail: "Redirected to auth wall",
      }
    }

    if (/\/checkout\/failure/i.test(finalUrl)) {
      return {
        name: input.name,
        status: "fail",
        landingUrl,
        checkoutUrl,
        finalUrl,
        detail: "Checkout flow landed on failure page",
      }
    }

    if (!/client_secret=/.test(finalUrl)) {
      return {
        name: input.name,
        status: "fail",
        landingUrl,
        checkoutUrl,
        finalUrl,
        detail: "Checkout route loaded without a client_secret",
      }
    }

    return {
      name: input.name,
      status: "pass",
      landingUrl,
      checkoutUrl,
      finalUrl,
      detail: "Landing CTA resolved to live checkout",
    }
  } catch (error) {
    return {
      name: input.name,
      status: "fail",
      landingUrl,
      checkoutUrl: new URL(input.ctaHref, BASE_URL).toString(),
      finalUrl: page.url(),
      detail: error instanceof Error ? error.message : "Unknown browser error",
    }
  } finally {
    await browser.close()
  }
}

export async function resolveDirectCheckout(input: {
  path: string
  name: string
}): Promise<FlowResult> {
  const landingUrl = `${BASE_URL}${input.path}`
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(landingUrl, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })
    try {
      await page.waitForURL(/\/checkout(\?|$|\/failure)/, { timeout: NAV_TIMEOUT_MS })
    } catch (error) {
      const resolvedFromToggle = await resolveMembershipToggleIfPresent(page)
      if (!resolvedFromToggle) throw error
    }

    const finalUrl = page.url()
    if (/\/auth\/|\/sign-?in|\/sign-?up/i.test(finalUrl)) {
      return {
        name: input.name,
        status: "fail",
        landingUrl,
        checkoutUrl: landingUrl,
        finalUrl,
        detail: "Redirected to auth wall",
      }
    }

    if (/\/checkout\/failure/i.test(finalUrl)) {
      return {
        name: input.name,
        status: "fail",
        landingUrl,
        checkoutUrl: landingUrl,
        finalUrl,
        detail: "Checkout flow landed on failure page",
      }
    }

    if (!/client_secret=/.test(finalUrl)) {
      return {
        name: input.name,
        status: "fail",
        landingUrl,
        checkoutUrl: landingUrl,
        finalUrl,
        detail: "Membership checkout loaded without a client_secret",
      }
    }

    return {
      name: input.name,
      status: "pass",
      landingUrl,
      checkoutUrl: landingUrl,
      finalUrl,
      detail: "Direct checkout route resolved successfully",
    }
  } catch (error) {
    return {
      name: input.name,
      status: "fail",
      landingUrl,
      checkoutUrl: landingUrl,
      finalUrl: page.url(),
      detail: error instanceof Error ? error.message : "Unknown browser error",
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  const results: FlowResult[] = []

  results.push(
    await resolveCheckoutFromCta({
      name: "Selfie Guide",
      landingPath: "/selfie-guide",
      ctaHref: "/checkout/selfie-guide?plan=guide",
      expectedTitle: /Selfie Guide/i,
    }),
  )

  results.push(
    await resolveCheckoutFromCta({
      name: "Brand Strategy",
      landingPath: "/brand-strategy",
      ctaHref: "/checkout/brand-strategy-pack",
      expectedTitle: /Brand Strategy/i,
    }),
  )

  results.push(
    await resolveDirectCheckout({
      name: "Studio Membership",
      path: "/checkout/membership",
    }),
  )

  const failed = results.filter((result) => result.status === "fail")
  const lines = [
    "# User Journey Smoke",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Base URL: ${BASE_URL}`,
    "",
    "## Results",
  ]

  for (const result of results) {
    lines.push(`- ${result.status === "pass" ? "PASS" : "FAIL"} ${result.name}`)
    lines.push(`  - Landing: ${result.landingUrl}`)
    lines.push(`  - Checkout: ${result.checkoutUrl}`)
    lines.push(`  - Final URL: ${result.finalUrl}`)
    lines.push(`  - Detail: ${result.detail}`)
  }

  lines.push("")
  lines.push(`Summary: ${results.length - failed.length}/${results.length} flows passed.`)

  const reportPath = await writeReport("user-journey-smoke", lines)
  console.log(`[user-journey-smoke] wrote ${reportPath}`)

  if (failed.length > 0) {
    process.exitCode = 1
  }
}

if (process.env.NODE_ENV !== "test") {
  main().catch((error) => {
    console.error("[user-journey-smoke] failed", error)
    process.exitCode = 1
  })
}
