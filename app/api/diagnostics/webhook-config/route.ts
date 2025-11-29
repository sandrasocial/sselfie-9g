import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/security/require-admin"

export async function GET() {
  const guard = await requireAdmin()
  if (guard instanceof NextResponse) return guard

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "✓ Set" : "✗ Not set",
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? "✓ Set" : "✗ Not set",
      RESEND_API_KEY: process.env.RESEND_API_KEY ? "✓ Set" : "✗ Not set",
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
