import Link from "next/link"
import Image from "next/image"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { redirect } from "next/navigation"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getStarterKitEditingMasterclassLessons } from "@/lib/academy/starter-kit-editing-masterclass"
import { StarterKitEditingMasterclassVideos } from "@/components/academy/starter-kit-editing-masterclass-videos"
import { StarterKitMayaLessonChat } from "@/components/academy/starter-kit-maya-lesson-chat"

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

const starterKitPdfDownloads = [
  {
    label: "Posing Guide",
    title: "Selfie Pose Cheat Sheet",
    detail: "Open the pose guide when you need quick ideas for hands, angles, sitting, standing, and mirror photos.",
    pages: "29 pages",
    href: "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/sselfie-posing-guide.pdf",
    thumbnail:
      "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/thumbnails/sselfie-posing-guide-cover.png",
  },
  {
    label: "Caption Guide",
    title: "Instagram Captions & Content Ideas",
    detail: "Use these prompts when you know you should post, but you do not want to start from a blank page.",
    pages: "26 pages",
    href: "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/sselfie-instagram-captions-content-ideas.pdf",
    thumbnail:
      "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/thumbnails/sselfie-instagram-captions-content-ideas-cover.png",
  },
  {
    label: "Storytelling",
    title: "Selfie Storytelling Captions",
    detail: "Caption starters for connection posts, confidence posts, and personal-brand stories that still sound human.",
    pages: "17 pages",
    href: "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/sselfie-selfie-to-ceo-storytelling-captions.pdf",
    thumbnail:
      "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/academy/starter-kit/thumbnails/sselfie-selfie-to-ceo-storytelling-captions-cover.png",
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

  const editingMasterclassLessons = await getStarterKitEditingMasterclassLessons()

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
      label: "PDF downloads",
      status: true,
      detail: "Three Starter Kit PDFs are connected below.",
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

        <section
          id="starter-kit-pdfs"
          className="p-8 md:p-10"
          style={{ background: C.ink, border: `1px solid ${C.ink}` }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p
                className="text-[10px] uppercase tracking-[0.5em]"
                style={{ color: C.stone, fontWeight: 600 }}
              >
                PDF Library
              </p>
              <h2
                className={`${cormorant.className} mt-5 uppercase`}
                style={{
                  color: C.creamWarm,
                  fontWeight: 300,
                  fontSize: "clamp(30px, 5vw, 54px)",
                  lineHeight: 1.04,
                  textShadow: LP,
                }}
              >
                Download your guides
              </h2>
            </div>
            <p
              className="max-w-md text-[14px] leading-[1.72]"
              style={{ color: "rgba(244,240,230,0.74)", fontWeight: 400 }}
            >
              Open each PDF in a new tab. The cover cards below are the actual front pages, so it
              is easy to find the guide you need.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {starterKitPdfDownloads.map((download) => (
              <a
                key={download.href}
                href={download.href}
                target="_blank"
                rel="noreferrer"
                className="group block transition-opacity hover:opacity-95"
                style={{
                  background: C.cream,
                  color: C.ink,
                  border: "1px solid rgba(244,240,230,0.12)",
                }}
              >
                <div
                  className="relative overflow-hidden"
                  style={{
                    aspectRatio: "4 / 5",
                    background: C.creamWarm,
                    borderBottom: `1px solid ${C.divStrong}`,
                  }}
                >
                  <Image
                    src={download.thumbnail}
                    alt={`${download.title} cover`}
                    fill
                    sizes="(min-width: 1024px) 30vw, (min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-5">
                  <p
                    className="text-[9px] uppercase tracking-[0.36em]"
                    style={{ color: C.muted, fontWeight: 600 }}
                  >
                    {download.label} / {download.pages}
                  </p>
                  <h3
                    className={`${cormorant.className} mt-3 uppercase`}
                    style={{
                      fontWeight: 300,
                      fontSize: "clamp(22px, 3vw, 31px)",
                      lineHeight: 1.02,
                      textShadow: LP_CREAM,
                    }}
                  >
                    {download.title}
                  </h3>
                  <p
                    className="mt-4 text-[13px] leading-[1.62]"
                    style={{ color: C.onCreamSub, fontWeight: 400 }}
                  >
                    {download.detail}
                  </p>
                  <span
                    className="mt-5 inline-flex text-[10px] uppercase tracking-[0.28em]"
                    style={{ color: C.ink, fontWeight: 600 }}
                  >
                    Open PDF
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <StarterKitEditingMasterclassVideos lessons={editingMasterclassLessons} />

        <StarterKitMayaLessonChat />

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
            <div
              className="mt-5 space-y-2 p-4"
              style={{ border: `1px solid ${C.div}`, background: C.cream }}
            >
              <p
                className="text-[10px] uppercase tracking-[0.32em]"
                style={{ color: C.muted, fontWeight: 600 }}
              >
                Which files should I use?
              </p>
              <p
                className="text-[13px] leading-[1.68]"
                style={{ color: C.onCreamSub, fontWeight: 400 }}
              >
                Editing on your phone? Use the DNG preset files. Editing in Lightroom on desktop?
                Use the XMP preset files.
              </p>
            </div>
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
              PDF Library
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
              Three guides connected
            </h2>
            <p
              className="mt-4 text-[14px] leading-[1.72]"
              style={{ color: "rgba(244,240,230,0.78)", fontWeight: 400 }}
            >
              Your posing guide, caption ideas, and storytelling captions are now ready to open
              from the PDF library above.
            </p>
            <a
              href="#starter-kit-pdfs"
              className="mt-7 inline-flex text-[11px] uppercase tracking-[0.35em] transition-opacity hover:opacity-70"
              style={{ color: C.creamWarm, fontWeight: 600 }}
            >
              View PDFs
            </a>
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
