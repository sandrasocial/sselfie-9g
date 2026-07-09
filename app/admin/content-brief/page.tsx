import { AdminNav } from "@/components/admin/admin-nav"
import { ContentKitClient } from "@/components/admin/content-kit-client"
import { ContentStoryClient } from "@/components/admin/content-story-client"
import { ShootStudioClient } from "@/components/admin/shoot-studio-client"
import { listCarousels } from "@/lib/content-kit/carousel-generator"
import { listAdminSelfies } from "@/lib/content-kit/demo-generator"
import { listShoots } from "@/lib/content-kit/shoot-generator"
import { listStorySequences } from "@/lib/content-kit/story-generator"
import { getPublishedVaultCollections } from "@/lib/vault/published-collections"

export const dynamic = "force-dynamic"

// Admin content is tool-first. Keep Suite Maya out of this screen so Shoot Studio remains
// the single source for inspiration-image photoshoots.

function Collapsed({
  id,
  title,
  hint,
  defaultOpen = false,
  children,
}: {
  id?: string
  title: string
  hint: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details id={id} open={defaultOpen} className="group mt-3 scroll-mt-6 rounded-2xl border border-stone-200 bg-white">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="font-serif text-lg font-light tracking-tight text-stone-950">{title}</span>
        <span className="text-xs text-stone-400 group-open:hidden">{hint}</span>
        <span className="hidden text-xs uppercase tracking-wide text-stone-400 group-open:inline">
          Close
        </span>
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  )
}

export default async function ContentBriefPage({
  searchParams,
}: {
  searchParams?: Promise<{ open?: string }>
}) {
  const openSection = (await searchParams)?.open
  const carousels = await listCarousels().catch(() => [])
  const selfies = await listAdminSelfies().catch(() => [])
  const stories = await listStorySequences().catch(() => [])
  const shoots = await listShoots().catch(() => [])
  const publishedCollections = await getPublishedVaultCollections().catch(() => [])
  const publishedByShootId = new Map(
    publishedCollections
      .filter((collection) => collection.sourceShootId !== null)
      .map((collection) => [collection.sourceShootId as number, collection]),
  )

  const shootOptions = shoots.map(shoot => {
    const publishedCollection = publishedByShootId.get(shoot.id)
    const publishedShots =
      publishedCollection?.cards
        .filter(card => card.exampleImage)
        .map(card => ({ id: card.id, title: card.title, url: card.exampleImage as string })) ?? []
    return {
      id: shoot.id,
      title: shoot.title,
      status: publishedShots.length > 0 ? "approved" : shoot.status,
      createdAt: shoot.createdAt,
      shots:
        publishedShots.length > 0
          ? publishedShots
          : shoot.shots
              .filter(shot => shot.status === "approved" && shot.imageUrl)
              .map(shot => ({ id: shot.id, title: shot.title, url: shot.imageUrl as string })),
    }
  })

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-2">
          <h1 className="font-serif text-3xl font-light tracking-tight text-stone-950">Content</h1>
          <p className="mt-2 text-sm text-stone-600">
            Create shoot collections, turn approved shots into content, and review every handoff
            before anything publishes.
          </p>
        </div>

        <div className="mt-8">
          <p className="text-xs uppercase tracking-wide text-stone-400">Content tools</p>
          <Collapsed
            title="Shoot studio"
            hint="Inspiration-image photoshoots"
            defaultOpen
          >
            <ShootStudioClient initialShoots={shoots} selfies={selfies} />
          </Collapsed>
          <Collapsed
            id="carousel-kit"
            title="Carousel kit"
            hint="Rendered decks, covers, captions"
            defaultOpen={openSection === "carousel-kit"}
          >
            <ContentKitClient initialCarousels={carousels} shoots={shootOptions} />
          </Collapsed>
          <Collapsed
            id="story-sequences"
            title="Story sequences"
            hint="Doctrine story slides"
            defaultOpen={openSection === "story-sequences"}
          >
            <ContentStoryClient initialSequences={stories} shoots={shootOptions} />
          </Collapsed>
        </div>
      </main>
    </div>
  )
}
