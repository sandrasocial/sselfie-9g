import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500"] })

export const metadata: Metadata = {
  title: "The SSELFIE Presets · SSELFIE",
  description:
    "The exact filters Sandra uses on every photo. One tap and your photo is done. Phone and desktop Lightroom presets. From $19.",
  openGraph: {
    title: "The SSELFIE Presets · SSELFIE",
    description:
      "The exact filters Sandra uses on every photo. One tap and your photo is done. Phone and desktop. From $19.",
  },
}

// Public preset offer. Checkout and fulfillment are protected by dedicated product tests.
// Forward any incoming UTM/source params (e.g. from the ManyChat DM/comment automations) into the
// checkout link, so a sale attributes to where the visitor actually came from rather than the landing
// page itself. Falls back to the landing's own defaults when no UTMs are present.
type ForwardedAttribution = {
  source: string | null
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmContent: string | null
}

function getForwardedAttribution(sp: Record<string, string | string[] | undefined>): ForwardedAttribution {
  const pick = (key: string) => {
    const value = sp[key]
    const str = Array.isArray(value) ? value[0] : value
    return str && str.trim() ? str.trim() : null
  }
  return {
    source: pick("source"),
    utmSource: pick("utm_source"),
    utmMedium: pick("utm_medium"),
    utmCampaign: pick("utm_campaign"),
    utmContent: pick("utm_content"),
  }
}

function buildCheckoutHref(
  base: { tier: "single" | "bundle"; collection?: string; checkoutSource: string },
  fwd: ForwardedAttribution,
) {
  const params = new URLSearchParams()
  params.set("tier", base.tier)
  if (base.collection) params.set("collection", base.collection)
  params.set("source", fwd.source || "presets_landing")
  params.set("utm_source", fwd.utmSource || "presets_page")
  params.set("utm_medium", fwd.utmMedium || "site")
  params.set("utm_campaign", fwd.utmCampaign || "presets_launch")
  if (fwd.utmContent) params.set("utm_content", fwd.utmContent)
  params.set("checkout_source", base.checkoutSource)
  params.set("buyer_stage", "micro")
  return `/checkout/presets?${params.toString()}`
}

const OBSIDIAN = "#0A0A0A"
const PORCELAIN = "#FFFFFF"
const CREAM = "#F5F5F5"
const SMOKE = "#666666"
const STONE = "#8A8780"
const WHISPER = "#E5E5E5"
const ONDARK = "#B4B2A9"

const eyebrow = {
  fontFamily: inter.style.fontFamily,
  fontSize: "10px",
  letterSpacing: "0.44em",
  textTransform: "uppercase",
  color: STONE,
  margin: 0,
} as const

const btnDark = {
  display: "inline-block",
  background: OBSIDIAN,
  color: PORCELAIN,
  border: `1px solid ${OBSIDIAN}`,
  fontFamily: inter.style.fontFamily,
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  padding: "16px 36px",
  textDecoration: "none",
} as const

const btnOutlineDark = { ...btnDark, background: "transparent", color: PORCELAIN, border: `1px solid ${PORCELAIN}` } as const
const btnLight = { ...btnDark, background: PORCELAIN, color: OBSIDIAN } as const

const COLLECTIONS = [
  { name: "Selfie Glow Up", slug: "selfie-glow-up", desc: "Your everyday selfie, brighter and softer. The flattering one.", before: "/images/presets/collection-selfie-glow-up.jpg", after: "/images/presets/collection-selfie-glow-up-after.jpg" },
  { name: "Scandinavian Light & Dreamy", slug: "scandinavian-light-dreamy", desc: "Soft, pale, airy. That quiet Nordic light.", before: "/images/presets/collection-scandinavian-light-dreamy.jpg", after: "/images/presets/collection-scandinavian-light-dreamy-after.jpg" },
  { name: "White Filter", slug: "white-filter", desc: "Clean and bright. The fresh, minimal white look.", before: "/images/presets/collection-white-filter.jpg", after: "/images/presets/collection-white-filter-after.jpg" },
  { name: "Beige Coffee", slug: "beige-coffee", desc: "Warm beige and caramel. Cozy, café, lived-in.", before: "/images/presets/collection-beige-coffee.jpg", after: "/images/presets/collection-beige-coffee-after.jpg" },
  { name: "Nordic Deep Urban", slug: "nordic-deep-urban", desc: "Cool and editorial. Off-duty model on a grey city day.", before: "/images/presets/collection-nordic-deep-urban.jpg", after: "/images/presets/collection-nordic-deep-urban-after.jpg" },
  { name: "Scandinavian Dark & Moody", slug: "scandinavian-dark-moody", desc: "Deep shadows, warm tones. That noir film mood.", before: "/images/presets/collection-scandinavian-dark-moody.jpg", after: "/images/presets/collection-scandinavian-dark-moody-after.jpg" },
]

export default async function PresetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const fwd = getForwardedAttribution(await searchParams)
  const checkoutBundle = buildCheckoutHref({ tier: "bundle", checkoutSource: "bundle_primary_cta" }, fwd)
  const singleCollectionHref = (slug: string) =>
    buildCheckoutHref({ tier: "single", collection: slug, checkoutSource: "collection_card" }, fwd)
  return (
    <main className={inter.className} style={{ background: PORCELAIN, color: OBSIDIAN, lineHeight: 1.55 }}>
      {/* ── HERO ── */}
      <section style={{ textAlign: "center", padding: "60px 24px 0", maxWidth: 760, margin: "0 auto" }}>
        <p style={{ ...eyebrow, marginBottom: 22 }}>The SSELFIE Presets</p>
        <h1 className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(40px, 8vw, 64px)", lineHeight: 1.04, margin: "0 0 18px" }}>
          Your photos, in one tap.
        </h1>
        <p style={{ fontSize: "15px", color: SMOKE, maxWidth: 380, margin: "0 auto 28px" }}>
          The filters I use on every photo. Tap one, your photo&rsquo;s done.
        </p>
        <Link href={checkoutBundle} style={btnDark}>Get the presets</Link>
      </section>
      <section style={{ position: "relative", width: "100%", height: "clamp(420px, 78vh, 680px)", marginTop: 44, background: OBSIDIAN }}>
        <Image src="/images/presets/hero.jpg" alt="Sandra, Lake Como" fill priority sizes="100vw" style={{ objectFit: "cover", objectPosition: "50% 28%" }} />
      </section>

      {/* ── ITALIC DIVIDER (the real DM quote) ── */}
      <section style={{ background: CREAM, padding: "48px 24px", textAlign: "center" }}>
        <p className={cormorant.className} style={{ fontStyle: "italic", fontWeight: 400, fontSize: "clamp(22px, 4.5vw, 28px)", lineHeight: 1.4, margin: 0, maxWidth: 620, marginInline: "auto" }}>
          &ldquo;What do you edit with?&rdquo; I get that DM every week. This is my answer.
        </p>
      </section>

      {/* ── COLLECTIONS (sequential, full-width) ── */}
      <section id="collections" style={{ scrollMarginTop: 20, textAlign: "center", padding: "54px 24px 8px" }}>
        <p style={{ ...eyebrow, marginBottom: 6 }}>The collections</p>
        <p className={cormorant.className} style={{ fontSize: "16px", color: SMOKE, margin: 0 }}>Each one a full mood. Pick the one you want, or take them all.</p>
      </section>
      <section style={{ padding: "30px 0 10px", maxWidth: 760, margin: "0 auto" }}>
        {COLLECTIONS.map((c) => (
          <div key={c.name}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              <div style={{ position: "relative" }}>
                <Image src={c.before} alt={`${c.name}, before`} width={933} height={1400} sizes="(max-width: 760px) 50vw, 380px" style={{ width: "100%", height: "auto", display: "block" }} />
                <span style={{ position: "absolute", top: 12, left: 12, background: "rgba(10,10,10,0.55)", color: PORCELAIN, fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", padding: "5px 10px", fontFamily: inter.style.fontFamily }}>Before</span>
              </div>
              <div style={{ position: "relative" }}>
                <Image src={c.after} alt={`${c.name}, after`} width={932} height={1400} sizes="(max-width: 760px) 50vw, 380px" style={{ width: "100%", height: "auto", display: "block" }} />
                <span style={{ position: "absolute", top: 12, left: 12, background: "rgba(10,10,10,0.55)", color: PORCELAIN, fontSize: "9px", letterSpacing: "0.24em", textTransform: "uppercase", padding: "5px 10px", fontFamily: inter.style.fontFamily }}>After</span>
              </div>
            </div>
            <div style={{ textAlign: "center", padding: "18px 24px 40px" }}>
              <p className={cormorant.className} style={{ fontWeight: 400, fontSize: "26px", margin: "0 0 4px" }}>{c.name}</p>
              <p style={{ fontSize: "13px", color: SMOKE, margin: "0 0 16px" }}>{c.desc}</p>
              <Link href={singleCollectionHref(c.slug)} style={{ ...btnDark, fontSize: "9px", letterSpacing: "0.26em", padding: "13px 28px" }}>Get this collection · $19</Link>
            </div>
          </div>
        ))}
      </section>

      {/* ── FULL-BLEED LIFESTYLE 1 (moody) ── */}
      <section style={{ background: OBSIDIAN, padding: "40px 24px", textAlign: "center" }}>
        <Image src="/images/presets/lifestyle-moody.jpg" alt="The SSELFIE look, moody editorial" width={420} height={747} style={{ width: "min(100%, 420px)", height: "auto", display: "inline-block" }} />
      </section>

      {/* ── CURATED BY SANDRA ── */}
      <section style={{ background: OBSIDIAN, color: PORCELAIN, padding: "8px 24px 56px", maxWidth: 760, margin: "0 auto" }}>
        <p style={{ ...eyebrow, color: STONE, marginBottom: 18 }}>Curated by Sandra</p>
        <p className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(24px, 5vw, 28px)", lineHeight: 1.3, margin: "0 0 16px" }}>
          I made these because I needed them. Not to sell.
        </p>
        <p style={{ fontSize: "14px", color: ONDARK, maxWidth: 440, margin: 0 }}>
          For years I edited every photo by hand, in the car between school runs. These are that look, saved. The one I use on everything I post. Now they&rsquo;re yours too.
        </p>
      </section>

      {/* ── FULL-BLEED LIFESTYLE 2 (Lake Como) ── */}
      <section style={{ position: "relative", width: "100%", height: "clamp(440px, 82vh, 760px)", background: OBSIDIAN }}>
        <Image src="/images/presets/lifestyle-como.jpg" alt="The SSELFIE look, Lake Como" fill sizes="100vw" style={{ objectFit: "cover", objectPosition: "50% 30%" }} />
      </section>

      {/* ── SOCIAL PROOF: real DM demand (swap for preset reviews when they come in) ── */}
      <section style={{ background: PORCELAIN, padding: "52px 24px", textAlign: "center" }}>
        <p style={{ ...eyebrow, marginBottom: 16 }}>You asked for these</p>
        <p className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(26px, 5.5vw, 32px)", lineHeight: 1.25, margin: "0 auto 10px", maxWidth: 520 }}>
          I showed my presets once. My DMs did the rest.
        </p>
        <p style={{ fontSize: "14px", color: SMOKE, margin: 0 }}>Hundreds of you asked how to get them. So here they are.</p>
      </section>

      {/* ── PRICING ── */}
      <section style={{ padding: "54px 24px", textAlign: "center" }}>
        <p style={{ ...eyebrow, marginBottom: 28 }}>Pick your start</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, maxWidth: 540, margin: "0 auto", textAlign: "left" }}>
          <div style={{ border: `1px solid ${WHISPER}`, padding: "30px 24px" }}>
            <p style={{ ...eyebrow, marginBottom: 14 }}>One collection</p>
            <p className={cormorant.className} style={{ fontWeight: 400, fontSize: "38px", margin: "0 0 4px" }}>$19</p>
            <p style={{ fontSize: "13px", color: SMOKE, margin: "0 0 22px" }}>Choose any one collection above. Phone, desktop, and the setup guide.</p>
            <a href="#collections" style={{ ...btnLight, display: "block", textAlign: "center" }}>Pick a collection</a>
          </div>
          <div style={{ border: `1.5px solid ${OBSIDIAN}`, padding: "30px 24px", position: "relative" }}>
            <p style={{ position: "absolute", top: -11, left: 24, background: OBSIDIAN, color: PORCELAIN, fontSize: "9px", letterSpacing: "0.26em", textTransform: "uppercase", padding: "5px 12px" }}>Most pick this</p>
            <p style={{ ...eyebrow, marginBottom: 14 }}>All of them</p>
            <p className={cormorant.className} style={{ fontWeight: 400, fontSize: "38px", margin: "0 0 4px" }}>$39</p>
            <p style={{ fontSize: "13px", color: SMOKE, margin: "0 0 22px" }}>Every collection, and every new one I add. Yours for good.</p>
            <Link href={checkoutBundle} style={{ ...btnDark, display: "block", textAlign: "center" }}>Get everything</Link>
          </div>
        </div>
      </section>

      {/* ── CLOSE ── */}
      <section style={{ background: OBSIDIAN, color: PORCELAIN, padding: "58px 24px", textAlign: "center" }}>
        <h2 className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(28px, 6vw, 34px)", margin: "0 0 10px" }}>Same you. Better photo.</h2>
        <p style={{ fontSize: "13px", color: ONDARK, margin: "0 0 30px" }}>Tap a filter. Post it. Done.</p>
        <Link href={checkoutBundle} style={btnOutlineDark}>Get the presets</Link>
      </section>
    </main>
  )
}
