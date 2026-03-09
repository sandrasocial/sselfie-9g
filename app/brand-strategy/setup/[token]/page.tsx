import { sql } from "@/lib/db/client"
import BrandStrategySetupForm from "@/components/brand-strategy/brand-strategy-setup-form"
import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function BrandStrategySetupPage({ params }: PageProps) {
  const { token } = await params

  if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
    redirect("/brand-strategy")
  }

  // Look up the subscription by setup_token
  const rows = await sql`
    SELECT s.id, s.user_id, u.email, u.display_name
    FROM subscriptions s
    LEFT JOIN users u ON u.id::text = s.user_id
    WHERE s.setup_token = ${token}::uuid
      AND s.product_type = 'brand_strategy_pack'
      AND s.status = 'active'
    LIMIT 1
  `.catch(() => [] as any[])

  if (!rows || rows.length === 0) {
    // Token not found or expired — send to landing with error
    redirect("/brand-strategy?setup=invalid")
  }

  const row = rows[0]
  const email: string = row.email || ""
  const displayName: string = row.display_name || ""

  return (
    <BrandStrategySetupForm
      setupToken={token}
      email={email}
      displayName={displayName}
    />
  )
}
