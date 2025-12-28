// Simple script to test if Sentry can connect and send events
import * as Sentry from "@sentry/nextjs"
import "../sentry.server.config"

async function testSentry() {
  console.log("Testing Sentry connection...")
  console.log("DSN:", process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "Not set")
  
  const testError = new Error("Sentry connection test - should appear in dashboard")
  testError.name = "SentryConnectionTest"
  
  try {
    Sentry.captureException(testError)
    console.log("Error captured, flushing...")
    await Sentry.flush(2000)
    console.log("✅ Sentry test error sent! Check your dashboard.")
  } catch (error) {
    console.error("❌ Error sending to Sentry:", error)
  }
}

testSentry().then(() => process.exit(0)).catch((err) => {
  console.error(err)
  process.exit(1)
})

