"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import * as Sentry from "@sentry/nextjs"

export default function SentryExamplePage() {
  const [errorTriggered, setErrorTriggered] = useState(false)
  const [sentryStatus, setSentryStatus] = useState<any>(null)

  // Check Sentry status on mount
  useEffect(() => {
    // Check if Sentry is available (simpler check without getCurrentHub)
    const dsn = typeof window !== "undefined" 
      ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_SENTRY_DSN || "Check env vars"
      : "Server-side"
    setSentryStatus({
      initialized: typeof Sentry.captureException === "function",
      dsn: typeof Sentry.captureException === "function" ? "Configured" : "Not configured",
      available: typeof Sentry.captureException === "function",
    })
  }, [])

  const triggerClientError = () => {
    setErrorTriggered(true)
    // Use setTimeout to ensure error happens outside of React's error boundary
    setTimeout(() => {
      try {
        // @ts-expect-error - Intentionally calling undefined function for testing
        myUndefinedFunction()
      } catch (error) {
        // Manually capture the error
        Sentry.captureException(error)
        console.error("Error captured by Sentry:", error)
      }
    }, 0)
  }

  const triggerServerError = async () => {
    setErrorTriggered(true)
    try {
      const response = await fetch("/api/sentry-test", {
        method: "POST",
      })
      if (!response.ok) {
        const error = new Error("Server error response")
        Sentry.captureException(error)
        throw error
      }
    } catch (error) {
      console.error("Server error:", error)
      Sentry.captureException(error)
    }
  }

  const triggerCapturedError = async () => {
    setErrorTriggered(true)
    console.log("[Sentry Test] Client: Starting error capture...")
    console.log("[Sentry Test] Client: Sentry available?", typeof Sentry.captureException)
    
    try {
      const error = new Error("This is a test error captured by Sentry from the client")
      error.name = "SentryClientTest"
      console.log("[Sentry Test] Client: Calling captureException...")
      Sentry.captureException(error)
      console.log("[Sentry Test] Client: Exception captured, flushing...")
      
      // Flush to ensure it's sent
      if (typeof Sentry.flush === "function") {
        await Sentry.flush(2000)
        console.log("[Sentry Test] Client: Flushed")
      } else {
        console.log("[Sentry Test] Client: Flush not available")
      }
      
      alert("Error captured! Check browser console and Sentry dashboard.")
    } catch (err) {
      console.error("[Sentry Test] Client: Error capturing exception:", err)
      alert(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  
  const triggerDirectTest = async () => {
    setErrorTriggered(true)
    try {
      const response = await fetch("/api/sentry-direct-test")
      const data = await response.json()
      alert(`Direct test response: ${data.message}`)
    } catch (error) {
      console.error("Direct test error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Sentry Error Tracking Test</CardTitle>
            <CardDescription>
              Click the buttons below to trigger different types of errors. Check your Sentry
              dashboard to see if the errors are captured.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button onClick={triggerClientError} className="w-full" variant="destructive">
                Trigger Client-Side Error (Undefined Function)
              </Button>
              <p className="text-sm text-stone-600">
                This will call an undefined function, which should be automatically captured by
                Sentry.
              </p>
            </div>

            <div className="space-y-2">
              <Button onClick={triggerServerError} className="w-full" variant="destructive">
                Trigger Server-Side Error
              </Button>
              <p className="text-sm text-stone-600">
                This will trigger an error on the server via an API route.
              </p>
            </div>

            <div className="space-y-2">
              <Button onClick={triggerCapturedError} className="w-full" variant="outline">
                Trigger Captured Exception (Client)
              </Button>
              <p className="text-sm text-stone-600">
                This will manually capture an error using Sentry.captureException() on the client.
              </p>
            </div>

            <div className="space-y-2">
              <Button onClick={triggerDirectTest} className="w-full" variant="outline">
                Trigger Direct Server Test
              </Button>
              <p className="text-sm text-stone-600">
                This will trigger a simple server-side error that's explicitly captured.
              </p>
            </div>

            {sentryStatus && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-sm font-semibold mb-2">Sentry Status:</p>
                <ul className="text-sm space-y-1">
                  <li>Initialized: {sentryStatus.initialized ? "✅ Yes" : "❌ No"}</li>
                  <li>DSN: {sentryStatus.dsn}</li>
                  <li>Functions Available: {sentryStatus.available ? "✅ Yes" : "❌ No"}</li>
                </ul>
              </div>
            )}

            {errorTriggered && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  ✅ Error triggered! Check your Sentry dashboard at{" "}
                  <a
                    href="https://sentry.io/organizations/sselfie/projects/javascript-nextjs/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    sentry.io
                  </a>{" "}
                  to see if it was captured.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

