import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

export async function GET() {
  console.log('[Sentry Direct Test] Route called')
  
  // Simple direct test - throw an error that should be captured
  const testError = new Error("Direct Sentry test error - this should appear in dashboard")
  testError.name = "SentryDirectTest"
  
  console.log('[Sentry Direct Test] Capturing exception...')
  const eventId = Sentry.captureException(testError)
  console.log('[Sentry Direct Test] Exception captured, event ID:', eventId)
  
  console.log('[Sentry Direct Test] Flushing...')
  if (typeof Sentry.flush === "function") {
    await Sentry.flush(2000)
    console.log('[Sentry Direct Test] Flushed')
  } else {
    console.log('[Sentry Direct Test] Flush not available')
  }
  
  return NextResponse.json({ 
    success: true, 
    message: "Error sent to Sentry - check your dashboard",
    error: testError.message,
    eventId
  })
}

