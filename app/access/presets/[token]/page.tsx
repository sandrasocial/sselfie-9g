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

// DESIGN + COPY owned by Claude (see tasks/PRESETS-PRODUCT-01.md). Data-fetching/logic owned by Codex - preserved as-is below.
const OBSIDIAN = "#0A0A0A"
const PORCELAIN = "#FFFFFF"
const CREAM = "#F5F5F5"
const SMOKE = "#666666"
const STONE = "#8A8780"
const WHISPER = "#E5E5E5"

const eyebrow = {
  fontFamily: inter.style.fontFamily,
  fontSize: "10px",
  letterSpacing: "0.42em",
  textTransform: "uppercase" as const,
  color: STONE,
  margin: 0,
}

function DownloadLink({ href, children }: { href?: string | null; children: ReactNode }) {
  if (!href) {
    return (
      <span style={{ display: "block", textAlign: "center", border: `1px solid ${WHISPER}`, padding: "13px 16px", fontFamily: inter.style.fontFamily, fontSize: "10px", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", color: STONE }}>
        Coming soon
      </span>
    )
  }
  return (
    <a href={href} style={{ display: "block", textAlign: "center", border: `1px solid ${OBSIDIAN}`, background: OBSIDIAN, color: PORCELAIN, padding: "13px 16px", fontFamily: inter.style.fontFamily, fontSize: "10px", fontWeight: 500, letterSpacing: "0.2em", textTransform: "uppercase", textDecoration: "none" }}>
      {children}
    </a>
  )
}

export default async function PresetsAccessPage({ params }: { params: Promise<{ token: string }> }) {
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
    <main className={inter.className} style={{ background: PORCELAIN, color: OBSIDIAN, lineHeight: 1.55 }}>
      {/* WELCOME HERO */}
      <section style={{ position: "relative", width: "100%", height: "clamp(300px, 52vh, 460px)", background: OBSIDIAN }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/presets/access-welcome.jpg" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 32%", opacity: 0.9 }} />
      </section>

      <section style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 8px", textAlign: "center" }}>
        <p style={{ ...eyebrow, marginBottom: 18 }}>The SSELFIE Presets</p>
        <h1 className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(36px, 7vw, 56px)", lineHeight: 1.05, margin: "0 0 16px" }}>
          Welcome in. They&rsquo;re yours.
        </h1>
        <p style={{ fontSize: "15px", color: SMOKE, maxWidth: 440, margin: "0 auto" }}>
          Everything&rsquo;s here, and it takes about two minutes to set up. Let me show you.
        </p>
        <div style={{ display: "inline-block", marginTop: 24, border: `1px solid ${WHISPER}`, padding: "14px 22px" }}>
          <span style={{ ...eyebrow }}>{order.tier === "bundle" ? "Full Collection" : "Single Collection"}</span>
          <span style={{ fontSize: "12px", color: SMOKE, marginLeft: 12 }}>· sent to {order.email}</span>
        </div>
      </section>

      {/* START HERE - setup guide */}
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", border: `1px solid ${WHISPER}`, background: CREAM }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24, padding: "28px 28px" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/presets/access-guide.jpg" alt="" style={{ width: 120, height: 150, objectFit: "cover", flexShrink: 0 }} />
              <div style={{ flex: "1 1 280px" }}>
                <p style={{ ...eyebrow, marginBottom: 10 }}>Start here</p>
                <h2 className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(24px, 4.5vw, 30px)", margin: "0 0 8px" }}>
                  Set up in two minutes.
                </h2>
                <p style={{ fontSize: "14px", color: SMOKE, margin: "0 0 18px", maxWidth: 420 }}>
                  Watch the quick walkthrough and follow along. Phone or desktop, step by step.
                </p>
                <Link href="/presets/setup" style={{ display: "inline-block", border: `1px solid ${OBSIDIAN}`, background: OBSIDIAN, color: PORCELAIN, padding: "13px 28px", fontFamily: inter.style.fontFamily, fontSize: "10px", fontWeight: 500, letterSpacing: "0.28em", textTransform: "uppercase", textDecoration: "none" }}>
                  Open the setup guide
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "8px 24px 16px", textAlign: "center" }}>
        <p style={{ ...eyebrow }}>Your downloads</p>
      </section>
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px 24px" }}>
        {collections.length === 0 ? (
          <div style={{ border: `1px solid ${WHISPER}`, background: CREAM, padding: "40px 28px", textAlign: "center" }}>
            <h2 className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(24px, 5vw, 30px)", margin: "0 0 10px" }}>
              Your collection is on its way.
            </h2>
            <p style={{ fontSize: "14px", color: SMOKE, maxWidth: 480, margin: "0 auto 22px", lineHeight: 1.7 }}>
              Your purchase is active. Sandra&rsquo;s adding the final preset files now, and your download links will appear right here the moment they&rsquo;re live. You&rsquo;ll get an email too.
            </p>
            <a href="mailto:support@sselfie.ai?subject=SSELFIE%20Presets%20access" style={{ display: "inline-block", border: `1px solid ${OBSIDIAN}`, padding: "12px 24px", fontSize: "10px", fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase", color: OBSIDIAN, textDecoration: "none" }}>
              Email support
            </a>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {collections.map(collection => (
              <article key={collection.slug} style={{ border: `1px solid ${WHISPER}`, background: PORCELAIN }}>
                {/* before/after or cover */}
                {collection.beforeImageUrl && collection.afterImageUrl ? (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={collection.beforeImageUrl} alt={`${collection.name} before`} style={{ width: "100%", height: 280, objectFit: "cover" }} />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={collection.afterImageUrl} alt={`${collection.name} after`} style={{ width: "100%", height: 280, objectFit: "cover" }} />
                  </div>
                ) : collection.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={collection.coverImageUrl} alt={collection.name} style={{ width: "100%", height: 300, objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ background: OBSIDIAN, color: PORCELAIN, height: 220, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: inter.style.fontFamily, fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase" }}>
                    <span style={{ opacity: 0.45 }}>{collection.name} · before / after</span>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 20, padding: "26px 28px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: "1 1 280px" }}>
                      <h2 className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(24px, 4.5vw, 30px)", margin: "0 0 6px" }}>
                        {collection.name}
                      </h2>
                      {collection.description ? (
                        <p style={{ fontSize: "14px", color: SMOKE, margin: 0, maxWidth: 460, lineHeight: 1.7 }}>{collection.description}</p>
                      ) : null}
                    </div>
                    <div style={{ display: "grid", gap: 8, minWidth: 200, flex: "0 0 auto" }}>
                      <DownloadLink href={collection.mobileDngUrl}>Mobile .dng</DownloadLink>
                      <DownloadLink href={collection.desktopXmpUrl}>Desktop .xmp</DownloadLink>
                      <DownloadLink href={collection.setupGuideUrl}>Setup guide</DownloadLink>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* FOR BEST RESULTS */}
      <section style={{ background: CREAM, padding: "48px 24px", textAlign: "center" }}>
        <p style={{ ...eyebrow, marginBottom: 12 }}>For best results</p>
        <p className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(20px, 4vw, 26px)", lineHeight: 1.45, margin: "0 auto", maxWidth: 560 }}>
          Start with a clear, well-lit photo. Tap the preset, then nudge the exposure to fit your light. The preset gets you most of the way. You finish it.
        </p>
      </section>

      {/* TAG + SUPPORT */}
      <section style={{ background: OBSIDIAN, color: PORCELAIN, padding: "52px 24px", textAlign: "center" }}>
        <h2 className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(24px, 5vw, 30px)", margin: "0 0 10px" }}>
          Tag me when you post.
        </h2>
        <p style={{ fontSize: "14px", color: "#B4B2A9", margin: "0 0 8px" }}>
          I genuinely love seeing your before and afters. @sandra.social 🤍
        </p>
        <p style={{ fontSize: "13px", color: "#8A8780", margin: 0 }}>
          Stuck on anything? Reply to your delivery email. I read every one.
        </p>
      </section>
    </main>
  )
}
