"use client"

// SSELFIE Studio 3.0 — Library (BRIDGE-01 Phase C).
// "Your SSELFIE" — every product she owns in one place: courses with progress, one-time
// products, and the weekly drops. Locked previews for what she doesn't own yet, with one
// upgrade CTA (D3: members own everything, so members never see a lock). Editorial tiles,
// same visual language as Content. Course/product links open the existing Academy and
// access routes; v3-native rendering comes later.

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

interface LibraryCourse {
  id: number
  title: string
  description: string | null
  lessonCount: number
  completedLessons: number
  progressPercentage: number
  started: boolean
  href: string
}

interface LibraryProduct {
  id: string
  name: string
  tagline: string | null
  eyebrow: string
  actionLabel: string
  thumbnailUrl: string | null
  accessUrl: string
}

interface LockedProduct {
  id: string
  eyebrow: string
  title: string
  description: string
  thumbnailUrl: string | null
  href: string
  ctaLabel: string
}

interface LibraryDrop {
  id: number | string
  title: string
  description: string | null
  thumbnailUrl: string | null
  month: string | null
  category: string | null
}

interface LibraryData {
  membershipActive: boolean
  courses: LibraryCourse[]
  ownedProducts: LibraryProduct[]
  lockedProducts: LockedProduct[]
  drops: LibraryDrop[]
}

const card = "rounded-[8px] border border-[#C5C6C8]/60 bg-white"

function ProductTile({
  title,
  eyebrow,
  description,
  thumbnailUrl,
  href,
  actionLabel,
  locked = false,
}: {
  title: string
  eyebrow: string
  description: string | null
  thumbnailUrl: string | null
  href: string
  actionLabel: string
  locked?: boolean
}) {
  return (
    <Link
      href={href}
      className={`${card} group block overflow-hidden transition-colors hover:border-[#0D0E10]/40`}
    >
      <div className="relative aspect-[4/5] bg-[#F1F2F2]">
        {thumbnailUrl ? (
          <Image
            src={thumbnailUrl}
            alt=""
            fill
            className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02] ${
              locked ? "saturate-[0.82]" : ""
            }`}
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-[10px] uppercase tracking-[0.22em] text-[#818283]">
            SSELFIE
          </div>
        )}
        {locked && (
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[9px] uppercase tracking-[0.16em] text-[#0D0E10]">
            Locked
          </div>
        )}
      </div>
      <div className="p-4">
        <span className="text-[9px] uppercase tracking-[0.16em] text-[#818283]">{eyebrow}</span>
        <h3 className="mt-1.5 font-serif text-[21px] font-light leading-tight text-[#0D0E10]">{title}</h3>
        {description && <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">{description}</p>}
        <span className="mt-4 block text-[11px] uppercase tracking-[0.18em] text-[#0D0E10]">
          {actionLabel}
        </span>
      </div>
    </Link>
  )
}

export function LibraryView() {
  const [data, setData] = useState<LibraryData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/app-v3/library")
      .then((r) => r.json())
      .then((d) => {
        if (d && Array.isArray(d.ownedProducts)) setData(d as LibraryData)
        else setError("Couldn't load your library. Try again.")
      })
      .catch(() => setError("Couldn't load your library. Try again."))
  }, [])

  // Courses already shown with progress are hidden from the flat product tiles to avoid
  // the same item appearing twice (the courses list is the richer surface).
  const courseProductIds = new Set(["masterclass", "branded_by_sselfie", "editing_masterclass"])
  const products = (data?.ownedProducts ?? []).filter(
    (p) => !(data?.courses?.length && courseProductIds.has(p.id))
  )

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-8">
      <header>
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Library</p>
        <h1 className="mt-2 font-serif text-[30px] font-light leading-tight text-[#0D0E10]">Your SSELFIE</h1>
        <p className="mt-1.5 text-[14px] text-[#4F5052]">Everything you own lives here.</p>
      </header>

      {error && <p className="text-[14px] text-[#4F5052]">{error}</p>}
      {!data && !error && <p className="text-[14px] text-[#818283]">Opening your library…</p>}

      {data && (
        <>
          {/* Courses with progress */}
          {data.courses.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#818283]">Your courses</p>
              <div className="space-y-3">
                {data.courses.map((c) => (
                  <a
                    key={c.id}
                    href={c.href}
                    className={`${card} block p-4 transition-colors hover:border-[#0D0E10]/40`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-serif text-[20px] font-light leading-tight text-[#0D0E10]">{c.title}</h3>
                      <span className="shrink-0 text-[11px] uppercase tracking-[0.14em] text-[#818283]">
                        {c.completedLessons}/{c.lessonCount} lessons
                      </span>
                    </div>
                    {c.description && (
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#4F5052]">{c.description}</p>
                    )}
                    <div className="mt-3 h-[3px] w-full overflow-hidden rounded-full bg-[#F1F2F2]">
                      <div
                        className="h-full bg-[#0D0E10] transition-[width]"
                        style={{ width: `${Math.min(100, Math.max(0, c.progressPercentage))}%` }}
                      />
                    </div>
                    <span className="mt-3 block text-[11px] uppercase tracking-[0.18em] text-[#0D0E10]">
                      {c.started ? "Continue" : "Start"}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Owned products */}
          {products.length > 0 && (
            <section>
              <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#818283]">Your products</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {products.map((p) => (
                  <ProductTile
                    key={p.id}
                    title={p.name}
                    eyebrow={p.eyebrow}
                    description={p.tagline}
                    thumbnailUrl={p.thumbnailUrl}
                    href={p.accessUrl}
                    actionLabel={p.actionLabel}
                  />
                ))}
              </div>
            </section>
          )}

          {data.courses.length === 0 && products.length === 0 && (
            <p className="text-[14px] text-[#4F5052]">Nothing here yet. Your products will show up the moment you own them.</p>
          )}

          {/* Weekly drops */}
          <section>
            <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#818283]">Drops</p>
            {data.drops.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.drops.map((d) => (
                  <Link
                    key={d.id}
                    href="/academy/access/monthly-drops"
                    className={`${card} flex gap-3 overflow-hidden p-3 transition-colors hover:border-[#0D0E10]/40`}
                  >
                    {d.thumbnailUrl && (
                      <div className="relative aspect-square w-16 shrink-0 overflow-hidden rounded-[6px] bg-[#F1F2F2]">
                        <Image src={d.thumbnailUrl} alt="" fill className="object-cover" sizes="64px" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-serif text-[17px] font-light leading-tight text-[#0D0E10]">{d.title}</h3>
                      {d.month && (
                        <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-[#818283]">{d.month}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className={`${card} p-4`}>
                <p className="text-[14px] text-[#4F5052]">New drops land here every week.</p>
              </div>
            )}
          </section>

          {/* Locked previews + the one upgrade CTA (non-members only; D3 keeps members lock-free) */}
          {!data.membershipActive && (
            <section>
              {data.lockedProducts.length > 0 && (
                <>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-[#818283]">Not yours yet</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {data.lockedProducts.map((p) => (
                      <ProductTile
                        key={p.id}
                        title={p.title}
                        eyebrow={p.eyebrow}
                        description={p.description}
                        thumbnailUrl={p.thumbnailUrl}
                        href={p.href}
                        actionLabel={p.ctaLabel}
                        locked
                      />
                    ))}
                  </div>
                </>
              )}
              <div className="mt-3 rounded-[8px] border border-[#0D0E10] bg-white p-4">
                <h3 className="font-serif text-[20px] font-light leading-tight text-[#0D0E10]">
                  Members get all of it.
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
                  The SUITE includes every product here, plus Maya and 200 photos a month.
                </p>
                <a
                  href="/join/studio?source=app_library"
                  className="mt-3 inline-block rounded-[6px] border border-[#0D0E10] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-white hover:text-[#0D0E10]"
                >
                  See the SUITE
                </a>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
