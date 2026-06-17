import Link from "next/link"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { getPresetOrderByToken } from "@/lib/presets/orders"
import { getPresetCollectionsForAccess } from "@/lib/presets/published-collections"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "Your SSELFIE Presets · SSELFIE",
  description: "Download your SSELFIE Lightroom presets and setup guide.",
}

function DownloadLink({
  href,
  children,
}: {
  href?: string | null
  children: ReactNode
}) {
  if (!href) {
    return (
      <span className="border border-[rgba(197,198,200,0.55)] px-4 py-3 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-[#818283]">
        Coming soon
      </span>
    )
  }

  return (
    <a
      href={href}
      className="border border-[#0D0E10] bg-[#0D0E10] px-4 py-3 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-[#282728]"
    >
      {children}
    </a>
  )
}

export default async function PresetsAccessPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const order = await getPresetOrderByToken(token)

  if (!order) {
    notFound()
  }

  const collections = await getPresetCollectionsForAccess({
    tier: order.tier,
    collectionSlug: order.collectionSlug,
  })

  await logAnalyticsEvent({
    eventName: "presets_access_opened",
    userId: null,
    path: "/access/presets/[token]",
    properties: {
      preset_tier: order.tier,
      preset_collection_slug: order.collectionSlug,
      collection_count: collections.length,
    },
  })

  return (
    <main className={`${inter.className} min-h-screen bg-[#F8FAFA] text-[#0D0E10]`}>
      <section className="mx-auto max-w-5xl px-5 py-14 sm:py-20">
        <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.34em] text-[#818283]">
          The SSELFIE Presets
        </p>
        <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <h1 className={`${cormorant.className} text-4xl font-light leading-tight sm:text-6xl`}>
              Your presets are ready.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#4F5052] sm:text-base">
              Download the mobile preset files, desktop preset files, and setup guide below. Bundle buyers automatically see every published collection here as Sandra adds new ones.
            </p>
          </div>
          <div className="border border-[rgba(197,198,200,0.55)] bg-white p-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#818283]">
              Your access
            </p>
            <p className="mt-3 text-sm font-medium">
              {order.tier === "bundle" ? "Full Collection" : "Single Collection"}
            </p>
            <p className="mt-2 text-xs leading-6 text-[#4F5052]">
              Sent to {order.email}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-20">
        {collections.length === 0 ? (
          <div className="border border-[rgba(197,198,200,0.55)] bg-white p-8">
            <h2 className={`${cormorant.className} text-3xl font-light`}>Your collection is being prepared.</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[#4F5052]">
              Your purchase is active. Sandra still needs to upload the preset files for this collection, and this page will show the download links as soon as they are published.
            </p>
            <Link
              href="mailto:support@sselfie.ai?subject=SSELFIE%20Presets%20access"
              className="mt-6 inline-block border border-[#0D0E10] px-5 py-3 text-[10px] font-medium uppercase tracking-[0.22em]"
            >
              Email support
            </Link>
          </div>
        ) : (
          <div className="grid gap-5">
            {collections.map(collection => (
              <article key={collection.slug} className="border border-[rgba(197,198,200,0.55)] bg-white p-5 sm:p-7">
                <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.26em] text-[#818283]">
                      Preset collection
                    </p>
                    <h2 className={`${cormorant.className} mt-3 text-3xl font-light`}>
                      {collection.name}
                    </h2>
                    {collection.description ? (
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#4F5052]">
                        {collection.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid min-w-[240px] gap-2">
                    <DownloadLink href={collection.mobileDngUrl}>Mobile .dng</DownloadLink>
                    <DownloadLink href={collection.desktopXmpUrl}>Desktop .xmp</DownloadLink>
                    <DownloadLink href={collection.setupGuideUrl}>Setup guide</DownloadLink>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
