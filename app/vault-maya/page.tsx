import type { Metadata } from "next"
import { VaultMayaPageContent } from "@/components/sselfie/public-marketing"
import { getVaultMayaPriceDisplay } from "@/lib/launch/cash-launch-pricing"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Vault Maya — one selfie, the photo you choose",
  description:
    "Upload one clear selfie, choose the photo you want to create, and let Maya do the prompting for you.",
  openGraph: {
    title: "One selfie. Choose a look. Maya makes the photo.",
    description:
      "Upload one clear selfie, choose the photo you want to create, and let Maya do the prompting for you.",
    url: "https://www.sselfie.ai/vault-maya",
    images: ["https://www.sselfie.ai/images/vault-maya/proof/img-7880-bw-editorial.webp"],
  },
  alternates: {
    canonical: "https://www.sselfie.ai/vault-maya",
  },
}

export default function VaultMayaOfferPage() {
  const price = getVaultMayaPriceDisplay()

  return <VaultMayaPageContent priceLabel={price.monthlyLabel} />
}
