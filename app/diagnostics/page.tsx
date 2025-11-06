"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export default function DiagnosticsPage() {
  const [emailResult, setEmailResult] = useState<any>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [configResult, setConfigResult] = useState<any>(null)
  const [configLoading, setConfigLoading] = useState(false)

  const testEmail = async () => {
    setEmailLoading(true)
    try {
      const response = await fetch("/api/diagnostics/test-email")
      const data = await response.json()
      setEmailResult(data)
    } catch (error: any) {
      setEmailResult({ success: false, error: error.message })
    } finally {
      setEmailLoading(false)
    }
  }

  const checkConfig = async () => {
    setConfigLoading(true)
    try {
      const response = await fetch("/api/diagnostics/webhook-config")
      const data = await response.json()
      setConfigResult(data)
    } catch (error: any) {
      setConfigResult({ success: false, error: error.message })
    } finally {
      setConfigLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">System Diagnostics</h1>

      <div className="space-y-6">
        {/* Email Test */}
        <Card>
          <CardHeader>
            <CardTitle>1. Test Email Sending</CardTitle>
            <CardDescription>Verify that Resend is configured correctly and can send emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testEmail} disabled={emailLoading}>
              {emailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Test Email
            </Button>

            {emailResult && (
              <Alert variant={emailResult.success ? "default" : "destructive"}>
                {emailResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertDescription>
                  {emailResult.success ? (
                    <div>
                      <p className="font-semibold">✅ Email sent successfully!</p>
                      <p className="text-sm mt-1">Recipient: {emailResult.recipient}</p>
                      <p className="text-sm">Message ID: {emailResult.messageId}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">❌ Email failed</p>
                      <p className="text-sm mt-1">{emailResult.error}</p>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Configuration Check */}
        <Card>
          <CardHeader>
            <CardTitle>2. Check Configuration</CardTitle>
            <CardDescription>Verify all environment variables are configured correctly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={checkConfig} disabled={configLoading}>
              {configLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Check Configuration
            </Button>

            {configResult && (
              <div className="space-y-2">
                <h3 className="font-semibold">Environment Variables:</h3>
                <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1">
                  {Object.entries(configResult.environment || {}).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-muted-foreground">{key}:</span> {value as string}
                    </div>
                  ))}
                </div>

                <h3 className="font-semibold mt-4">Webhook Endpoint:</h3>
                <p className="font-mono text-sm bg-muted p-2 rounded">{configResult.webhookEndpoint}</p>

                <h3 className="font-semibold mt-4">Next Steps:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {Object.values(configResult.instructions || {}).map((instruction, i) => (
                    <li key={i}>{instruction as string}</li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stripe Webhook Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>3. Check Stripe Webhook Logs</CardTitle>
            <CardDescription>Verify that Stripe is actually sending webhooks to your endpoint</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Go to{" "}
                <a
                  href="https://dashboard.stripe.com/test/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Stripe Webhooks Dashboard
                </a>
              </li>
              <li>
                Click on your webhook endpoint:{" "}
                <code className="bg-muted px-2 py-1 rounded">https://sselfie.ai/api/webhooks/stripe</code>
              </li>
              <li>
                Scroll to <strong>"Recent deliveries"</strong> section
              </li>
              <li>
                Check if there are any webhook attempts:
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>
                    <strong>No attempts:</strong> Events not configured or webhook disabled
                  </li>
                  <li>
                    <strong>Failed attempts (4xx/5xx):</strong> Endpoint unreachable or signature mismatch
                  </li>
                  <li>
                    <strong>Successful (200):</strong> Webhook working but email logic may have issues
                  </li>
                </ul>
              </li>
            </ol>

            <Alert>
              <AlertDescription>
                <strong>Important:</strong> Make sure you're checking the webhook logs in the same mode (test/live) that
                you're using for purchases.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
