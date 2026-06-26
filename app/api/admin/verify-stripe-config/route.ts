/**
 * FIX C1: Admin Stripe Configuration Verification Endpoint
 * 
 * Provides runtime verification of Stripe pricing configuration
 * for admin diagnostics.
 * 
 * Access: Admin only (add auth check in production)
 */

import { NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { getValidationStatus } from "@/lib/stripe/validate-pricing-config"

interface StripeDiagnosticResults {
  timestamp: string
  validationCacheStatus: ReturnType<typeof getValidationStatus>
  environmentVariables: Record<string, { isSet: boolean; value: string | null }>
  priceVerifications: PriceVerification[]
  expectedConfiguration: Record<string, ExpectedPriceConfiguration>
  validationIssues: string[]
  isValid: boolean
}

interface PriceVerification {
  envVar: string
  priceId: string
  exists: boolean
  active?: boolean
  amount?: number | null
  amountFormatted?: string | null
  currency?: string
  recurring?: {
    interval: string
    intervalCount: number
  } | null
  product?: string
  error?: string
}

interface ExpectedPriceConfiguration {
  envVar: string
  expectedAmount: number
  expectedAmountFormatted: string
  expectedRecurring: boolean
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
}

function unauthorized(error?: string) {
  return NextResponse.json(
    { error: error || "Admin access required" },
    { status: error === "Not authenticated" ? 401 : 403 },
  )
}

export async function GET() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return unauthorized(adminCheck.error)
  }

  try {
    const results: StripeDiagnosticResults = {
      timestamp: new Date().toISOString(),
      validationCacheStatus: getValidationStatus(),
      environmentVariables: {},
      priceVerifications: [],
      expectedConfiguration: {},
      validationIssues: [],
      isValid: false,
    }
    
    // Check environment variables
    const envVars = [
      "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID",
      "STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID",
      "STRIPE_SSELFIE_STUDIO_FOUNDING_ANNUAL_PRICE_ID",
      "STRIPE_ONE_TIME_SESSION_PRICE_ID",
      "STRIPE_PAID_BLUEPRINT_PRICE_ID",
      "STRIPE_PRICE_BRAND_STRATEGY_PACK",
      "STRIPE_PRICE_SELFIE_GUIDE_BUNDLE",
      "STRIPE_PRICE_SELFIE_GUIDE",
      "STRIPE_PRICE_PROMPT_VAULT",
      "STRIPE_PRICE_PROMPT_VAULT_AFTER_FLASH",
      "STRIPE_PRICE_PRESETS_SINGLE",
      "STRIPE_PRICE_PRESETS_BUNDLE",
      "STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM",
    ]
    
    for (const envVar of envVars) {
      const value = process.env[envVar]
      results.environmentVariables[envVar] = {
        isSet: !!value,
        value: value || null,
      }
      
      if (value) {
        try {
          const price = await stripe.prices.retrieve(value)
          results.priceVerifications.push({
            envVar,
            priceId: value,
            exists: true,
            active: price.active,
            amount: price.unit_amount,
            amountFormatted: price.unit_amount 
              ? `$${(price.unit_amount / 100).toFixed(2)}` 
              : null,
            currency: price.currency,
            recurring: price.recurring ? {
              interval: price.recurring.interval,
              intervalCount: price.recurring.interval_count,
            } : null,
            product: typeof price.product === 'string'
              ? price.product
              : ("deleted" in price.product ? price.product.id : price.product.name) || price.product.id,
          })
        } catch (error: unknown) {
          results.priceVerifications.push({
            envVar,
            priceId: value,
            exists: false,
            error: getErrorMessage(error),
          })
        }
      }
    }
    
    // Expected configuration
    results.expectedConfiguration = {
      sselfie_studio_membership: {
        envVar: "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID",
        expectedAmount: 9700,
        expectedAmountFormatted: "$97.00",
        expectedRecurring: true,
      },
      sselfie_studio_membership_annual: {
        envVar: "STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID",
        expectedAmount: 97000,
        expectedAmountFormatted: "€970.00",
        expectedRecurring: true,
      },
      sselfie_studio_membership_founding_annual: {
        envVar: "STRIPE_SSELFIE_STUDIO_FOUNDING_ANNUAL_PRICE_ID",
        expectedAmount: 69700,
        expectedAmountFormatted: "€697.00",
        expectedRecurring: true,
      },
      one_time_session: {
        envVar: "STRIPE_ONE_TIME_SESSION_PRICE_ID",
        expectedAmount: 4900,
        expectedAmountFormatted: "$49.00",
        expectedRecurring: false,
      },
      paid_blueprint: {
        envVar: "STRIPE_PAID_BLUEPRINT_PRICE_ID",
        expectedAmount: 4700,
        expectedAmountFormatted: "$47.00",
        expectedRecurring: false,
      },
      brand_strategy_pack: {
        envVar: "STRIPE_PRICE_BRAND_STRATEGY_PACK",
        expectedAmount: 1900,
        expectedAmountFormatted: "$19.00",
        expectedRecurring: false,
      },
      selfie_guide_bundle: {
        envVar: "STRIPE_PRICE_SELFIE_GUIDE_BUNDLE",
        expectedAmount: 2700,
        expectedAmountFormatted: "$27.00",
        expectedRecurring: false,
      },
      selfie_guide: {
        envVar: "STRIPE_PRICE_SELFIE_GUIDE",
        expectedAmount: 1700,
        expectedAmountFormatted: "$17.00",
        expectedRecurring: false,
      },
      prompt_vault: {
        envVar: "STRIPE_PRICE_PROMPT_VAULT",
        expectedAmount: 2700,
        expectedAmountFormatted: "$27.00",
        expectedRecurring: false,
      },
      prompt_vault_after_flash: {
        envVar: "STRIPE_PRICE_PROMPT_VAULT_AFTER_FLASH",
        expectedAmount: 3700,
        expectedAmountFormatted: "$37.00",
        expectedRecurring: false,
      },
      presets_single: {
        envVar: "STRIPE_PRICE_PRESETS_SINGLE",
        expectedAmount: 1900,
        expectedAmountFormatted: "$19.00",
        expectedRecurring: false,
      },
      presets_bundle: {
        envVar: "STRIPE_PRICE_PRESETS_BUNDLE",
        expectedAmount: 3900,
        expectedAmountFormatted: "$39.00",
        expectedRecurring: false,
      },
      selfie_to_brand_shoot_system: {
        envVar: "STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM",
        expectedAmount: 19700,
        expectedAmountFormatted: "$197.00",
        expectedRecurring: false,
      },
    }
    
    // Validate actual vs expected
    const validationIssues: string[] = []
    
    for (const verification of results.priceVerifications) {
      const expected = Object.values(results.expectedConfiguration).find((e) => e.envVar === verification.envVar)
      
      if (!expected) continue
      
      if (!verification.exists) {
        validationIssues.push(`${verification.envVar}: Price does not exist in Stripe`)
      } else if (!verification.active) {
        validationIssues.push(`${verification.envVar}: Price is INACTIVE`)
      } else if (verification.amount !== expected.expectedAmount) {
        validationIssues.push(
          `${verification.envVar}: Amount mismatch (expected ${expected.expectedAmountFormatted}, got ${verification.amountFormatted})`
        )
      } else if (expected.expectedRecurring && !verification.recurring) {
        validationIssues.push(`${verification.envVar}: Expected subscription but price is one-time`)
      } else if (!expected.expectedRecurring && verification.recurring) {
        validationIssues.push(`${verification.envVar}: Expected one-time but price is subscription`)
      }
    }
    
    results.validationIssues = validationIssues
    results.isValid = validationIssues.length === 0
    
    return NextResponse.json(results, {
      status: results.isValid ? 200 : 500,
    })
  } catch (error: unknown) {
    return NextResponse.json({
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    }, {
      status: 500,
    })
  }
}
