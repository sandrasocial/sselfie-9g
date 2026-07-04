import { NextResponse } from "next/server"
import { AESTHETICS } from "@/components/app-v3/aesthetics"
import { stripIdentityParagraph } from "@/lib/app-v3/maya/vault-styles"
import { getPublishedVaultCollections, toAestheticId, toDisplayName } from "@/lib/vault/published-collections"
import { weeklyDropLookForDate } from "@/lib/email/templates/suite-habit-emails"
import { matchWeeklyLookAesthetic } from "@/lib/app-v3/weekly-look"
import type { Aesthetic } from "@/components/app-v3/types"

export const dynamic = "force-dynamic"

export async function GET() {
  const published = await getPublishedVaultCollections()
  const dynamicAesthetics: Aesthetic[] = published
    .map((collection) => {
      const coverImage = collection.heroImage ?? collection.cards[0]?.exampleImage ?? ""
      const shots = collection.cards
        .map(card => ({
          id: card.id,
          title: card.title,
          image: card.exampleImage ?? "",
          whenToUse: card.whenToUse,
          mood: card.mood,
          stylePrompt: stripIdentityParagraph(card.prompt),
        }))
        .filter(shot => shot.image.length > 0)
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
        shots,
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

  // In-app mirror of the Monday habit email: the same rotating weekly look, matched to
  // its aesthetic tile so the Create view can highlight it as "New this week".
  const look = weeklyDropLookForDate(new Date())
  const matched = matchWeeklyLookAesthetic(look, aesthetics)

  return NextResponse.json({
    aesthetics,
    weeklyLook: matched
      ? { aestheticId: matched.id, name: look.name, oneLiner: look.oneLiner }
      : null,
  })
}
