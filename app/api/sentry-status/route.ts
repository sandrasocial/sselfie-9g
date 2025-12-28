import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

export async function GET() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  
  // Check if Sentry functions are available (simpler check)
  const sentryAvailable = typeof Sentry.captureException === "function"
  
  return NextResponse.json({
    sentryInitialized: sentryAvailable,
    dsnFromEnv: dsn ? "Set" : "Not set",
    sentryAvailable,
  })
}

