#!/usr/bin/env tsx
/**
 * Pricing Configuration Verification Script
 * Verifies all pricing values are correct before testing
 */

import { PRICING_PRODUCTS, CREDIT_PACKAGES, getProductById, getCreditPackageById } from "../lib/products"
import { SUBSCRIPTION_CREDITS, CREDIT_COSTS } from "../lib/credits"
import { MONTHLY_MEMBERSHIP_CREDITS } from "../lib/credit-policy"
import { getStudioProCreditCost } from "../lib/nano-banana-client"

console.log("=".repeat(80))
console.log("🔍 PRICING CONFIGURATION VERIFICATION")
console.log("=".repeat(80))
console.log()

let allTestsPassed = true

// Test 1: Verify Creator Studio Pricing
console.log("📦 TEST 1: Creator Studio Pricing")
const creatorStudio = getProductById("sselfie_studio_membership")
if (!creatorStudio) {
  console.error("❌ Creator Studio product not found!")
  allTestsPassed = false
} else {
  const priceCorrect = creatorStudio.priceInCents === 9700
  const creditsCorrect = creatorStudio.credits === MONTHLY_MEMBERSHIP_CREDITS
  
  console.log(`   Price: $${creatorStudio.priceInCents / 100} (Expected: $97) - ${priceCorrect ? "✅" : "❌"}`)
  console.log(`   Credits: ${creatorStudio.credits} (Expected: ${MONTHLY_MEMBERSHIP_CREDITS}) - ${creditsCorrect ? "✅" : "❌"}`)
  console.log(`   Type: ${creatorStudio.type} - ✅`)
  
  if (!priceCorrect || !creditsCorrect) {
    allTestsPassed = false
  }
}
console.log()

// Test 2: Verify One-Time Session Pricing
console.log("📦 TEST 2: One-Time Session Pricing")
const oneTimeSession = getProductById("one_time_session")
if (!oneTimeSession) {
  console.error("❌ One-Time Session product not found!")
  allTestsPassed = false
} else {
  const priceCorrect = oneTimeSession.priceInCents === 4900
  const creditsCorrect = oneTimeSession.credits === 50
  
  console.log(`   Price: $${oneTimeSession.priceInCents / 100} (Expected: $49) - ${priceCorrect ? "✅" : "❌"}`)
  console.log(`   Credits: ${oneTimeSession.credits} (Expected: 50) - ${creditsCorrect ? "✅" : "❌"}`)
  
  if (!priceCorrect || !creditsCorrect) {
    allTestsPassed = false
  }
}
console.log()

// Test 3: Verify Credit Top-Up Packages
console.log("📦 TEST 3: Credit Top-Up Packages")
const topup100 = getCreditPackageById("credits_topup_100")
const topup200 = getCreditPackageById("credits_topup_200")

if (!topup100) {
  console.error("❌ 100 credit top-up package not found!")
  allTestsPassed = false
} else {
  const priceCorrect = topup100.priceInCents === 4500
  const creditsCorrect = topup100.credits === 100
  
  console.log(`   100 Credits: $${topup100.priceInCents / 100} (Expected: $45) - ${priceCorrect ? "✅" : "❌"}`)
  console.log(`   Credits: ${topup100.credits} (Expected: 100) - ${creditsCorrect ? "✅" : "❌"}`)
  
  if (!priceCorrect || !creditsCorrect) {
    allTestsPassed = false
  }
}

if (!topup200) {
  console.error("❌ 200 credit top-up package not found!")
  allTestsPassed = false
} else {
  const priceCorrect = topup200.priceInCents === 8500
  const creditsCorrect = topup200.credits === 200
  
  console.log(`   200 Credits: $${topup200.priceInCents / 100} (Expected: $85) - ${priceCorrect ? "✅" : "❌"}`)
  console.log(`   Credits: ${topup200.credits} (Expected: 200) - ${creditsCorrect ? "✅" : "❌"}`)
  
  if (!priceCorrect || !creditsCorrect) {
    allTestsPassed = false
  }
}
console.log()

// Test 4: Verify Subscription Credits
console.log("📦 TEST 4: Subscription Credit Grants")
const subscriptionCredits = SUBSCRIPTION_CREDITS.sselfie_studio_membership
const expectedCredits = MONTHLY_MEMBERSHIP_CREDITS

console.log(`   Creator Studio: ${subscriptionCredits} credits/month (Expected: ${expectedCredits}) - ${subscriptionCredits === expectedCredits ? "✅" : "❌"}`)

if (subscriptionCredits !== expectedCredits) {
  allTestsPassed = false
}
console.log()

// Test 5: Verify Credit Costs
console.log("📦 TEST 5: Credit Costs")
const trainingCost = CREDIT_COSTS.TRAINING
const imageCost = CREDIT_COSTS.IMAGE
const animationCost = CREDIT_COSTS.ANIMATION
const proModeCost = getStudioProCreditCost('2K')

console.log(`   Training: ${trainingCost} credits (Expected: 20) - ${trainingCost === 20 ? "✅" : "❌"}`)
console.log(`   Classic Mode: ${imageCost} credit (Expected: 1) - ${imageCost === 1 ? "✅" : "❌"}`)
console.log(`   Pro Mode (2K): ${proModeCost} credits (Expected: 2) - ${proModeCost === 2 ? "✅" : "❌"}`)
console.log(`   Animation: ${animationCost} credits (Expected: 10) - ${animationCost === 10 ? "✅" : "❌"}`)

if (trainingCost !== 20 || imageCost !== 1 || proModeCost !== 2 || animationCost !== 10) {
  allTestsPassed = false
}
console.log()

// Test 6: Verify Backward Compatibility
console.log("📦 TEST 6: Backward Compatibility")
const hasExpectedCreditPackages = CREDIT_PACKAGES.length >= 2
console.log(`   CREDIT_PACKAGES available: ${hasExpectedCreditPackages ? "✅" : "❌"}`)
if (!hasExpectedCreditPackages) {
  allTestsPassed = false
}
console.log()

// Test 7: Verify All Products Exist
console.log("📦 TEST 7: Product Lookup Functions")
const testProducts = ["one_time_session", "sselfie_studio_membership"]
const testPackages = ["credits_topup_100", "credits_topup_200"]

let allProductsFound = true
for (const productId of testProducts) {
  const product = getProductById(productId)
  if (!product) {
    console.error(`   ❌ Product not found: ${productId}`)
    allProductsFound = false
  } else {
    console.log(`   ✅ Product found: ${productId} (${product.displayName})`)
  }
}

for (const packageId of testPackages) {
  const pkg = getCreditPackageById(packageId)
  if (!pkg) {
    console.error(`   ❌ Package not found: ${packageId}`)
    allProductsFound = false
  } else {
    console.log(`   ✅ Package found: ${packageId} (${pkg.displayName})`)
  }
}

if (!allProductsFound) {
  allTestsPassed = false
}
console.log()

// Test 8: Verify No Old Pricing References
console.log("📦 TEST 8: No Old Pricing References")
const oldPrice79 = PRICING_PRODUCTS.find(p => p.priceInCents === 7900)
const oldPrice149 = PRICING_PRODUCTS.find(p => p.priceInCents === 14900)
const oldCredits150 = PRICING_PRODUCTS.find(p => p.credits === 150)

if (oldPrice79) {
  console.error(`   ❌ Found old $79 pricing: ${oldPrice79.id}`)
  allTestsPassed = false
} else {
  console.log(`   ✅ No $79 pricing found`)
}

if (oldPrice149) {
  console.error(`   ❌ Found old $149 pricing: ${oldPrice149.id}`)
  allTestsPassed = false
} else {
  console.log(`   ✅ No $149 pricing found`)
}

if (oldCredits150) {
  console.error(`   ❌ Found old 150 credits: ${oldCredits150.id}`)
  allTestsPassed = false
} else {
  console.log(`   ✅ No 150 credits found in products`)
}

// Check subscription credits
if (SUBSCRIPTION_CREDITS.sselfie_studio_membership === 150) {
  console.error(`   ❌ Subscription credits still set to 150 (should be ${MONTHLY_MEMBERSHIP_CREDITS})`)
  allTestsPassed = false
} else {
  console.log(`   ✅ Subscription credits correctly set to ${MONTHLY_MEMBERSHIP_CREDITS}`)
}
console.log()

// Final Summary
console.log("=".repeat(80))
if (allTestsPassed) {
  console.log("✅ ALL TESTS PASSED - Configuration is correct!")
  console.log()
  console.log("📋 Next Steps:")
  console.log("   1. Verify Stripe Price IDs in environment variables")
  console.log("   2. Run manual tests using PRICING_SYSTEM_TEST_GUIDE.md")
  console.log("   3. Check Stripe Dashboard for webhook events")
  process.exit(0)
} else {
  console.error("❌ SOME TESTS FAILED - Please fix configuration issues above")
  process.exit(1)
}
