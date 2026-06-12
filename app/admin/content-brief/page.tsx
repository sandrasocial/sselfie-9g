import { AdminNav } from "@/components/admin/admin-nav"
import { getLatestAnalyticsReports } from "@/lib/analytics/reports"
import { ContentBriefClient } from "@/components/admin/content-brief-client"
import { ContentKitClient } from "@/components/admin/content-kit-client"
import { ContentStoryClient } from "@/components/admin/content-story-client"
import { ShootStudioClient } from "@/components/admin/shoot-studio-client"
import { listCarousels } from "@/lib/content-kit/carousel-generator"
import { listAdminSelfies } from "@/lib/content-kit/demo-generator"
import { listShoots } from "@/lib/content-kit/shoot-generator"
import { listStorySequences } from "@/lib/content-kit/story-generator"

export const dynamic = "force-dynamic"

export default async function ContentBriefPage() {
  const reports = await getLatestAnalyticsReports({
    reportType: "content_brief_weekly",
    limit: 8,
  })
  const carousels = await listCarousels().catch(() => [])
  const selfies = await listAdminSelfies().catch(() => [])
  const stories = await listStorySequences().catch(() => [])
  const shoots = await listShoots().catch(() => [])

  // Photo pickers feed on shoot output first (the real content unit), selfies as fallback.
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
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-light tracking-tight text-stone-950">
            Weekly Content Brief
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Built from your post performance, what your audience copies, your DMs, and live hook research.
            Everything here is a draft. Nothing posts without you.
          </p>
        </div>
        <ContentBriefClient initialReports={reports as any} />
        <ShootStudioClient initialShoots={shoots} selfies={selfies} />
        <ContentKitClient initialCarousels={carousels} availableImages={availableImages} />
        <ContentStoryClient initialSequences={stories} availableImages={availableImages} />
      </main>
    </div>
  )
}
