import type { Metadata } from "next"
import { VaultMayaPageContent } from "@/components/sselfie/public-marketing"
import { VAULT_COLLECTION_META } from "@/lib/ai-prompts/prompt-data"
import { getPublishedVaultCollectionMeta } from "@/lib/vault/published-collections"
import { getVaultMayaPriceDisplay } from "@/lib/launch/cash-launch-pricing"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Vault Maya — create AI photos without copying prompts",
  description:
    "Add one clear selfie, choose the photo you want, and let Maya create it for you inside SSELFIE. No ChatGPT or prompts to copy.",
  openGraph: {
    title: "Vault Maya — create AI photos without copying prompts",
    description:
      "Add one clear selfie, choose the photo you want, and let Maya create it for you inside SSELFIE.",
    url: "https://www.sselfie.ai/vault-maya",
    images: [
      "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1785423447575-876892.png",
    ],
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
