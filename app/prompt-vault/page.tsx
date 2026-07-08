import { Suspense } from "react"
import type { Metadata } from "next"
import { PromptVaultAnalytics } from "@/components/prompt-vault/prompt-vault-analytics"
import {
  PromptVaultPageContent,
  type VaultCollectionCard,
} from "@/components/sselfie/public-marketing"
import { FREEBIE_COLLECTION_PREVIEWS, VAULT_COLLECTION_META } from "@/lib/ai-prompts/prompt-data"
import {
  getPublishedFreebiePreviews,
  getPublishedVaultCollectionMeta,
} from "@/lib/vault/published-collections"
import { getPromptVaultPriceDisplay } from "@/lib/launch/cash-launch-pricing"

export const metadata: Metadata = {
  title: "The AI Photo Prompt Vault · SSELFIE",
  description:
    "Turn one clear selfie into unlimited AI photoshoots that still look like you. Copy-paste prompts, full shoots, one payment.",
  openGraph: {
    title: "The AI Photo Prompt Vault · SSELFIE",
    description:
      "Turn one clear selfie into unlimited AI photoshoots that still look like you. Copy-paste prompts, full shoots, one payment.",
    images: ["/academy/visibility-suite/sandra-hero.png"],
  },
}

export default async function PromptVaultPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const checkoutFailed = params.checkout === "failed"
  const [publishedPreviews, publishedMeta] = await Promise.all([
    getPublishedFreebiePreviews(),
    getPublishedVaultCollectionMeta(),
  ])
  const freebiePreviews = [...publishedPreviews, ...FREEBIE_COLLECTION_PREVIEWS]
  const vaultMeta = [...publishedMeta, ...VAULT_COLLECTION_META]
  const vaultCollectionCount = vaultMeta.length
  const vaultShotCount = vaultMeta.reduce((total, collection) => total + collection.shotCount, 0)
  const promptVaultPrice = getPromptVaultPriceDisplay()

  const collections: VaultCollectionCard[] = freebiePreviews.map(card => {
    const meta = vaultMeta.find(m => m.previewCardId === card.id)
    return {
      id: card.id,
      number: card.number,
      title: card.title,
      mood: card.mood,
      whenToUse: card.whenToUse,
      image: card.exampleImage,
      shotCount: meta?.shotCount,
    }
  })

  return (
    <>
      <Suspense fallback={null}>
        <PromptVaultAnalytics />
      </Suspense>
      <PromptVaultPageContent
        collections={collections}
        collectionCount={vaultCollectionCount}
        shotCount={vaultShotCount}
        priceLabel={promptVaultPrice.label}
        ctaLabel={promptVaultPrice.ctaLabel}
        checkoutFailed={checkoutFailed}
      />
    </>
  )
}
