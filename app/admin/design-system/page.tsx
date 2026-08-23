import type { Metadata } from "next"

import { BoldEditorialProof } from "@/components/brand/bold-editorial-proof"
import { renderBoldEditorialProofEmail } from "@/lib/email/templates/bold-editorial-proof"

export const metadata: Metadata = {
  title: "Bold Editorial Studio · Design reference",
  robots: {
    index: false,
    follow: false,
  },
}

export default function BoldEditorialDesignSystemPage() {
  return <BoldEditorialProof emailHtml={renderBoldEditorialProofEmail()} />
}
