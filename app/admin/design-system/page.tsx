import type { Metadata } from "next"

import { SselfieNoirGlassProof } from "@/components/brand/bold-editorial-proof"
import { renderSselfieNoirGlassProofEmail } from "@/lib/email/templates/bold-editorial-proof"
import { getVaultMayaPriceDisplay } from "@/lib/launch/cash-launch-pricing"

export const metadata: Metadata = {
  title: "SSELFIE Noir Glass · Design reference",
  robots: {
    index: false,
    follow: false,
  },
}

export default function SselfieNoirGlassDesignSystemPage() {
  const vaultMayaPrice = getVaultMayaPriceDisplay()

  return (
    <SselfieNoirGlassProof
      emailHtml={renderSselfieNoirGlassProofEmail()}
      priceLabel={vaultMayaPrice.monthlyLabel}
    />
  )
}
