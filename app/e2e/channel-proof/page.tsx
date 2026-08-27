import { notFound } from "next/navigation"

import { BoldEditorialProof } from "@/components/brand/bold-editorial-proof"
import { renderBoldEditorialProofEmail } from "@/lib/email/templates/bold-editorial-proof"
import { getVaultMayaPriceDisplay } from "@/lib/launch/cash-launch-pricing"

export const dynamic = "force-dynamic"

export default function ChannelProofPage() {
  if (process.env.NODE_ENV === "production") notFound()

  const vaultMayaPrice = getVaultMayaPriceDisplay()

  return (
    <BoldEditorialProof
      emailHtml={renderBoldEditorialProofEmail()}
      priceLabel={vaultMayaPrice.monthlyLabel}
    />
  )
}
