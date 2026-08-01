import { Suspense } from "react"
import type { Metadata } from "next"
import { PromptVaultAnalytics } from "@/components/prompt-vault/prompt-vault-analytics"
import {
  PromptVaultPageContent,
  type VaultCollectionCard,
} from "@/components/sselfie/public-marketing"
import {
  STATIC_VAULT_COLLECTION_SERIES,
  VAULT_COLLECTION_META,
} from "@/lib/ai-prompts/prompt-data"
import {
  getPublishedVaultCollections,
  getPublishedVaultCollectionMeta,
} from "@/lib/vault/published-collections"
import { getPromptVaultPriceDisplay } from "@/lib/launch/cash-launch-pricing"

const FEATURED_COLLECTION_TITLES = [
  "Golden Hour Diary",
  "Rooftop Evenings",
  "Slow Morning Diary",
  "Shadow Study Editorial",
  "Everyday Photodump Edit",
  "Real Work Moments",
] as const

function buildShowcaseCollections(
  publishedCollections: Awaited<ReturnType<typeof getPublishedVaultCollections>>,
): VaultCollectionCard[] {
  const publishedCards = publishedCollections
    .filter(collection => {
      const laterShots = collection.cards.slice(1, 4)
      return laterShots.length === 3 && laterShots.every(card => Boolean(card.exampleImage))
    })
    .map(collection => ({
      id: collection.slug,
      title: collection.title,
      shotCount: collection.cards.length,
      images: collection.cards.slice(1, 4).map(card => ({
        src: card.exampleImage!,
        alt: card.title,
      })),
    }))

  const preferred = FEATURED_COLLECTION_TITLES.flatMap(title => {
    const collection = publishedCards.find(card => card.title === title)
    return collection ? [collection] : []
  })
  const preferredIds = new Set(preferred.map(collection => collection.id))
  const publishedFallbacks = publishedCards.filter(collection => !preferredIds.has(collection.id))

  const staticFallbacks = STATIC_VAULT_COLLECTION_SERIES.flatMap(series => {
    const first = series[0]
    const laterShots = series.slice(1, 4)
    if (!first || laterShots.length < 3 || laterShots.some(card => !card.exampleImage)) return []
    const meta = VAULT_COLLECTION_META.find(collection => collection.previewCardId === first.id)
    return [{
      id: `static-${first.id}`,
      title: meta?.name || first.title,
      shotCount: series.length,
      images: laterShots.map(card => ({ src: card.exampleImage!, alt: card.title })),
    }]
  })

  const seenTitles = new Set<string>()
  return [...preferred, ...publishedFallbacks, ...staticFallbacks]
    .filter(collection => {
      if (seenTitles.has(collection.title)) return false
      seenTitles.add(collection.title)
      return true
    })
    .slice(0, 6)
}

export const metadata: Metadata = {
  title: "The AI Photo Prompt Vault",
  description:
    "Create complete AI photoshoots from one clear selfie with ready-to-use prompts for ChatGPT. One payment, with new drops included.",
  openGraph: {
    title: "The AI Photo Prompt Vault",
    description:
      "Create complete AI photoshoots from one clear selfie with ready-to-use prompts for ChatGPT. One payment, with new drops included.",
    url: "https://www.sselfie.ai/prompt-vault",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "https://www.sselfie.ai/prompt-vault",
  },
}

export default async function PromptVaultPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const checkoutFailed = params.checkout === "failed"
  const [publishedCollections, publishedMeta] = await Promise.all([
    getPublishedVaultCollections(),
    getPublishedVaultCollectionMeta(),
  ])
  const vaultMeta = [...publishedMeta, ...VAULT_COLLECTION_META]
  const vaultCollectionCount = vaultMeta.length
  const vaultShotCount = vaultMeta.reduce((total, collection) => total + collection.shotCount, 0)
  const promptVaultPrice = getPromptVaultPriceDisplay()
  const collections = buildShowcaseCollections(publishedCollections)

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
