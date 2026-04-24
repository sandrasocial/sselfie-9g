import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { redirect } from "next/navigation"

import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

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
    <main className={`min-h-screen bg-[#0f0d0b] px-6 py-14 text-[#f4f0e6] md:px-20 md:py-20 ${inter.className}`}>
      <section className="mx-auto max-w-5xl">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[rgba(244,240,230,0.52)]">
          Starter Kit Access
        </p>
        <h1
          className={`${cormorant.className} mt-6 text-[clamp(3rem,7vw,5.3rem)] uppercase`}
          style={{ fontWeight: 300, lineHeight: 0.95, letterSpacing: "-0.04em" }}
        >
          Welcome, {firstName}
        </h1>
        <p className="mt-5 max-w-3xl text-[15px] leading-8 text-[rgba(244,240,230,0.78)]">
          Your Starter Kit lives inside SSELFIE now. Start with the quick win, download your
          presets, and open the guide when you want the fuller method.
        </p>
      </section>

      <section className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
        <article className="border border-[rgba(244,240,230,0.14)] bg-[rgba(175,170,162,0.08)] p-6">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[rgba(244,240,230,0.52)]">
            Start Here
          </p>
          <h2
            className={`${cormorant.className} mt-4 text-3xl uppercase`}
            style={{ fontWeight: 300, lineHeight: 0.98 }}
          >
            Your first quick win
          </h2>
          <ol className="mt-4 space-y-3 text-sm leading-8 text-[rgba(244,240,230,0.78)]">
            <li>Find soft window light and take 10 photos instead of judging the first one.</li>
            <li>Pick the image that already feels closest to you before you edit.</li>
            <li>Use one preset lightly. Stop before the photo stops feeling real.</li>
            <li>Come back tomorrow and do it again with less overthinking.</li>
          </ol>
        </article>

        <article className="border border-[rgba(244,240,230,0.14)] bg-[rgba(175,170,162,0.08)] p-6">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[rgba(244,240,230,0.52)]">
            Downloads
          </p>
          <h2
            className={`${cormorant.className} mt-4 text-3xl uppercase`}
            style={{ fontWeight: 300, lineHeight: 0.98 }}
          >
            Your preset pack
          </h2>
          <p className="mt-4 text-sm leading-8 text-[rgba(244,240,230,0.78)]">
            Keep the edit simple. The goal is a photo that looks like you on a good day, not a
            different person.
          </p>
          {presetDownloadUrl ? (
            <a
              href={presetDownloadUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex rounded-full border border-[rgba(244,240,230,0.18)] bg-[rgba(175,170,162,0.14)] px-5 py-2 text-[11px] uppercase tracking-[0.28em] text-[#f4f0e6] transition-colors hover:bg-[rgba(175,170,162,0.22)]"
            >
              Download Presets
            </a>
          ) : (
            <p className="mt-6 text-xs uppercase tracking-[0.22em] text-[rgba(244,240,230,0.46)]">
              Preset file will appear here when connected.
            </p>
          )}
        </article>

        <article className="border border-[rgba(244,240,230,0.14)] bg-[rgba(175,170,162,0.08)] p-6">
          <p className="text-[10px] uppercase tracking-[0.35em] text-[rgba(244,240,230,0.52)]">
            Guide
          </p>
          <h2
            className={`${cormorant.className} mt-4 text-3xl uppercase`}
            style={{ fontWeight: 300, lineHeight: 0.98 }}
          >
            The fuller method
          </h2>
          <p className="mt-4 text-sm leading-8 text-[rgba(244,240,230,0.78)]">
            The Starter Kit includes the Selfie Guide. Use it when you want the longer framework,
            not just the first result.
          </p>
          <Link
            href="/academy/access/selfie-guide"
            className="mt-6 inline-flex rounded-full border border-[rgba(244,240,230,0.18)] px-5 py-2 text-[11px] uppercase tracking-[0.28em] text-[#f4f0e6] transition-colors hover:bg-[rgba(175,170,162,0.14)]"
          >
            Open The Guide
          </Link>
        </article>
      </section>

      <section className="mx-auto mt-6 max-w-6xl border border-[rgba(244,240,230,0.14)] bg-[rgba(175,170,162,0.08)] p-6 md:p-8">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[rgba(244,240,230,0.52)]">
          Next Step
        </p>
        <h2
          className={`${cormorant.className} mt-4 text-4xl uppercase`}
          style={{ fontWeight: 300, lineHeight: 0.98 }}
        >
          Go deeper with the Masterclass
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-[rgba(244,240,230,0.78)]">
          Starter Kit gives you the first cleaner result. The Masterclass gives you the full
          system for light, pose, edit, post, and repeat.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/masterclass"
            className="inline-flex rounded-full border border-[rgba(244,240,230,0.18)] bg-[rgba(175,170,162,0.14)] px-5 py-2 text-[11px] uppercase tracking-[0.28em] text-[#f4f0e6] transition-colors hover:bg-[rgba(175,170,162,0.22)]"
          >
            See Masterclass
          </Link>
          <Link
            href="/academy"
            className="inline-flex rounded-full border border-[rgba(244,240,230,0.18)] px-5 py-2 text-[11px] uppercase tracking-[0.28em] text-[#f4f0e6] transition-colors hover:bg-[rgba(175,170,162,0.14)]"
          >
            Back To Library
          </Link>
        </div>
      </section>
    </main>
  )
}
