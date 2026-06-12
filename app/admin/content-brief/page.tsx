import { AdminNav } from "@/components/admin/admin-nav"
import { getLatestAnalyticsReports } from "@/lib/analytics/reports"
import { AdminMaya } from "@/components/admin/admin-maya"
import { ContentBriefClient } from "@/components/admin/content-brief-client"
import { ContentKitClient } from "@/components/admin/content-kit-client"
import { ContentStoryClient } from "@/components/admin/content-story-client"
import { ShootStudioClient } from "@/components/admin/shoot-studio-client"
import { listCarousels } from "@/lib/content-kit/carousel-generator"
import { listAdminSelfies } from "@/lib/content-kit/demo-generator"
import { listShoots } from "@/lib/content-kit/shoot-generator"
import { listStorySequences } from "@/lib/content-kit/story-generator"

export const dynamic = "force-dynamic"

// MAYA-ADMIN-01: Maya IS the content surface. Everything else on this page is collapsed
// support tooling until it's absorbed into her as tools (carousel, story, shoot studio).

function Collapsed({
  title,
  hint,
  children,
}: {
  title: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <details className="group mt-3 rounded-2xl border border-stone-200 bg-white">
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

export default async function ContentBriefPage() {
  const reports = await getLatestAnalyticsReports({
    reportType: "content_brief_weekly",
    limit: 8,
  })
  const carousels = await listCarousels().catch(() => [])
  const selfies = await listAdminSelfies().catch(() => [])
  const stories = await listStorySequences().catch(() => [])
  const shoots = await listShoots().catch(() => [])

  const availableImages = [
    ...shoots.flatMap((shoot) =>
      shoot.shots
        .filter((shot) => shot.status !== "killed" && shot.imageUrl)
        .map((shot) => ({ url: shot.imageUrl as string, label: shot.title })),
    ),
    ...selfies.slice(0, 8).map((url) => ({ url, label: "Your selfie" })),
  ]

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-2">
          <h1 className="font-serif text-3xl font-light tracking-tight text-stone-950">Content</h1>
          <p className="mt-2 text-sm text-stone-600">
            Pick a vault vibe and create with Maya: keep the world, change the outfit or location in
            chat. Nothing posts without you.
          </p>
        </div>

        <AdminMaya />

        <div className="mt-10">
          <p className="text-xs uppercase tracking-wide text-stone-400">Support tools</p>
          <Collapsed title="Weekly brief" hint="Post performance, copies, DMs, hooks">
            <ContentBriefClient initialReports={reports as any} />
          </Collapsed>
          <Collapsed title="Shoot studio" hint="Inspiration-image photoshoots (being absorbed into Maya)">
            <ShootStudioClient initialShoots={shoots} selfies={selfies} />
          </Collapsed>
          <Collapsed title="Carousel kit" hint="Rendered decks, covers, captions">
            <ContentKitClient initialCarousels={carousels} availableImages={availableImages} />
          </Collapsed>
          <Collapsed title="Story sequences" hint="Doctrine story slides">
            <ContentStoryClient initialSequences={stories} availableImages={availableImages} />
          </Collapsed>
        </div>
      </main>
    </div>
  )
}
