import type { Metadata } from "next"

import { BoldEditorialProof } from "@/components/brand/bold-editorial-proof"
import { renderBoldEditorialProofEmail } from "@/lib/email/templates/bold-editorial-proof"
import { getVaultMayaPriceDisplay } from "@/lib/launch/cash-launch-pricing"

export const metadata: Metadata = {
  title: "Bold Editorial Studio · Design reference",
  robots: {
    index: false,
    follow: false,
  },
}

export default function BoldEditorialDesignSystemPage() {
  const vaultMayaPrice = getVaultMayaPriceDisplay()

  return (
    <BoldEditorialProof
      emailHtml={renderBoldEditorialProofEmail()}
      priceLabel={vaultMayaPrice.monthlyLabel}
    />
  )
}
