import { chromium, type Page } from "@playwright/test"
import { USER_JOURNEY_SMOKE_FLOWS, type JourneySmokeFlow } from "@/lib/automation/user-journey-smoke-flows"
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

async function readStableTitle(page: Page) {
  try {
    return await page.title()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes("Execution context was destroyed")) {
      throw error
    }

    await page.waitForLoadState("domcontentloaded", { timeout: NAV_TIMEOUT_MS })
    return page.title()
  }
}

async function resolveCheckoutFromCta(input: {
  landingPath: string
  expectedTitle: RegExp
  name: string
  trigger: JourneySmokeFlow["trigger"]
}): Promise<FlowResult> {
  const landingUrl = `${BASE_URL}${input.landingPath}`
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()

  try {
    await page.goto(landingUrl, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })

    const title = await readStableTitle(page)
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

    let checkoutUrl = ""

    if (input.trigger.type === "href") {
      const cta = page.locator(`a[href="${input.trigger.href}"]`).first()
      await cta.waitFor({ state: "attached", timeout: NAV_TIMEOUT_MS }).catch(() => null)
      if ((await cta.count()) === 0) {
        return {
          name: input.name,
          status: "fail",
          landingUrl,
          checkoutUrl: "",
          finalUrl: page.url(),
          detail: `CTA not found: ${input.trigger.href}`,
        }
      }

      checkoutUrl = new URL(input.trigger.href, BASE_URL).toString()
      await page.goto(checkoutUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      })
      await page.waitForURL(/\/checkout(\?|$|\/failure)/, { timeout: NAV_TIMEOUT_MS })
    } else if (input.trigger.type === "goto") {
      checkoutUrl = new URL(input.trigger.href, BASE_URL).toString()
      await page.goto(checkoutUrl, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      })
      await page.waitForURL(/\/checkout(\?|$|\/failure)/, { timeout: NAV_TIMEOUT_MS })
    } else {
      const cta = page.getByRole("button", { name: input.trigger.name }).first()
      await cta.waitFor({ state: "visible", timeout: NAV_TIMEOUT_MS }).catch(() => null)
      if ((await cta.count()) === 0) {
        return {
          name: input.name,
          status: "fail",
          landingUrl,
          checkoutUrl: landingUrl,
          finalUrl: page.url(),
          detail: `CTA button not found: ${input.trigger.name}`,
        }
      }

      checkoutUrl = landingUrl
      await Promise.all([
        page.waitForURL(/\/checkout(\?|$|\/failure)/, { timeout: NAV_TIMEOUT_MS }),
        cta.click(),
      ])
    }

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
      checkoutUrl:
        input.trigger.type === "href" || input.trigger.type === "goto"
          ? new URL(input.trigger.href, BASE_URL).toString()
          : landingUrl,
      finalUrl: page.url(),
      detail: error instanceof Error ? error.message : "Unknown browser error",
    }
  } finally {
    await browser.close()
  }
}

async function main() {
  const results: FlowResult[] = []

  for (const flow of USER_JOURNEY_SMOKE_FLOWS) {
    results.push(
      await resolveCheckoutFromCta({
        name: flow.name,
        landingPath: flow.landingPath,
        expectedTitle: flow.expectedTitle,
        trigger: flow.trigger,
      }),
    )
  }

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

main().catch((error) => {
  console.error("[user-journey-smoke] failed", error)
  process.exitCode = 1
})
