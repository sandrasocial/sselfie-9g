#!/usr/bin/env tsx
/**
 * Test Paid Blueprint Email Templates
 * Generates sample emails and prints HTML/text lengths and links
 */

import { generatePaidBlueprintDeliveryEmail } from "../lib/email/templates/paid-blueprint-delivery"
import { generatePaidBlueprintDay1Email } from "../lib/email/templates/paid-blueprint-day-1"
import { generatePaidBlueprintDay3Email } from "../lib/email/templates/paid-blueprint-day-3"
import { generatePaidBlueprintDay7Email } from "../lib/email/templates/paid-blueprint-day-7"

const testParams = {
  firstName: "Sarah",
  email: "sarah@example.com",
  accessToken: "test-token-12345",
  photoPreviewUrls: [
    "https://example.com/photo1.jpg",
    "https://example.com/photo2.jpg",
    "https://example.com/photo3.jpg",
    "https://example.com/photo4.jpg",
  ],
}

console.log("🧪 Testing Paid Blueprint Email Templates\n")
console.log("=" .repeat(60))

// Test Delivery Email
console.log("\n📧 1. DELIVERY EMAIL")
console.log("-".repeat(60))
const delivery = generatePaidBlueprintDeliveryEmail(testParams)
console.log(`HTML length: ${delivery.html.length} chars`)
console.log(`Text length: ${delivery.text.length} chars`)
const deliveryLinks = delivery.html.match(/href="([^"]+)"/g) || []
console.log(`Links found: ${deliveryLinks.length}`)
deliveryLinks.forEach((link, idx) => {
  const url = link.match(/href="([^"]+)"/)?.[1]
  console.log(`  Link ${idx + 1}: ${url?.substring(0, 80)}${url && url.length > 80 ? "..." : ""}`)
})

// Test Day 1 Email
console.log("\n📧 2. DAY 1 EMAIL")
console.log("-".repeat(60))
const day1 = generatePaidBlueprintDay1Email({
  firstName: testParams.firstName,
  email: testParams.email,
  accessToken: testParams.accessToken,
})
console.log(`HTML length: ${day1.html.length} chars`)
console.log(`Text length: ${day1.text.length} chars`)
const day1Links = day1.html.match(/href="([^"]+)"/g) || []
console.log(`Links found: ${day1Links.length}`)
day1Links.forEach((link, idx) => {
  const url = link.match(/href="([^"]+)"/)?.[1]
  console.log(`  Link ${idx + 1}: ${url?.substring(0, 80)}${url && url.length > 80 ? "..." : ""}`)
})

// Test Day 3 Email
console.log("\n📧 3. DAY 3 EMAIL")
console.log("-".repeat(60))
const day3 = generatePaidBlueprintDay3Email({
  firstName: testParams.firstName,
  email: testParams.email,
  accessToken: testParams.accessToken,
})
console.log(`HTML length: ${day3.html.length} chars`)
console.log(`Text length: ${day3.text.length} chars`)
const day3Links = day3.html.match(/href="([^"]+)"/g) || []
console.log(`Links found: ${day3Links.length}`)
day3Links.forEach((link, idx) => {
  const url = link.match(/href="([^"]+)"/)?.[1]
  console.log(`  Link ${idx + 1}: ${url?.substring(0, 80)}${url && url.length > 80 ? "..." : ""}`)
})

// Test Day 7 Email
console.log("\n📧 4. DAY 7 EMAIL")
console.log("-".repeat(60))
const day7 = generatePaidBlueprintDay7Email({
  firstName: testParams.firstName,
  email: testParams.email,
  accessToken: testParams.accessToken,
})
console.log(`HTML length: ${day7.html.length} chars`)
console.log(`Text length: ${day7.text.length} chars`)
const day7Links = day7.html.match(/href="([^"]+)"/g) || []
console.log(`Links found: ${day7Links.length}`)
day7Links.forEach((link, idx) => {
  const url = link.match(/href="([^"]+)"/)?.[1]
  console.log(`  Link ${idx + 1}: ${url?.substring(0, 80)}${url && url.length > 80 ? "..." : ""}`)
})

console.log("\n" + "=".repeat(60))
console.log("✅ All email templates generated successfully!")
console.log("\nTo preview HTML, save output to files:")
console.log("  node -e \"const { generatePaidBlueprintDeliveryEmail } = require('./lib/email/templates/paid-blueprint-delivery'); console.log(generatePaidBlueprintDeliveryEmail({ email: 'test@example.com', accessToken: 'test' }).html)\" > delivery.html")
