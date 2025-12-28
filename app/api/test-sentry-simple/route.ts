import { NextResponse } from "next/server"

// Test if Sentry is even being imported
let sentryLoaded = false
let sentryError: any = null

try {
  const Sentry = require("@sentry/nextjs")
  sentryLoaded = typeof Sentry.captureException === "function"
  
  // Try to capture an error
  if (sentryLoaded) {
    const testError = new Error("Simple Sentry test - server side")
    testError.name = "SimpleSentryTest"
    Sentry.captureException(testError)
    await Sentry.flush(2000)
  }
} catch (error) {
  sentryError = error instanceof Error ? error.message : String(error)
}

export async function GET() {
  return NextResponse.json({
    sentryLoaded,
    sentryError,
    message: sentryLoaded 
      ? "Sentry loaded and error sent" 
      : "Sentry not loaded properly",
    envCheck: {
      SENTRY_DSN: process.env.SENTRY_DSN ? "Set" : "Not set",
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN ? "Set" : "Not set",
    }
  })
}

