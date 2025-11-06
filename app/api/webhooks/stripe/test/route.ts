export async function GET() {
  return Response.json({
    status: "ok",
    message: "Webhook endpoint is reachable",
    timestamp: new Date().toISOString(),
    env: {
      hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
    },
  })
}
