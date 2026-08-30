import { notFound } from "next/navigation"

import { SselfieNoirGlassProof } from "@/components/brand/bold-editorial-proof"
import { renderSselfieNoirGlassProofEmail } from "@/lib/email/templates/bold-editorial-proof"
import { getVaultMayaPriceDisplay } from "@/lib/launch/cash-launch-pricing"

export const dynamic = "force-dynamic"

export default function ChannelProofPage() {
  if (process.env.NODE_ENV === "production") notFound()

  const vaultMayaPrice = getVaultMayaPriceDisplay()

  return (
    <SselfieNoirGlassProof
      emailHtml={renderSselfieNoirGlassProofEmail()}
      priceLabel={vaultMayaPrice.monthlyLabel}
    />
  )
}
