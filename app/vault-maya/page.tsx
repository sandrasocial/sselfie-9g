import type { Metadata } from "next"
import { VaultMayaPageContent } from "@/components/sselfie/public-marketing"
import { VAULT_COLLECTION_META } from "@/lib/ai-prompts/prompt-data"
import { getPublishedVaultCollectionMeta } from "@/lib/vault/published-collections"
import { getVaultMayaPriceDisplay } from "@/lib/launch/cash-launch-pricing"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Vault Maya — beautiful AI photos that still look like you",
  description:
    "The easiest way to create beautiful AI photos that still look like you. Add one selfie, choose a look from the SSELFIE Vault, and Maya creates the photo for you.",
  openGraph: {
    title: "Vault Maya — beautiful AI photos that still look like you",
    description:
      "The easiest way to create beautiful AI photos that still look like you. Add one selfie, choose a look from the SSELFIE Vault, and Maya creates the photo for you.",
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
    />
  )
}
