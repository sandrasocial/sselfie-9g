import { NextResponse } from "next/server"
import { getResendApiKey } from "@/lib/resend/api-key"

export async function GET() {
  const resendKey = getResendApiKey()
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY
        ? `✓ Set (${process.env.STRIPE_SECRET_KEY.substring(0, 7)}...)`
        : "✗ Not set",
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET
        ? `✓ Set (${process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10)}...${process.env.STRIPE_WEBHOOK_SECRET.slice(-4)})`
        : "✗ Not set",
      RESEND_API_KEY: resendKey
        ? `✓ Set (${resendKey.substring(0, 7)}...)`
        : "✗ Not set",
      DATABASE_URL: process.env.DATABASE_URL ? "✓ Set" : "✗ Not set",
      SUPABASE_URL: process.env.SUPABASE_URL ? "✓ Set" : "✗ Not set",
    },
    webhookEndpoint: "https://sselfie.ai/api/webhooks/stripe",
    instructions: {
      step1: "Verify STRIPE_WEBHOOK_SECRET matches your Stripe dashboard",
      step2: "Go to https://dashboard.stripe.com/test/webhooks",
      step3: "Click on your webhook endpoint",
      step4: "Check 'Recent deliveries' section for any attempts",
      step5: "If no attempts, verify events are selected (checkout.session.completed, etc.)",
    },
    testEndpoints: {
      testEmail: "https://sselfie.ai/api/diagnostics/test-email",
      testWebhook: "https://sselfie.ai/api/diagnostics/test-webhook",
    },
  }

  return NextResponse.json(diagnostics, { status: 200 })
}
