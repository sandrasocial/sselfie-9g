import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { redirect } from "next/navigation"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500", "600"],
})

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  ink: "#0F0D0B",
  inkSoft: "#1B1713",
  inkLift: "#241F19",
  cream: "#EDE9E2",
  creamWarm: "#F4F0E6",
  creamDeep: "#D9D3C8",
  stone: "#C4B5A0",
  onCream: "#0F0D0B",
  onCreamSub: "#3D3830",
  muted: "#7A6F63",
  div: "rgba(15,13,11,0.10)",
  divStrong: "rgba(15,13,11,0.18)",
}

const LP =
  "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)"
const LP_CREAM =
  "1px 2px 3px rgba(255,255,255,0.88), -1px -1px 2px rgba(60,50,38,0.09)"

const sevenDayStarter = [
  {
    day: "01",
    title: "Choose one photo",
    body: "Find soft window light. Take 10 photos. Keep the one that already feels like you.",
  },
  {
    day: "02",
    title: "Make the edit simple",
    body: "Use one preset lightly. Stop before the photo stops feeling real.",
  },
  {
    day: "03",
    title: "Write the honest caption",
    body: "Use one sentence: this is what I am building, learning, changing, or choosing now.",
  },
  {
    day: "04",
    title: "Post the proof",
    body: "Share what you are working on and one small detail that makes it real.",
  },
  {
    day: "05",
    title: "Tell the story",
    body: "Share why this matters to you. Keep it specific and human.",
  },
  {
    day: "06",
    title: "Teach one thing",
    body: "Turn one lesson from the Selfie Guide into a useful post or Story.",
  },
  {
    day: "07",
    title: "Invite the next step",
    body: "Ask people to reply, save the post, or tell you what they want help with next.",
  },
]

export default async function AcademyStarterKitAccessPage() {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/academy/access/starter-kit")}`)
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    redirect(`/auth/login?redirect=${encodeURIComponent("/academy/access/starter-kit")}`)
  }

  const entitlementState = await getAcademyEntitlementState(String(neonUser.id))
  if (!entitlementState.accessibleProductIds.includes("starter_kit")) {
    redirect("/starter-kit")
  }

  await logAnalyticsEvent({
    eventName: "starter_kit_access_opened",
    userId: String(neonUser.id),
    path: "/academy/access/starter-kit",
    properties: {
      source: "academy_access_page",
      has_selfie_guide_access: entitlementState.accessibleProductIds.includes("selfie_guide"),
    },
  })

  const presetDownloadUrl =
    process.env.STARTER_KIT_PRESET_DOWNLOAD_URL ||
    process.env.SELFIE_GUIDE_PRESET_DOWNLOAD_URL ||
    null
  const deliverables = [
    {
      label: "Selfie Guide access",
      status: true,
      detail: "Connected inside SSELFIE.",
    },
    {
      label: "Preset download",
      status: Boolean(presetDownloadUrl),
      detail: presetDownloadUrl ? "Download link is connected." : "Missing file or env download URL.",
    },
    {
      label: "7-day content starter",
      status: true,
      detail: "Available below as an in-app starter.",
    },
    {
      label: "Printable PDF",
      status: false,
      detail: "Not found in the repo yet.",
    },
  ]
  const displayName =
    (neonUser as { display_name?: string | null }).display_name || authUser.email.split("@")[0]
  const firstName = displayName.split(" ")[0]?.toUpperCase() || "FRIEND"

  return (
    <main
      className={`min-h-screen ${inter.className}`}
      style={{ background: C.cream, color: C.onCream }}
    >
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="px-6 py-14 md:px-20 md:py-20"
        style={{ borderBottom: `1px solid ${C.div}` }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.5em]"
          style={{ color: C.muted, fontWeight: 600 }}
        >
          Starter Kit Access
        </p>
        <h1
          className={`${cormorant.className} mt-6 uppercase`}
          style={{
            fontWeight: 300,
            fontSize: "clamp(36px, 7vw, 70px)",
            lineHeight: 1.03,
            letterSpacing: "-0.02em",
            textShadow: LP_CREAM,
          }}
        >
          Welcome,
          <br />
          {firstName}
        </h1>
        <p
          className="mt-6 max-w-2xl text-[15px] leading-[1.78]"
          style={{ color: C.onCreamSub, fontWeight: 400 }}
        >
          Your Starter Kit lives inside SSELFIE now. Start with one cleaner selfie, download your
          files if they are connected, then turn that photo into your first week of content.
        </p>
      </section>

      {/* ─── Content cards ────────────────────────────────────────────────── */}
      <section className="space-y-10 px-6 py-12 md:px-20 md:py-16">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
          {/* Start here */}
          <article
            className="p-8 md:p-10"
            style={{ background: C.creamWarm, border: `1px solid ${C.divStrong}` }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.5em]"
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Start Here
            </p>
            <h2
              className={`${cormorant.className} mt-5 uppercase`}
              style={{
                fontWeight: 300,
                fontSize: "clamp(30px, 5vw, 54px)",
                lineHeight: 1.04,
                textShadow: LP_CREAM,
              }}
            >
              Your first photo to post
            </h2>
            <ol
              className="mt-6 grid gap-3 text-[14px] leading-[1.72] md:grid-cols-2"
              style={{ color: C.onCreamSub, fontWeight: 400 }}
            >
              <li>Find soft window light. Take 10 photos instead of judging the first one.</li>
              <li>Pick the image that already feels closest to you before you edit.</li>
              <li>Use one preset lightly. Stop before the photo stops feeling real.</li>
              <li>Write one simple caption: “This is what I am building next.”</li>
            </ol>
          </article>

          <aside
            className="p-7"
            style={{ border: `1px solid ${C.divStrong}` }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.5em]"
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Kit Status
            </p>
            <div className="mt-5 space-y-4">
              {deliverables.map((item) => (
                <div
                  key={item.label}
                  className="grid grid-cols-[12px_minmax(0,1fr)] gap-3"
                >
                  <span
                    aria-hidden
                    className="mt-[6px] block h-2 w-2"
                    style={{
                      background: item.status ? C.ink : "transparent",
                      border: `1px solid ${item.status ? C.ink : C.divStrong}`,
                    }}
                  />
                  <div>
                    <p
                      className="text-[12px] uppercase tracking-[0.22em]"
                      style={{ color: C.onCream, fontWeight: 600 }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="mt-1 text-[13px] leading-[1.62]"
                      style={{ color: C.onCreamSub, fontWeight: 400 }}
                    >
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Preset download */}
          <article
            className="p-7"
            style={{ background: C.creamWarm, border: `1px solid ${C.div}` }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.5em]"
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Downloads
            </p>
            <h2
              className={`${cormorant.className} mt-5 uppercase`}
              style={{
                fontWeight: 300,
                fontSize: "clamp(19px, 2.5vw, 26px)",
                lineHeight: 1.18,
                textShadow: LP_CREAM,
              }}
            >
              Your preset pack
            </h2>
            <p
              className="mt-4 text-[14px] leading-[1.72]"
              style={{ color: C.onCreamSub, fontWeight: 400 }}
            >
              Keep the edit simple. The goal is a photo that looks like you on a good day, not a
              different person.
            </p>
            {presetDownloadUrl ? (
              <a
                href={presetDownloadUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-7 inline-flex px-7 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90"
                style={{
                  background: C.cream,
                  color: C.ink,
                  fontWeight: 600,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
                }}
              >
                ↓ Download Presets
              </a>
            ) : (
              <p
                className="mt-7 text-[10px] uppercase tracking-[0.35em]"
                style={{ color: C.muted, fontWeight: 600 }}
              >
                Preset file will appear here when connected.
              </p>
            )}
          </article>

          {/* Selfie guide */}
          <article
            className="p-7"
            style={{ background: C.creamWarm, border: `1px solid ${C.div}` }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.5em]"
              style={{ color: C.muted, fontWeight: 600 }}
            >
              Guide
            </p>
            <h2
              className={`${cormorant.className} mt-5 uppercase`}
              style={{
                fontWeight: 300,
                fontSize: "clamp(19px, 2.5vw, 26px)",
                lineHeight: 1.18,
                textShadow: LP_CREAM,
              }}
            >
              The fuller method
            </h2>
            <p
              className="mt-4 text-[14px] leading-[1.72]"
              style={{ color: C.onCreamSub, fontWeight: 400 }}
            >
              The Starter Kit includes the Selfie Guide. Use it when you want the fuller framework
              for light, angles, confidence, and your 7-day posting challenge.
            </p>
            <Link
              href="/academy/access/selfie-guide"
              className="mt-7 inline-flex text-[11px] uppercase tracking-[0.35em] transition-opacity hover:opacity-70"
              style={{ color: C.ink, fontWeight: 600 }}
            >
              → Open The Guide
            </Link>
          </article>

          <article
            className="p-7"
            style={{ background: C.ink, border: `1px solid ${C.ink}` }}
          >
            <p
              className="text-[10px] uppercase tracking-[0.5em]"
              style={{ color: C.stone, fontWeight: 600 }}
            >
              Printable PDF
            </p>
            <h2
              className={`${cormorant.className} mt-5 uppercase`}
              style={{
                color: C.creamWarm,
                fontWeight: 300,
                fontSize: "clamp(19px, 2.5vw, 26px)",
                lineHeight: 1.18,
                textShadow: LP,
              }}
            >
              Not connected yet
            </h2>
            <p
              className="mt-4 text-[14px] leading-[1.72]"
              style={{ color: "rgba(244,240,230,0.78)", fontWeight: 400 }}
            >
              I could not find a Starter Kit PDF in the project. Add the final PDF file or a
              download URL, and this card can become the printable workbook download.
            </p>
          </article>
        </div>

        <section
          className="p-8 md:p-10"
          style={{ background: C.creamWarm, border: `1px solid ${C.divStrong}` }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.5em]"
            style={{ color: C.muted, fontWeight: 600 }}
          >
            7-Day Content Starter
          </p>
          <h2
            className={`${cormorant.className} mt-5 uppercase`}
            style={{
              fontWeight: 300,
              fontSize: "clamp(28px, 4.5vw, 48px)",
              lineHeight: 1.07,
              letterSpacing: "-0.015em",
              textShadow: LP_CREAM,
            }}
          >
            Turn one photo into a week.
          </h2>
          <div className="mt-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sevenDayStarter.map((step) => (
              <article
                key={step.day}
                className="p-5"
                style={{ border: `1px solid ${C.div}` }}
              >
                <p
                  className={`${cormorant.className}`}
                  style={{
                    color: C.stone,
                    fontSize: "clamp(32px, 5vw, 46px)",
                    lineHeight: 1,
                    fontWeight: 300,
                    textShadow: LP_CREAM,
                  }}
                >
                  {step.day}
                </p>
                <h3
                  className="mt-4 text-[11px] uppercase tracking-[0.28em]"
                  style={{ color: C.onCream, fontWeight: 600 }}
                >
                  {step.title}
                </h3>
                <p
                  className="mt-3 text-[13px] leading-[1.68]"
                  style={{ color: C.onCreamSub, fontWeight: 400 }}
                >
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* ─── Next step ──────────────────────────────────────────────────── */}
        <div
          className="mt-4 p-8 md:p-10"
          style={{ border: `1px solid ${C.divStrong}` }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.5em]"
            style={{ color: C.muted, fontWeight: 600 }}
          >
            Next Step
          </p>
          <h2
            className={`${cormorant.className} mt-5 uppercase`}
            style={{
              fontWeight: 300,
              fontSize: "clamp(28px, 4.5vw, 48px)",
              lineHeight: 1.07,
              letterSpacing: "-0.015em",
              textShadow: LP_CREAM,
            }}
          >
            Build your first week of content
          </h2>
          <p
            className="mt-5 max-w-2xl text-[15px] leading-[1.78]"
            style={{ color: C.onCreamSub, fontWeight: 400 }}
          >
            Starter Kit gives you the first cleaner result. Before you buy anything else, use that
            photo across a simple 7-day rhythm: one proof post, one story, one teaching post, one
            behind-the-scenes moment, and one invitation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/academy/access/selfie-guide"
              className="inline-flex px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90"
              style={{
                background: C.cream,
                color: C.ink,
                fontWeight: 600,
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
              }}
            >
              Open Guide Challenge
            </Link>
            <Link
              href="/masterclass"
              className="inline-flex px-6 py-3 text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-80"
              style={{
                color: C.cream,
                background: C.ink,
                border: `1px solid ${C.ink}`,
                fontWeight: 600,
              }}
            >
              See Masterclass
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
