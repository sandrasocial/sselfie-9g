"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, XCircle, AlertCircle, Copy, ExternalLink } from "lucide-react"

export default function WebhookDiagnosticsPage() {
  const [testResult, setTestResult] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const webhookUrl = "https://sselfie.ai/api/webhooks/stripe"
  const testUrl = "https://sselfie.ai/api/webhooks/stripe/test"

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const testWebhook = async () => {
    setTesting(true)
    try {
      const response = await fetch(testUrl)
      const data = await response.json()
      setTestResult(data)
    } catch (error: any) {
      setTestResult({ error: error.message })
    }
    setTesting(false)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Webhook Diagnostics</h1>
        <p className="text-muted-foreground">
          Troubleshoot why Stripe webhooks aren&apos;t triggering and emails aren&apos;t being sent
        </p>
      </div>

      {/* Critical Issue Alert */}
      <Alert className="mb-6 border-red-500 bg-red-50">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-900">
          <strong>Issue Detected:</strong> Stripe checkout sessions are being created successfully, but the webhook is
          NOT being called after payment. This means the webhook endpoint is not configured in Stripe dashboard.
        </AlertDescription>
      </Alert>

      {/* Step 1: Test Endpoint */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 1: Test Webhook Endpoint</CardTitle>
          <CardDescription>Verify your webhook endpoint is reachable and configured correctly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <code className="flex-1 text-sm">{webhookUrl}</code>
            <Button size="sm" variant="outline" onClick={() => copyToClipboard(webhookUrl)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={testWebhook} disabled={testing}>
            {testing ? "Testing..." : "Test Endpoint"}
          </Button>

          {testResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <pre className="text-xs overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Configure Stripe */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Step 2: Configure Stripe Webhook</CardTitle>
          <CardDescription>Follow these exact steps to set up the webhook in Stripe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                1
              </div>
              <div className="flex-1">
                <p className="font-medium">Open Stripe Dashboard</p>
                <p className="text-sm text-muted-foreground">
                  Go to{" "}
                  <a
                    href="https://dashboard.stripe.com/test/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Test Mode Webhooks
                    <ExternalLink className="h-3 w-3" />
                  </a>{" "}
                  or{" "}
                  <a
                    href="https://dashboard.stripe.com/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Live Mode Webhooks
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                2
              </div>
              <div className="flex-1">
                <p className="font-medium">Add Endpoint</p>
                <p className="text-sm text-muted-foreground">Click &quot;Add endpoint&quot; button</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                3
              </div>
              <div className="flex-1">
                <p className="font-medium">Enter Endpoint URL</p>
                <div className="mt-2 flex items-center gap-2 p-2 bg-muted rounded">
                  <code className="flex-1 text-sm">{webhookUrl}</code>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(webhookUrl)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                4
              </div>
              <div className="flex-1">
                <p className="font-medium">Select Events</p>
                <p className="text-sm text-muted-foreground mb-2">Click &quot;Select events&quot; and choose these:</p>
                <ul className="text-sm space-y-1 ml-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <code>checkout.session.completed</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <code>customer.subscription.created</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <code>customer.subscription.updated</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <code>customer.subscription.deleted</code>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <code>invoice.payment_succeeded</code>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                5
              </div>
              <div className="flex-1">
                <p className="font-medium">Add Endpoint</p>
                <p className="text-sm text-muted-foreground">Click &quot;Add endpoint&quot; to save</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                6
              </div>
              <div className="flex-1">
                <p className="font-medium">Copy Signing Secret</p>
                <p className="text-sm text-muted-foreground">
                  Click on the endpoint, then click &quot;Reveal&quot; next to &quot;Signing secret&quot;
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  The secret starts with <code className="bg-muted px-1 rounded">whsec_</code>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                7
              </div>
              <div className="flex-1">
                <p className="font-medium">Update Environment Variable</p>
                <p className="text-sm text-muted-foreground">Go to Vercel project settings → Environment Variables</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Update <code className="bg-muted px-1 rounded">STRIPE_WEBHOOK_SECRET</code> with the new secret
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                8
              </div>
              <div className="flex-1">
                <p className="font-medium">Redeploy</p>
                <p className="text-sm text-muted-foreground">
                  Redeploy your Vercel app to apply the new environment variable
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Verify */}
      <Card>
        <CardHeader>
          <CardTitle>Step 3: Test Purchase</CardTitle>
          <CardDescription>After configuring the webhook, test a purchase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm">Use Stripe test card:</p>
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <p className="text-sm font-mono">Card: 4242 4242 4242 4242</p>
              <p className="text-sm font-mono">Expiry: Any future date</p>
              <p className="text-sm font-mono">CVC: Any 3 digits</p>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              After completing a test purchase, check the debug logs. You should see{" "}
              <code className="bg-muted px-1 rounded">🔔 WEBHOOK RECEIVED</code> followed by email sending logs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Common Issues */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Common Issues</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium">Wrong Mode</p>
              <p className="text-sm text-muted-foreground">
                Make sure you&apos;re using test mode keys with test mode webhook, or live mode keys with live mode webhook
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium">Wrong URL</p>
              <p className="text-sm text-muted-foreground">
                The webhook URL must be exactly: <code className="bg-muted px-1 rounded">{webhookUrl}</code>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium">Secret Mismatch</p>
              <p className="text-sm text-muted-foreground">
                The webhook secret in Vercel must match the one shown in Stripe dashboard
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
