import { hasResendApiKey } from "@/lib/resend/api-key"

export async function GET() {
  return Response.json({
    status: "ok",
    message: "Webhook endpoint is reachable",
    timestamp: new Date().toISOString(),
    env: {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasResendKey: hasResendApiKey(),
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    },
  })
}
