"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DiagnosticsPage() {
  const [emailResult, setEmailResult] = useState<any>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [purchaseEmailResult, setPurchaseEmailResult] = useState<any>(null)
  const [purchaseEmailLoading, setPurchaseEmailLoading] = useState(false)
  const [testEmail, setTestEmail] = useState("")
  const [configResult, setConfigResult] = useState<any>(null)
  const [configLoading, setConfigLoading] = useState(false)

  const testBasicEmail = async () => {
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

  const testPurchaseEmail = async () => {
    if (!testEmail) {
      setPurchaseEmailResult({ success: false, error: "Please enter an email address" })
      return
    }

    setPurchaseEmailLoading(true)
    try {
      const response = await fetch("/api/test-purchase-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: testEmail }),
      })
      const data = await response.json()
      setPurchaseEmailResult(data)
    } catch (error: any) {
      setPurchaseEmailResult({ success: false, error: error.message })
    } finally {
      setPurchaseEmailLoading(false)
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
        {/* Basic Email Test */}
        <Card>
          <CardHeader>
            <CardTitle>1. Test Basic Email Sending</CardTitle>
            <CardDescription>Verify that Resend is configured correctly and can send emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testBasicEmail} disabled={emailLoading}>
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

        <Card>
          <CardHeader>
            <CardTitle>2. Test Purchase Email Flow</CardTitle>
            <CardDescription>
              Test the exact email that gets sent after a purchase (welcome email with password setup)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Your Email Address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="your@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>

            <Button onClick={testPurchaseEmail} disabled={purchaseEmailLoading || !testEmail}>
              {purchaseEmailLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Purchase Email Test
            </Button>

            {purchaseEmailResult && (
              <Alert variant={purchaseEmailResult.success ? "default" : "destructive"}>
                {purchaseEmailResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                <AlertDescription>
                  {purchaseEmailResult.success ? (
                    <div>
                      <p className="font-semibold">✅ Purchase email sent successfully!</p>
                      <p className="text-sm mt-1">Message ID: {purchaseEmailResult.messageId}</p>
                      <p className="text-sm mt-2 text-muted-foreground">
                        Check your inbox (and spam folder) for the welcome email with password setup link.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold">❌ Email failed</p>
                      <p className="text-sm mt-1">{purchaseEmailResult.error}</p>
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
            <CardTitle>3. Check Configuration</CardTitle>
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
            <CardTitle>4. Check Stripe Webhook Logs</CardTitle>
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
              <li>
                <strong>After making a test purchase:</strong> Wait 10-20 seconds, then refresh the webhook logs page to
                see if Stripe sent the webhook
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
