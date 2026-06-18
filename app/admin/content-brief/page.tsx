import { AdminNav } from "@/components/admin/admin-nav"
import { getLatestAnalyticsReports } from "@/lib/analytics/reports"
import { buildMemberPulse, type MemberPulse } from "@/lib/admin/member-pulse"
import { AdminMaya } from "@/components/admin/admin-maya"
import { ContentBriefClient } from "@/components/admin/content-brief-client"
import { ContentKitClient } from "@/components/admin/content-kit-client"
import { ContentStoryClient } from "@/components/admin/content-story-client"
import { ShootStudioClient } from "@/components/admin/shoot-studio-client"
import { VaultDropEmailPreview } from "@/components/admin/vault-drop-email-preview"
import { listCarousels } from "@/lib/content-kit/carousel-generator"
import { listAdminSelfies } from "@/lib/content-kit/demo-generator"
import { listShoots } from "@/lib/content-kit/shoot-generator"
import { listStorySequences } from "@/lib/content-kit/story-generator"
import { getPublishedVaultCollections } from "@/lib/vault/published-collections"

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

function pct(v: number | null): string {
  return v === null ? "n/a" : `${Math.round(v * 100)}%`
}

function MemberPulseSection({ pulse }: { pulse: MemberPulse | null }) {
  if (!pulse) {
    return <p className="text-sm text-stone-500">Pulse unavailable right now. Try a refresh.</p>
  }
  const quiet = pulse.activeMembers === 0 && pulse.imagesGenerated === 0
  return (
    <div className="space-y-4 text-sm text-stone-700">
      <p className="text-xs text-stone-400">
        Last {pulse.periodDays} days · Source: analytics_events (behavior) + app_v3_memory. Your own
        admin usage is excluded.
      </p>
      {quiet ? (
        <p>No member activity logged yet this week.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Members creating", value: String(pulse.activeMembers) },
              { label: "Images made", value: String(pulse.imagesGenerated) },
              {
                label: "Loved it (downloads)",
                value: `${pulse.downloads} · ${pct(pulse.downloadRate)}`,
              },
              {
                label: "Friction (re-rolls)",
                value: `${pulse.rerolls} · ${pct(pulse.rerollRate)}`,
              },
            ].map(s => (
              <div
                key={s.label}
                className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3"
              >
                <p className="text-[11px] uppercase tracking-wide text-stone-400">{s.label}</p>
                <p className="mt-1 font-serif text-xl font-light text-stone-950">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="text-stone-600">
            {pulse.conceptsEmitted} concepts across {pulse.conceptSets} sets · {pulse.edits} edits ·{" "}
            {pulse.clarifiesAsked} clarifying questions · {pulse.memoryNotesSaved} things Maya
            learned
          </p>
          {pulse.topVibes.length > 0 && (
            <p>
              <span className="font-medium text-stone-950">Top vibes:</span>{" "}
              {pulse.topVibes.map(v => `${v.aestheticId} (${v.count})`).join(", ")}
            </p>
          )}
          {pulse.freshPreferenceNotes.length > 0 && (
            <div>
              <p className="font-medium text-stone-950">What they told Maya they want</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-stone-600">
                {pulse.freshPreferenceNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          {pulse.recentEditAsks.length > 0 && (
            <div>
              <p className="font-medium text-stone-950">What they keep asking to change</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-stone-600">
                {pulse.recentEditAsks.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default async function ContentBriefPage() {
  const reports = await getLatestAnalyticsReports({
    reportType: "content_brief_weekly",
    limit: 8,
  })
  const pulse = await buildMemberPulse(7).catch(() => null)
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
            Pick a vault vibe and create with Maya: keep the world, change the outfit or location in
            chat. Nothing posts without you.
          </p>
        </div>

        <AdminMaya />

        <div className="mt-10">
          <p className="text-xs uppercase tracking-wide text-stone-400">Support tools</p>
          <Collapsed
            title="Member pulse"
            hint="What members do with Maya: loved, friction, missing"
          >
            <MemberPulseSection pulse={pulse} />
          </Collapsed>
          <Collapsed title="Weekly brief" hint="Post performance, copies, DMs, hooks">
            <ContentBriefClient initialReports={reports as any} />
          </Collapsed>
          <Collapsed
            title="Shoot studio"
            hint="Inspiration-image photoshoots (being absorbed into Maya)"
          >
            <ShootStudioClient initialShoots={shoots} selfies={selfies} />
          </Collapsed>
          <Collapsed title="Vault drop email" hint="Preview + test send before live drop">
            <VaultDropEmailPreview />
          </Collapsed>
          <Collapsed title="Carousel kit" hint="Rendered decks, covers, captions">
            <ContentKitClient initialCarousels={carousels} shoots={shootOptions} />
          </Collapsed>
          <Collapsed title="Story sequences" hint="Doctrine story slides">
            <ContentStoryClient initialSequences={stories} shoots={shootOptions} />
          </Collapsed>
        </div>
      </main>
    </div>
  )
}
