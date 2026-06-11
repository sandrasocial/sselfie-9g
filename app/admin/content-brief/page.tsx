import { AdminNav } from "@/components/admin/admin-nav"
import { getLatestAnalyticsReports } from "@/lib/analytics/reports"
import { ContentBriefClient } from "@/components/admin/content-brief-client"

export const dynamic = "force-dynamic"

export default async function ContentBriefPage() {
  const reports = await getLatestAnalyticsReports({
    reportType: "content_brief_weekly",
    limit: 8,
  })

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
      </main>
    </div>
  )
}
