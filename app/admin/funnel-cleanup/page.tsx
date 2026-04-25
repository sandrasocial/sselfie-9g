import { AdminNav } from "@/components/admin/admin-nav"
import { FUNNEL_CLEANUP_CANDIDATES } from "@/lib/funnel/cleanup-candidates"
import { getFunnelCleanupEvidence } from "@/lib/funnel/cleanup-evidence"

const statusLabel = {
  support: "Support",
  archive_candidate: "Archive Candidate",
} as const

export default async function FunnelCleanupPage() {
  const evidence = await getFunnelCleanupEvidence()
  const archiveCandidates = FUNNEL_CLEANUP_CANDIDATES.filter(
    (candidate) => candidate.status === "archive_candidate",
  )
  const supportCandidates = FUNNEL_CLEANUP_CANDIDATES.filter(
    (candidate) => candidate.status === "support",
  )

  return (
    <main className="min-h-screen bg-stone-50">
      <AdminNav />
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10">
          <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-stone-500">
            Funnel Cleanup
          </p>
          <h1 className="font-['Times_New_Roman'] text-4xl font-extralight uppercase tracking-[0.24em] text-stone-950 sm:text-5xl">
            Review Before Hiding
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-stone-600">
            This is a non-destructive review list. Nothing here redirects or deletes routes by
            itself. Use it to check traffic, revenue, email links, and dependencies before making
            cleanup decisions.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <MetricCard label="Total Routes" value={FUNNEL_CLEANUP_CANDIDATES.length} />
          <MetricCard label="Archive Candidates" value={archiveCandidates.length} />
          <MetricCard label="Support Offers" value={supportCandidates.length} />
        </div>

        <div className="space-y-4">
          {FUNNEL_CLEANUP_CANDIDATES.map((candidate) => (
            <article
              key={candidate.route}
              className="border border-stone-200 bg-white p-6"
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                <div>
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs text-stone-500">{candidate.route}</span>
                    <span
                      className="border border-stone-200 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-600"
                    >
                      {statusLabel[candidate.status]}
                    </span>
                  </div>
                  <h2 className="font-['Times_New_Roman'] text-2xl font-extralight uppercase tracking-[0.16em] text-stone-950">
                    {candidate.likelyRedirect}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{candidate.reason}</p>
                </div>

                <div className="border-t border-stone-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-stone-500">
                    Last 30 Days
                  </p>
                  <dl className="space-y-3">
                    <EvidenceRow label="Events" value={evidence[candidate.route]?.events30d ?? 0} />
                    <EvidenceRow
                      label="Actors"
                      value={evidence[candidate.route]?.uniqueActors30d ?? 0}
                    />
                    <div>
                      <dt className="text-[10px] uppercase tracking-[0.16em] text-stone-400">
                        Latest Seen
                      </dt>
                      <dd className="mt-1 font-mono text-[11px] text-stone-600">
                        {evidence[candidate.route]?.latestSeenAt
                          ? new Date(evidence[candidate.route].latestSeenAt).toLocaleDateString()
                          : "None"}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="border-t border-stone-100 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-stone-500">
                    Before Action
                  </p>
                  <ul className="space-y-2">
                    {candidate.requiredBeforeAction.map((item) => (
                      <li key={item} className="text-xs leading-6 text-stone-600">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-stone-200 bg-white p-5">
      <p className="text-3xl font-light text-stone-950">{value}</p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-stone-500">{label}</p>
    </div>
  )
}

function EvidenceRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-[0.16em] text-stone-400">{label}</dt>
      <dd className="mt-1 text-2xl font-light text-stone-950">{value}</dd>
    </div>
  )
}
