/**
 * FIX B3: Server-Side Startup Validation for Stripe Pricing Configuration
 * 
 * This module validates that all required Stripe Price IDs are:
 * 1. Set in environment variables
 * 2. Exist in Stripe
 * 3. Are active
 * 4. Match expected amounts and types (subscription vs one-time)
 * 
 * Call assertStripePricingConfig() on server startup or before first Stripe operation.
 */

import { stripe } from "@/lib/stripe"
import { PRICING_PRODUCTS } from "@/lib/products"

interface PriceConfigValidation {
  envVarName: string
  priceId: string | undefined
  productType: string
  expectedAmount: number
  expectedRecurring: boolean
  isValid: boolean
  errors: string[]
}

interface ExpectedStripeConfig {
  envVarName: string
  productType: string
  expectedAmount: number
  expectedRecurring: boolean
}

let validationCache: {
  validated: boolean
  errors: string[]
  timestamp: Date
} | null = null

const VALIDATION_CACHE_TTL = 60 * 60 * 1000 // 1 hour

const EXPECTED_CONFIGS: ExpectedStripeConfig[] = [
  {
    envVarName: "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID",
    productType: "sselfie_studio_membership",
    expectedAmount: 9700, // $97/month
    expectedRecurring: true,
  },
  {
    envVarName: "STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID",
    productType: "brand_studio_membership",
    expectedAmount: 0, // validate presence + recurring only (amount may vary)
    expectedRecurring: true,
  },
  {
    envVarName: "STRIPE_ONE_TIME_SESSION_PRICE_ID",
    productType: "one_time_session",
    expectedAmount: 4900, // $49
    expectedRecurring: false,
  },
  {
    envVarName: "STRIPE_PAID_BLUEPRINT_PRICE_ID",
    productType: "paid_blueprint",
    expectedAmount: 4700, // $47
    expectedRecurring: false,
  },
  {
    envVarName: "STRIPE_PRICE_BRAND_STRATEGY_PACK",
    productType: "brand_strategy_pack",
    expectedAmount: 1900, // $19
    expectedRecurring: false,
  },
  {
    envVarName: "STRIPE_PRICE_SELFIE_GUIDE_BUNDLE",
    productType: "selfie_guide_bundle",
    expectedAmount: 2700, // $27
    expectedRecurring: false,
  },
  {
    envVarName: "STRIPE_PRICE_SELFIE_GUIDE",
    productType: "selfie_guide",
    expectedAmount: 1700, // $17
    expectedRecurring: false,
  },
  {
    envVarName: "STRIPE_PRICE_PROMPT_VAULT",
    productType: "prompt_vault",
    expectedAmount: 2700, // $27
    expectedRecurring: false,
  },
  {
    envVarName: "STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM",
    productType: "selfie_to_brand_shoot_system",
    expectedAmount: 19700, // $197
    expectedRecurring: false,
  },
]

export function getExpectedStripeConfigForProduct(productType: string): ExpectedStripeConfig | null {
  return EXPECTED_CONFIGS.find((cfg) => cfg.productType === productType) ?? null
}

export async function assertStripePriceConfigForProduct(productType: string): Promise<void> {
  const config = getExpectedStripeConfigForProduct(productType)
  if (!config) return

  const priceId = process.env[config.envVarName]?.trim()
  if (!priceId) {
    throw new Error(`Stripe Price ID not configured. Please contact support. (Missing: ${config.envVarName})`)
  }

  const priceObj = await stripe.prices.retrieve(priceId)

  if (!priceObj.active) {
    throw new Error(
      `The configured price for ${productType} is inactive in Stripe. ` +
      `Please contact support. (Price ID: ${priceId}, Env: ${config.envVarName})`,
    )
  }

  if (config.expectedAmount > 0 && priceObj.unit_amount !== config.expectedAmount) {
    const actual = priceObj.unit_amount || 0
    throw new Error(
      `Price mismatch for ${productType}: expected $${(config.expectedAmount / 100).toFixed(2)}, ` +
      `got $${(actual / 100).toFixed(2)}.`,
    )
  }

  const isRecurring = !!priceObj.recurring
  if (isRecurring !== config.expectedRecurring) {
    const expectedType = config.expectedRecurring ? "subscription" : "one-time"
    const actualType = isRecurring ? "subscription" : "one-time"
    throw new Error(`Price type mismatch for ${productType}: expected ${expectedType}, got ${actualType}.`)
  }
}

/**
 * Validates all Stripe pricing configuration
 * Throws error if any critical issues found
 */
export async function assertStripePricingConfig(): Promise<void> {
  // Check cache (avoid re-validating on every request)
  if (validationCache && validationCache.validated) {
    const age = Date.now() - validationCache.timestamp.getTime()
    if (age < VALIDATION_CACHE_TTL) {
      return // Cache hit, already validated
    }
  }
  
  console.log("[STRIPE_VALIDATION] 🔍 Validating Stripe pricing configuration...")
  
  const validations: PriceConfigValidation[] = []
  const criticalErrors: string[] = []
  
  // Define expected configuration
  for (const config of EXPECTED_CONFIGS) {
    const validation: PriceConfigValidation = {
      envVarName: config.envVarName,
      priceId: process.env[config.envVarName],
      productType: config.productType,
      expectedAmount: config.expectedAmount,
      expectedRecurring: config.expectedRecurring,
      isValid: true,
      errors: [],
    }
    
    // Check 1: Environment variable is set (Brand Studio is optional — skip if unset)
    if (!validation.priceId) {
      if (config.envVarName === "STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID") {
        validations.push(validation)
        continue
      }
      validation.isValid = false
      validation.errors.push(`Environment variable ${config.envVarName} is not set`)
      criticalErrors.push(`❌ ${config.envVarName} is not set`)
      validations.push(validation)
      continue
    }
    
    // Check 2: Price exists in Stripe
    try {
      const priceObj = await stripe.prices.retrieve(validation.priceId)
      
      // Check 3: Price is active
      if (!priceObj.active) {
        validation.isValid = false
        validation.errors.push(`Price ${validation.priceId} is INACTIVE in Stripe`)
        criticalErrors.push(
          `❌ ${config.envVarName} points to INACTIVE price ${validation.priceId}`
        )
      }
      
      // Check 4: Amount matches expected (skip when expectedAmount is 0, e.g. Brand Studio)
      if (config.expectedAmount > 0 && priceObj.unit_amount !== config.expectedAmount) {
        validation.isValid = false
        const actual = priceObj.unit_amount || 0
        const expected = config.expectedAmount
        validation.errors.push(
          `Price amount mismatch: expected $${(expected / 100).toFixed(2)}, ` +
          `got $${(actual / 100).toFixed(2)}`
        )
        criticalErrors.push(
          `❌ ${config.envVarName} amount mismatch: ` +
          `expected $${(expected / 100).toFixed(2)}, got $${(actual / 100).toFixed(2)}`
        )
      }
      
      // Check 5: Recurring vs one-time matches expected
      const isRecurring = !!priceObj.recurring
      if (isRecurring !== config.expectedRecurring) {
        validation.isValid = false
        const expectedType = config.expectedRecurring ? "subscription" : "one-time"
        const actualType = isRecurring ? "subscription" : "one-time"
        validation.errors.push(
          `Price type mismatch: expected ${expectedType}, got ${actualType}`
        )
        criticalErrors.push(
          `❌ ${config.envVarName} type mismatch: expected ${expectedType}, got ${actualType}`
        )
      }
      
      if (validation.isValid) {
        console.log(
          `[STRIPE_VALIDATION] ✅ ${config.envVarName}: ${validation.priceId} ` +
          `($${(priceObj.unit_amount || 0) / 100})`
        )
      }
    } catch (error: any) {
      validation.isValid = false
      
      if (error.code === "resource_missing") {
        validation.errors.push(`Price ${validation.priceId} not found in Stripe`)
        criticalErrors.push(
          `❌ ${config.envVarName} points to non-existent price ${validation.priceId}`
        )
      } else {
        validation.errors.push(`Error verifying price: ${error.message}`)
        criticalErrors.push(
          `❌ ${config.envVarName} validation error: ${error.message}`
        )
      }
    }
    
    validations.push(validation)
  }
  
  // If any critical errors, throw and prevent server from starting
  if (criticalErrors.length > 0) {
    const errorMessage = [
      "",
      "=" .repeat(80),
      "🔴 CRITICAL: STRIPE PRICING CONFIGURATION ERRORS",
      "=" .repeat(80),
      "",
      ...criticalErrors,
      "",
      "The server cannot start with invalid Stripe pricing configuration.",
      "Please fix the above errors in your environment variables.",
      "",
      "Expected configuration:",
      "  STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID = Active price for $97/month subscription",
      "  STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID = Active price for Brand Studio subscription",
      "  STRIPE_ONE_TIME_SESSION_PRICE_ID = Active price for $49 one-time payment",
      "  STRIPE_PAID_BLUEPRINT_PRICE_ID = Active price for $47 one-time payment",
      "  STRIPE_PRICE_BRAND_STRATEGY_PACK = Active price for $19 one-time payment",
      "  STRIPE_PRICE_SELFIE_GUIDE_BUNDLE = Active price for $27 one-time payment",
      "  STRIPE_PRICE_SELFIE_GUIDE = Active price for $17 one-time payment",
      "  STRIPE_PRICE_PROMPT_VAULT = Active price for $27 one-time payment",
      "  STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM = Active price for $197 one-time payment",
      "",
      "=" .repeat(80),
      "",
    ].join("\n")
    
    console.error(errorMessage)
    
    // Cache the failure
    validationCache = {
      validated: false,
      errors: criticalErrors,
      timestamp: new Date(),
    }
    
    throw new Error("Stripe pricing configuration validation failed. See logs for details.")
  }
  
  // All validations passed
  console.log("[STRIPE_VALIDATION] ✅ All Stripe pricing configuration checks passed")
  
  validationCache = {
    validated: true,
    errors: [],
    timestamp: new Date(),
  }
}

/**
 * Get current validation status (for diagnostics)
 */
export function getValidationStatus() {
  return validationCache
}

/**
 * Clear validation cache (for testing or manual re-validation)
 */
export function clearValidationCache() {
  validationCache = null
}
