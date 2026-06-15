import type { VaultFreebieCollectionPreview } from "@/lib/ai-prompts/prompt-data"

type FreebieSourceCollection = {
  title: string
  cards: VaultFreebieCollectionPreview["freeCard"][]
}

export function selectRotatingPublishedFreebieCollections(
  collections: FreebieSourceCollection[],
  options: { limit?: number } = {}
): VaultFreebieCollectionPreview[] {
  const limit = Math.max(0, options.limit ?? collections.length)
  return collections
    .filter(collection => collection.cards.length > 0)
    .slice(0, limit)
    .map(collection => ({
      freeCard: collection.cards[0],
      name: collection.title,
      shotCount: collection.cards.length,
      lockedShots: collection.cards.slice(1).map(card => ({
        title: card.title,
        exampleImage: card.exampleImage,
      })),
    }))
}
