import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

export async function POST() {
  try {
    // Intentionally trigger an error
    // @ts-expect-error - Intentionally calling undefined function for testing
    myUndefinedFunction()
    return NextResponse.json({ success: true })
  } catch (error) {
    // Explicitly capture the error
    Sentry.captureException(error)
    console.error("Server error in sentry-test (captured by Sentry):", error)
    
    // Also flush to ensure it's sent
    await Sentry.flush(2000)
    
    return NextResponse.json(
      { error: "Server error triggered", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

