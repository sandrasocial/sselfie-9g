import { NextResponse } from "next/server"
import { AESTHETICS } from "@/components/app-v3/aesthetics"
import { getPublishedVaultCollections, toAestheticId, toDisplayName } from "@/lib/vault/published-collections"
import type { Aesthetic } from "@/components/app-v3/types"

export const dynamic = "force-dynamic"

export async function GET() {
  const published = await getPublishedVaultCollections()
  const dynamicAesthetics: Aesthetic[] = published
    .map((collection) => {
      const coverImage = collection.heroImage ?? collection.cards[0]?.exampleImage ?? ""
      return {
        id: toAestheticId(collection.title),
        name: toDisplayName(collection.title),
        blurb: collection.moodLine || "A new editorial brand-shoot look from the SSELFIE Vault.",
        coverImage,
        thumbnails: collection.cards
          .map((card) => card.exampleImage)
          .filter((url): url is string => !!url)
          .slice(0, 4),
        shotCount: collection.cards.length,
        intent: `${toDisplayName(collection.title)} editorial look: ${collection.moodLine || "cohesive styling, refined light, brand-shoot quality"}`,
      }
    })
    .filter((aesthetic) => aesthetic.coverImage.length > 0)

  const seen = new Set<string>()
  const aesthetics = [...dynamicAesthetics, ...AESTHETICS].filter((aesthetic) => {
    if (seen.has(aesthetic.id)) return false
    seen.add(aesthetic.id)
    return true
  })

  return NextResponse.json({ aesthetics })
}
