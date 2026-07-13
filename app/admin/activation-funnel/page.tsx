import Link from "next/link"

import { AdminNav } from "@/components/admin/admin-nav"
import {
  getActivationFunnelScorecard,
  type ActivationCohort,
  type ActivationStepKey,
} from "@/lib/admin/activation-funnel-scorecard"

export const dynamic = "force-dynamic"

function rateLabel(count: number, eligible: number, ratePct: number): string {
  if (eligible === 0) return "Not mature yet"
  return `${ratePct}% · ${count}/${eligible}`
}

function stepFor(cohort: ActivationCohort, key: ActivationStepKey) {
  return cohort.steps.find(step => step.key === key)
}

function FunnelTable({ cohort }: { cohort: ActivationCohort }) {
  return (
    <section className="border border-stone-300 bg-white">
      <div className="border-b border-stone-200 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl font-light text-stone-950">{cohort.label}</h2>
            <p className="mt-2 text-sm text-stone-600">{cohort.size} people entered this cohort.</p>
          </div>
          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">
            Behavior · analytics_events
          </p>
        </div>
      </div>

      <div className="divide-y divide-stone-200">
        {cohort.steps.map((step, index) => (
          <article
            key={step.key}
            className="grid gap-4 p-5 sm:grid-cols-[36px_minmax(0,1fr)_130px_170px] sm:items-center sm:p-6"
          >
            <p className="text-xs text-stone-400">{String(index + 1).padStart(2, "0")}</p>
            <div>
              <p className="font-medium text-stone-950">{step.label}</p>
              <p className="mt-1 text-sm leading-6 text-stone-600">{step.description}</p>
            </div>
            <div>
              <p className="font-serif text-2xl font-light text-stone-950">{step.count}</p>
              <p className="mt-1 text-xs text-stone-500">
                {rateLabel(step.count, step.eligible, step.ratePct)}
              </p>
            </div>
            <div className="text-xs leading-5 text-stone-500">
              {step.targetLabel ? (
                <>
                  <p>{step.targetLabel}</p>
                  {!step.targetComparable ? (
                    <p className="mt-1 text-amber-700">Directional only</p>
                  ) : null}
                </>
              ) : (
                <p>No reference goal</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function CohortSummaryTable({ cohorts, title }: { cohorts: ActivationCohort[]; title: string }) {
  const columns: Array<{ key: ActivationStepKey; label: string }> = [
    { key: "opened_app", label: "Opened" },
    { key: "selfie_uploaded", label: "Upload" },
    { key: "look_chosen", label: "Look" },
    { key: "first_image_generated", label: "Generated" },
    { key: "first_image_downloaded", label: "Downloaded" },
    { key: "returned_within_7d", label: "7d return" },
    { key: "created_again_days_8_14", label: "Week 2" },
  ]

  return (
    <section className="border border-stone-300 bg-white">
      <div className="border-b border-stone-200 p-5 sm:p-6">
        <h2 className="font-serif text-3xl font-light text-stone-950">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Steps one through five use each cohort as the denominator. Seven-day and week-two columns
          use only people whose first qualifying action has completed the observation window.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-[10px] uppercase tracking-[0.14em] text-stone-500">
            <tr>
              <th className="px-5 py-3 font-medium sm:px-6">Cohort</th>
              <th className="px-3 py-3 font-medium">Size</th>
              {columns.map(column => (
                <th key={column.key} className="px-3 py-3 font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {cohorts.map(cohort => (
              <tr key={cohort.key}>
                <td className="px-5 py-4 font-medium text-stone-950 sm:px-6">{cohort.label}</td>
                <td className="px-3 py-4 text-stone-600">{cohort.size}</td>
                {columns.map(column => {
                  const step = stepFor(cohort, column.key)
                  return (
                    <td key={column.key} className="px-3 py-4 text-stone-600">
                      {step && step.eligible > 0 ? `${step.ratePct}%` : "–"}
                      {step ? (
                        <span className="mt-1 block text-[11px] text-stone-400">
                          {step.count}/{step.eligible}
                        </span>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default async function ActivationFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const params = await searchParams
  const requestedDays = Number(params.days)
  const windowDays = [7, 14, 30].includes(requestedDays) ? requestedDays : 30
  const report = await getActivationFunnelScorecard(windowDays)

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-col gap-5 border-b border-stone-300 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/admin/tools"
              className="text-xs uppercase tracking-[0.16em] text-stone-500 underline underline-offset-4"
            >
              Tools
            </Link>
            <h1 className="mt-3 font-serif text-5xl font-light tracking-tight">
              Activation funnel
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              Seven measured steps from first app open to a second week of creation. Trial rows are
              scoped to real trial users and broken out by their recorded source.
            </p>
            <p className="mt-2 text-xs text-stone-500">Source: {report.source}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 14, 30].map(days => (
              <Link
                key={days}
                href={`/admin/activation-funnel?days=${days}`}
                className={`border px-3 py-2 text-xs uppercase tracking-[0.14em] ${
                  days === windowDays
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-300 bg-white text-stone-600 hover:border-stone-950"
                }`}
              >
                {days} days
              </Link>
            ))}
          </div>
        </header>

        <section className="mt-7 border border-stone-950 bg-stone-950 p-5 text-stone-50 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-300">Focus this week</p>
          <h2 className="mt-3 max-w-3xl font-serif text-3xl font-light sm:text-4xl">
            {report.focusThisWeek.title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-200">
            {report.focusThisWeek.evidence}
          </p>
          <p className="mt-4 max-w-3xl border-t border-stone-700 pt-4 text-sm leading-6 text-stone-50">
            {report.focusThisWeek.action}
          </p>
        </section>

        <section className="mt-7 border border-amber-300 bg-amber-50 p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-amber-800">
            Measurement limits
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950">
            {report.measurementNotes.map(note => (
              <li key={note}>• {note}</li>
            ))}
          </ul>
        </section>

        <div className="mt-6 space-y-6">
          <FunnelTable cohort={report.trialOverall} />
          <FunnelTable cohort={report.appCohorts[0]} />

          {report.trialSources.length > 0 ? (
            <CohortSummaryTable cohorts={report.trialSources} title="Trials by recorded source" />
          ) : null}

          {report.appCohorts.length > 1 ? (
            <CohortSummaryTable
              cohorts={report.appCohorts.slice(1)}
              title="New app visitors by access cohort"
            />
          ) : null}

          <section className="border border-stone-300 bg-white p-5 sm:p-6">
            <h2 className="font-serif text-3xl font-light">Trial source confidence</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              Paid-buyer trials are matched to the exact purchase-triggered activation event first.
              Older trials use the exact claim subscriber when possible and display that subscriber
              record&apos;s current acquisition source. Email fallback is used only when an older event
              lacks a subscriber ID.
            </p>
            <dl className="mt-5 grid gap-px bg-stone-200 sm:grid-cols-3">
              <div className="bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">
                  Exact source match
                </dt>
                <dd className="mt-2 font-serif text-3xl font-light">
                  {report.trialSourceAttribution.paidBuyerEvent +
                    report.trialSourceAttribution.exactClaimSubscriber}
                </dd>
                <p className="mt-1 text-xs text-stone-500">
                  {report.trialSourceAttribution.paidBuyerEvent} paid buyers ·{" "}
                  {report.trialSourceAttribution.exactClaimSubscriber} claim subscribers
                </p>
              </div>
              <div className="bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">
                  Email fallback
                </dt>
                <dd className="mt-2 font-serif text-3xl font-light">
                  {report.trialSourceAttribution.emailFallback}
                </dd>
              </div>
              <div className="bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">
                  Direct / unknown
                </dt>
                <dd className="mt-2 font-serif text-3xl font-light">
                  {report.trialSourceAttribution.direct}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    </div>
  )
}
