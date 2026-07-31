import Link from "next/link"

import { AdminNav } from "@/components/admin/admin-nav"
import { buildMemberPulse, type MemberPulse } from "@/lib/admin/member-pulse"

export const dynamic = "force-dynamic"

function percent(value: number | null): string {
  return value === null ? "Not enough activity" : `${Math.round(value * 100)}%`
}

function reasonLabel(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, letter => letter.toUpperCase())
}

function Stat({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="bg-white p-5 sm:p-6">
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">{label}</p>
      <p className="mt-3 font-serif text-4xl font-light text-stone-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-stone-500">{note}</p>
    </div>
  )
}

function ReasonList({
  rows,
  empty,
}: {
  rows: Array<{ reason: string; count: number }>
  empty: string
}) {
  if (rows.length === 0) {
    return <p className="mt-4 text-sm leading-6 text-stone-500">{empty}</p>
  }

  return (
    <ol className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
      {rows.map(row => (
        <li key={row.reason} className="flex items-center justify-between gap-4 py-3 text-sm">
          <span className="text-stone-700">{reasonLabel(row.reason)}</span>
          <span className="font-medium text-stone-950">{row.count}</span>
        </li>
      ))}
    </ol>
  )
}

function MemberWords({
  title,
  description,
  notes,
  empty,
}: {
  title: string
  description: string
  notes: string[]
  empty: string
}) {
  return (
    <section className="border border-stone-300 bg-white p-5 sm:p-6">
      <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Member words</p>
      <h2 className="mt-2 font-serif text-3xl font-light text-stone-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
      {notes.length > 0 ? (
        <ul className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
          {notes.map((note, index) => (
            <li key={`${index}-${note}`} className="py-4 text-sm leading-6 text-stone-700">
              “{note}”
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 border-y border-stone-200 py-4 text-sm text-stone-500">{empty}</p>
      )}
    </section>
  )
}

function PulseContent({ pulse }: { pulse: MemberPulse }) {
  const attentionCount = pulse.generationFailures + pulse.chatAborts

  return (
    <>
      <section className="mt-7 border border-stone-950 bg-stone-950 p-5 text-stone-50 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-stone-400">Needs attention</p>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl font-light sm:text-4xl">
              {attentionCount === 0
                ? "No generation or chat failures recorded."
                : `${attentionCount} product problems were recorded.`}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-300">
              This combines failed generations and chats that stopped before Maya finished. Recovery
              prompts are shown separately because they can include expected guidance, such as low
              credits.
            </p>
          </div>
          <p className="font-serif text-6xl font-light text-white">{attentionCount}</p>
        </div>
      </section>

      <section className="mt-5 grid gap-px overflow-hidden border border-stone-300 bg-stone-300 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="People active"
          value={pulse.activeMembers}
          note={`${pulse.activePaidMembers} paying · ${pulse.activeTrialMembers} trial · ${pulse.activeOtherMembers} other access`}
        />
        <Stat
          label="Generation completions"
          value={pulse.generationCompletions}
          note={`${pulse.imagesGenerated} images recorded across completed requests`}
        />
        <Stat
          label="Download actions"
          value={pulse.downloads}
          note="Useful behavior evidence, but not a happiness score"
        />
        <Stat
          label="Rerun share"
          value={percent(pulse.rerollRate)}
          note={`${pulse.rerolls} reruns across successful generation requests`}
        />
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="border border-stone-300 bg-white p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">
            Generation problems
          </p>
          <p className="mt-3 font-serif text-4xl font-light text-stone-950">
            {pulse.generationFailures}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Requests that did not complete. Reasons are grouped so the repeated problem is visible.
          </p>
          <ReasonList rows={pulse.failureReasons} empty="No generation failures in this window." />
        </div>

        <div className="border border-stone-300 bg-white p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Recovery shown</p>
          <p className="mt-3 font-serif text-4xl font-light text-stone-950">
            {pulse.recoveriesShown}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Times Maya had to help someone resume, retry, add credits, or rebuild a thin result.
          </p>
          <ReasonList rows={pulse.recoveryReasons} empty="No recovery prompts in this window." />
        </div>
      </section>

      <section className="mt-5 grid gap-px overflow-hidden border border-stone-300 bg-stone-300 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Edits requested" value={pulse.edits} note="Changes made after a result" />
        <Stat
          label="Maya clarified"
          value={pulse.clarifiesAsked}
          note="Times Maya needed more direction"
        />
        <Stat
          label="Chat stopped"
          value={pulse.chatAborts}
          note="Streams that ended before reply"
        />
        <Stat
          label="Direct reviews"
          value={pulse.reviewsSubmitted}
          note="Submitted member review responses"
        />
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <MemberWords
          title="What members told Maya they want"
          description="Recent anonymous preference notes Maya remembered. Links and contact details are removed."
          notes={pulse.freshPreferenceNotes}
          empty="No new preference notes in this window."
        />
        <MemberWords
          title="What they asked Maya to change"
          description="Recent anonymous edit instructions. Repeated language usually points to a quality or expectation gap."
          notes={pulse.recentEditAsks}
          empty="No edit instructions in this window."
        />
      </section>

      <section className="mt-5 grid gap-5 border border-stone-300 bg-white p-5 sm:grid-cols-2 sm:p-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Top formats</p>
          {pulse.topFormats.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              {pulse.topFormats.map(row => (
                <li key={row.format} className="flex justify-between gap-4">
                  <span>{reasonLabel(row.format)}</span>
                  <span>{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-stone-500">No format activity yet.</p>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Top Vault vibes</p>
          {pulse.topVibes.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-stone-700">
              {pulse.topVibes.map(row => (
                <li key={row.aestheticId} className="flex justify-between gap-4">
                  <span>{reasonLabel(row.aestheticId)}</span>
                  <span>{row.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-stone-500">No Vault vibe activity yet.</p>
          )}
        </div>
      </section>

      <p className="mt-5 text-xs leading-5 text-stone-500">
        Sources: anonymous product behavior in analytics_events and recent preference notes in
        app_v3_memory. This page contains no revenue claims and no customer identity fields.
      </p>
    </>
  )
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const params = await searchParams
  const requestedDays = Number(params.days)
  const windowDays = [7, 14, 30].includes(requestedDays) ? requestedDays : 7
  const pulse = await buildMemberPulse(windowDays).catch(error => {
    console.error("[admin-members] member pulse unavailable:", error)
    return null
  })

  return (
    <div className="min-h-screen bg-stone-100 text-stone-950">
      <AdminNav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <header className="flex flex-col gap-5 border-b border-stone-300 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-stone-500">
              Customer listening
            </p>
            <h1 className="mt-2 font-serif text-5xl font-light tracking-tight">Member pulse</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
              See what people do with Maya, where the experience breaks, and the anonymous language
              they use when they want something changed.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 14, 30].map(days => (
              <Link
                key={days}
                href={`/admin/members?days=${days}`}
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

        {pulse ? (
          <PulseContent pulse={pulse} />
        ) : (
          <section className="mt-7 border border-stone-300 bg-white p-6">
            <h2 className="font-serif text-3xl font-light">Member pulse is unavailable</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              The source could not be read right now. Refresh once; if it remains unavailable, the
              failure will be visible in production logs for repair.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}
