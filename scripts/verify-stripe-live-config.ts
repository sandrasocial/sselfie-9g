/**
 * LIVE STRIPE CONFIGURATION VERIFICATION
 * 
 * Programmatically verifies all Stripe Price IDs and configuration
 * using the Stripe API. Part of emergency billing audit.
 * 
 * Usage: npx tsx scripts/verify-stripe-live-config.ts
 */

import Stripe from "stripe"
import { PRICING_PRODUCTS, CREDIT_PACKAGES } from "@/lib/products"
import { config } from "dotenv"
import { resolve } from "path"

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), ".env.local") })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
})

interface PriceVerification {
  priceId: string
  exists: boolean
  active: boolean
  amount?: number
  amountFormatted?: string
  currency?: string
  recurring?: {
    interval: string
    interval_count: number
  } | null
  product?: {
    id: string
    name: string
  }
  created?: Date
  error?: string
}

interface EnvVarVerification {
  envVarName: string
  priceId: string | undefined
  isSet: boolean
  verification?: PriceVerification
  expectedAmount?: number
  matches?: boolean
}

const PRICE_IDS_TO_VERIFY = [
  // Current production prices (expected)
  "price_1SmIRaEVJvME7vkwMo5vSLzf", // Creator Studio (hardcoded fallback)
  "price_1SRH7mEVJvME7vkw5vMjZC4s", // Starter Photoshoot
  "price_1SnlJEEVJvME7vkw1thdr7WK", // Paid Blueprint
  
  // Legacy prices (should be inactive)
  "price_1SRH36EVJvME7vkwQO096AFb", // OLD Creator Studio
  "price_1SRHH3EVJvME7vkwwx9tLXeB", // LEGACY Credits 50
  "price_1SRHHhEVJvME7vkw4WqYbna5", // LEGACY Credits 100
  "price_1SRHIJEVJvME7vkwPLhGIcDw", // LEGACY Credits 250
]

async function verifyPrice(priceId: string): Promise<PriceVerification> {
  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    })
    
    const product = typeof price.product === "string" 
      ? { id: price.product, name: "Unknown" }
      : { id: price.product.id, name: price.product.name || "Unknown" }
    
    return {
      priceId,
      exists: true,
      active: price.active,
      amount: price.unit_amount || undefined,
      amountFormatted: price.unit_amount 
        ? `$${(price.unit_amount / 100).toFixed(2)}` 
        : undefined,
      currency: price.currency,
      recurring: price.recurring ? {
        interval: price.recurring.interval,
        interval_count: price.recurring.interval_count,
      } : null,
      product,
      created: new Date(price.created * 1000),
    }
  } catch (error: any) {
    return {
      priceId,
      exists: false,
      active: false,
      error: error.message,
    }
  }
}

async function verifyEnvVars(): Promise<EnvVarVerification[]> {
  const envVars: EnvVarVerification[] = [
    {
      envVarName: "STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID",
      priceId: process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID,
      isSet: !!process.env.STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID,
      expectedAmount: 9700, // $97/month
    },
    {
      envVarName: "STRIPE_ONE_TIME_SESSION_PRICE_ID",
      priceId: process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID,
      isSet: !!process.env.STRIPE_ONE_TIME_SESSION_PRICE_ID,
      expectedAmount: 4900, // $49
    },
    {
      envVarName: "STRIPE_PAID_BLUEPRINT_PRICE_ID",
      priceId: process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID,
      isSet: !!process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID,
      expectedAmount: 4700, // $47
    },
  ]
  
  for (const envVar of envVars) {
    if (envVar.isSet && envVar.priceId) {
      envVar.verification = await verifyPrice(envVar.priceId)
      envVar.matches = envVar.verification.amount === envVar.expectedAmount
    }
  }
  
  return envVars
}

async function findAllActivePricesForProduct(productId: string): Promise<Stripe.Price[]> {
  try {
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      limit: 100,
    })
    return prices.data
  } catch (error) {
    console.error(`Error fetching prices for product ${productId}:`, error)
    return []
  }
}

async function main() {
  console.log("=" .repeat(80))
  console.log("🔍 LIVE STRIPE CONFIGURATION VERIFICATION")
  console.log("=" .repeat(80))
  console.log()
  
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("❌ CRITICAL: STRIPE_SECRET_KEY not set in environment")
    process.exit(1)
  }
  
  console.log("✅ Stripe API key found")
  console.log()
  
  // Phase A1: Verify all referenced Price IDs
  console.log("=" .repeat(80))
  console.log("PHASE A1: VERIFY ALL REFERENCED PRICE IDs")
  console.log("=" .repeat(80))
  console.log()
  
  const priceVerifications: PriceVerification[] = []
  
  for (const priceId of PRICE_IDS_TO_VERIFY) {
    console.log(`Verifying ${priceId}...`)
    const verification = await verifyPrice(priceId)
    priceVerifications.push(verification)
    
    if (verification.exists) {
      console.log(`  ✅ Exists: ${verification.active ? "ACTIVE" : "⚠️ INACTIVE"}`)
      console.log(`  💰 Amount: ${verification.amountFormatted} ${verification.currency?.toUpperCase()}`)
      if (verification.recurring) {
        console.log(`  🔄 Recurring: Every ${verification.recurring.interval_count} ${verification.recurring.interval}(s)`)
      } else {
        console.log(`  🔄 Recurring: One-time payment`)
      }
      console.log(`  📦 Product: ${verification.product?.name} (${verification.product?.id})`)
      console.log(`  📅 Created: ${verification.created?.toISOString().split('T')[0]}`)
    } else {
      console.log(`  ❌ Does not exist: ${verification.error}`)
    }
    console.log()
  }
  
  // Phase A2: Verify environment variables
  console.log("=" .repeat(80))
  console.log("PHASE A2: VERIFY ENVIRONMENT VARIABLE CONFIGURATION")
  console.log("=" .repeat(80))
  console.log()
  
  const envVarVerifications = await verifyEnvVars()
  
  for (const envVar of envVarVerifications) {
    console.log(`${envVar.envVarName}:`)
    
    if (!envVar.isSet) {
      console.log(`  🔴 NOT SET - will use hardcoded fallback or fail`)
    } else {
      console.log(`  ✅ Set to: ${envVar.priceId}`)
      
      if (envVar.verification) {
        if (envVar.verification.exists) {
          console.log(`  📍 Stripe Status: ${envVar.verification.active ? "ACTIVE" : "⚠️ INACTIVE"}`)
          console.log(`  💰 Actual Amount: ${envVar.verification.amountFormatted}`)
          console.log(`  💰 Expected Amount: $${(envVar.expectedAmount! / 100).toFixed(2)}`)
          
          if (envVar.matches) {
            console.log(`  ✅ AMOUNT MATCHES EXPECTED`)
          } else {
            console.log(`  🔴 AMOUNT MISMATCH - CRITICAL ERROR`)
          }
        } else {
          console.log(`  🔴 Price ID does not exist in Stripe: ${envVar.verification.error}`)
        }
      }
    }
    console.log()
  }
  
  // Phase A3: Find all active prices for each product
  console.log("=" .repeat(80))
  console.log("PHASE A3: IDENTIFY LEGACY ACTIVE PRICES")
  console.log("=" .repeat(80))
  console.log()
  
  const productsToCheck = new Set<string>()
  
  for (const verification of priceVerifications) {
    if (verification.exists && verification.product) {
      productsToCheck.add(verification.product.id)
    }
  }
  
  for (const productId of productsToCheck) {
    const activePrices = await findAllActivePricesForProduct(productId)
    
    if (activePrices.length > 0) {
      const productName = activePrices[0].product && typeof activePrices[0].product !== "string"
        ? activePrices[0].product.name
        : "Unknown"
      
      console.log(`Product: ${productName} (${productId})`)
      console.log(`  Active Prices: ${activePrices.length}`)
      
      if (activePrices.length > 1) {
        console.log(`  ⚠️ WARNING: Multiple active prices detected!`)
      }
      
      for (const price of activePrices) {
        const amount = price.unit_amount ? `$${(price.unit_amount / 100).toFixed(2)}` : "N/A"
        const recurring = price.recurring 
          ? `${price.recurring.interval_count} ${price.recurring.interval}` 
          : "one-time"
        
        // Check if this price is in our current env vars
        const isCurrentPrice = envVarVerifications.some(
          ev => ev.priceId === price.id
        )
        
        console.log(`    ${isCurrentPrice ? "✅ CURRENT" : "⚠️ LEGACY"}: ${price.id} - ${amount} (${recurring})`)
      }
      console.log()
    }
  }
  
  // Summary
  console.log("=" .repeat(80))
  console.log("SUMMARY")
  console.log("=" .repeat(80))
  console.log()
  
  const criticalIssues: string[] = []
  const warnings: string[] = []
  
  // Check for missing env vars
  const missingEnvVars = envVarVerifications.filter(ev => !ev.isSet)
  if (missingEnvVars.length > 0) {
    criticalIssues.push(`🔴 ${missingEnvVars.length} required environment variables not set`)
    missingEnvVars.forEach(ev => {
      criticalIssues.push(`   - ${ev.envVarName}`)
    })
  }
  
  // Check for amount mismatches
  const mismatches = envVarVerifications.filter(ev => ev.isSet && ev.matches === false)
  if (mismatches.length > 0) {
    criticalIssues.push(`🔴 ${mismatches.length} price amount mismatches detected`)
    mismatches.forEach(ev => {
      criticalIssues.push(`   - ${ev.envVarName}: Expected $${(ev.expectedAmount! / 100).toFixed(2)}, got ${ev.verification?.amountFormatted}`)
    })
  }
  
  // Check for inactive prices
  const inactive = envVarVerifications.filter(
    ev => ev.isSet && ev.verification && !ev.verification.active
  )
  if (inactive.length > 0) {
    criticalIssues.push(`🔴 ${inactive.length} environment variables point to INACTIVE prices`)
    inactive.forEach(ev => {
      criticalIssues.push(`   - ${ev.envVarName}: ${ev.priceId}`)
    })
  }
  
  // Check for legacy active prices
  const legacyActivePrices = priceVerifications.filter(
    pv => pv.exists && pv.active && pv.priceId.startsWith("price_1SRH")
  )
  if (legacyActivePrices.length > 0) {
    warnings.push(`⚠️ ${legacyActivePrices.length} legacy prices still active (should be archived)`)
    legacyActivePrices.forEach(pv => {
      warnings.push(`   - ${pv.priceId}: ${pv.amountFormatted} (${pv.product?.name})`)
    })
  }
  
  if (criticalIssues.length > 0) {
    console.log("🔴 CRITICAL ISSUES:")
    criticalIssues.forEach(issue => console.log(issue))
    console.log()
  }
  
  if (warnings.length > 0) {
    console.log("⚠️ WARNINGS:")
    warnings.forEach(warning => console.log(warning))
    console.log()
  }
  
  if (criticalIssues.length === 0 && warnings.length === 0) {
    console.log("✅ ALL CHECKS PASSED - Configuration is correct")
    console.log()
  }
  
  // Export results for report
  console.log("=" .repeat(80))
  console.log("RESULTS FOR REPORT (JSON)")
  console.log("=" .repeat(80))
  console.log()
  console.log(JSON.stringify({
    priceVerifications,
    envVarVerifications,
    criticalIssues,
    warnings,
    timestamp: new Date().toISOString(),
  }, null, 2))
  
  process.exit(criticalIssues.length > 0 ? 1 : 0)
}

main().catch(error => {
  console.error("Fatal error:", error)
  process.exit(1)
})
