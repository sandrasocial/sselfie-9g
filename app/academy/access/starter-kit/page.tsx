import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { redirect } from "next/navigation"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
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
  inkSoft: "#1E1A15",
  cream: "#EDE9E2",
  stone: "#C4B5A0",
  muted: "#7A6F63",
  div: "rgba(237,233,226,0.10)",
}

const LP =
  "0 2px 8px rgba(0,0,0,0.8), 0 -1px 0 rgba(255,255,255,0.06), 1px 1px 0 rgba(0,0,0,0.5)"

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

  const presetDownloadUrl =
    process.env.STARTER_KIT_PRESET_DOWNLOAD_URL ||
    process.env.SELFIE_GUIDE_PRESET_DOWNLOAD_URL ||
    null
  const displayName =
    (neonUser as { display_name?: string | null }).display_name || authUser.email.split("@")[0]
  const firstName = displayName.split(" ")[0]?.toUpperCase() || "FRIEND"

  return (
    <main
      className={`min-h-screen ${inter.className}`}
      style={{ background: C.ink, color: C.cream }}
    >
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="px-6 py-16 md:px-20 md:py-24"
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
            textShadow: LP,
          }}
        >
          Welcome,
          <br />
          {firstName}
        </h1>
        <p
          className="mt-6 max-w-2xl text-[15px] leading-[1.78]"
          style={{ color: C.stone, fontWeight: 300 }}
        >
          Your Starter Kit lives inside SSELFIE now. Start with one cleaner selfie, download your
          presets, then turn it into your first week of content.
        </p>
      </section>

      {/* ─── Content cards ────────────────────────────────────────────────── */}
      <section className="px-6 py-12 md:px-20 md:py-16">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Start here */}
          <article
            className="p-7"
            style={{ background: C.inkSoft, border: `1px solid ${C.div}` }}
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
                fontSize: "clamp(19px, 2.5vw, 26px)",
                lineHeight: 1.18,
                textShadow: LP,
              }}
            >
              Your first photo to post
            </h2>
            <ol
              className="mt-5 space-y-4 text-[14px] leading-[1.72]"
              style={{ color: C.stone, fontWeight: 300 }}
            >
              <li>Find soft window light. Take 10 photos instead of judging the first one.</li>
              <li>Pick the image that already feels closest to you before you edit.</li>
              <li>Use one preset lightly. Stop before the photo stops feeling real.</li>
              <li>Write one simple caption: “This is what I am building next.”</li>
            </ol>
          </article>

          {/* Preset download */}
          <article
            className="p-7"
            style={{ background: C.inkSoft, border: `1px solid ${C.div}` }}
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
                textShadow: LP,
              }}
            >
              Your preset pack
            </h2>
            <p
              className="mt-4 text-[14px] leading-[1.72]"
              style={{ color: C.stone, fontWeight: 300 }}
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
            style={{ background: C.inkSoft, border: `1px solid ${C.div}` }}
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
                textShadow: LP,
              }}
            >
              The fuller method
            </h2>
            <p
              className="mt-4 text-[14px] leading-[1.72]"
              style={{ color: C.stone, fontWeight: 300 }}
            >
              The Starter Kit includes the Selfie Guide. Use it when you want the fuller framework
              for light, angles, confidence, and your 7-day posting challenge.
            </p>
            <Link
              href="/academy/access/selfie-guide"
              className="mt-7 inline-flex text-[11px] uppercase tracking-[0.35em] transition-opacity hover:opacity-70"
              style={{ color: C.cream, fontWeight: 600 }}
            >
              → Open The Guide
            </Link>
          </article>
        </div>

        {/* ─── Next step ──────────────────────────────────────────────────── */}
        <div
          className="mt-4 p-8 md:p-10"
          style={{ border: `1px solid ${C.div}` }}
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
              textShadow: LP,
            }}
          >
            Build your first week of content
          </h2>
          <p
            className="mt-5 max-w-2xl text-[15px] leading-[1.78]"
            style={{ color: C.stone, fontWeight: 300 }}
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
                border: "1px solid rgba(237,233,226,0.22)",
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
