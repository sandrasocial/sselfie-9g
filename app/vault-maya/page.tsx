import type { Metadata } from "next"
import { VaultMayaPageContent } from "@/components/sselfie/public-marketing"
import { VAULT_COLLECTION_META } from "@/lib/ai-prompts/prompt-data"
import { getPublishedVaultCollectionMeta } from "@/lib/vault/published-collections"
import { getVaultMayaPriceDisplay } from "@/lib/launch/cash-launch-pricing"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Vault Maya — your vault photos, made for you",
  description:
    "Upload your selfie once, tap any vault look, and Maya makes the photo — still you — in about 30 seconds. New drops every week.",
  openGraph: {
    title: "Vault Maya — your vault photos, made for you",
    description:
      "Upload your selfie once, tap any vault look, and Maya makes the photo — still you — in about 30 seconds. New drops every week.",
    url: "https://www.sselfie.ai/vault-maya",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://www.sselfie.ai/vault-maya",
  },
}

export default async function VaultMayaOfferPage() {
  const publishedMeta = await getPublishedVaultCollectionMeta().catch(() => [])
  const vaultMeta = [...publishedMeta, ...VAULT_COLLECTION_META]
  const collectionCount = vaultMeta.length
  const shotCount = vaultMeta.reduce((total, collection) => total + collection.shotCount, 0)
  const price = getVaultMayaPriceDisplay()

  return (
    <VaultMayaPageContent
      collectionCount={collectionCount}
      shotCount={shotCount}
      founderActive={!price.flipped}
      ctaLabel={price.ctaLabel}
    />
  )
}
