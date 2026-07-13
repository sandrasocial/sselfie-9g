import type { Metadata } from "next"
import Image from "next/image"
import { redirect } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { requireAcademyPageUser } from "@/app/academy/_lib/course-library"
import { BuyerHomeLink } from "@/components/one-selfie/buyer-home-link"
import { getAcademyEntitlementState } from "@/lib/academy-entitlements"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { ensurePresetOrdersSchema } from "@/lib/presets/orders"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Your One Selfie Visibility Bundle · SSELFIE",
  description: "Your simple path from one selfie to photos, a visible brand, and Maya.",
  robots: { index: false, follow: false },
}

type SubscriberRow = {
  access_token: string
  email_tags: string[] | null
}

type PresetOrderRow = {
  access_token: string
}

type CourseRow = {
  id: number
  product_id: string
}

type PassRow = {
  status: string
  trial_ends_at: string | Date | null
}

function courseHref(courses: CourseRow[], productId: string) {
  const course = courses.find(item => item.product_id === productId)
  return course ? `/academy/courses/${course.id}` : "/academy"
}

function passEndLabel(value: string | Date | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Oslo",
  }).format(date)
}

const primaryLink =
  "inline-flex min-h-12 items-center justify-center bg-[#0D0E10] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#282728] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0D0E10]"

const textLink =
  "inline-flex min-h-11 items-center border-b border-[#818283] py-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#282728] transition-colors hover:border-[#0D0E10] hover:text-[#0D0E10] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0D0E10]"

export default async function OneSelfieBundleBuyerHome() {
  const { neonUser } = await requireAcademyPageUser("/academy/access/one-selfie")
  await ensurePresetOrdersSchema()

  const [entitlementState, subscriberRows, presetOrderRows, courseRows, passRows] =
    await Promise.all([
      getAcademyEntitlementState(neonUser.id),
      sql`
        SELECT access_token, email_tags
        FROM freebie_subscribers
        WHERE LOWER(email) = LOWER(${neonUser.email})
          AND access_token IS NOT NULL
          AND 'starter-kit-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
          AND 'prompt-vault-paid' = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      sql`
        SELECT access_token
        FROM preset_orders
        WHERE LOWER(email) = LOWER(${neonUser.email})
          AND tier = 'bundle'
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      sql`
        SELECT id, product_id
        FROM academy_courses
        WHERE product_id IN ('branded_by_sselfie', 'editing_masterclass')
          AND status = 'published'
      `,
      sql`
        SELECT status, trial_ends_at
        FROM subscriptions
        WHERE user_id = ${neonUser.id}
          AND product_type = 'selfie_visibility_bundle_pass'
          AND (is_test_mode = FALSE OR is_test_mode IS NULL)
        ORDER BY created_at DESC
        LIMIT 1
      `,
    ])

  if (!entitlementState.explicitProductIds.includes("selfie_visibility_bundle")) {
    redirect("/one-selfie?access=required")
  }

  const subscriber = (subscriberRows as SubscriberRow[])[0] ?? null
  const presetOrder = (presetOrderRows as PresetOrderRow[])[0] ?? null
  const courses = courseRows as CourseRow[]
  const pass = (passRows as PassRow[])[0] ?? null
  const accessToken = subscriber?.access_token?.trim() || null
  const presetToken = presetOrder?.access_token?.trim() || null
  const starterKitHref = accessToken
    ? `/access/starter-kit/${encodeURIComponent(accessToken)}`
    : null
  const promptVaultHref = accessToken
    ? `/access/prompt-vault/${encodeURIComponent(accessToken)}`
    : null
  const presetsHref = presetToken
    ? `/access/presets/${encodeURIComponent(presetToken)}`
    : null
  const brandedHref = courseHref(courses, "branded_by_sselfie")
  const editingHref = courseHref(courses, "editing_masterclass")
  const passEnds = passEndLabel(pass?.trial_ends_at)
  const hasOngoingSuiteMembership = entitlementState.membershipActive
  const annualUpsellAvailable =
    !hasOngoingSuiteMembership &&
    Boolean(process.env.STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID?.trim())
  const annualUpsellHref =
    "/checkout/membership?interval=year&source=one_selfie_bundle_upsell&utm_source=buyer_home&utm_medium=post_purchase&utm_campaign=one_selfie_visibility_48h&utm_content=annual_suite_upsell&checkout_source=one_selfie_bundle_upsell&buyer_stage=bundle_buyer&cta_keyword=BUNDLE&returnTo=%2Facademy%2Faccess%2Fone-selfie"

  await logAnalyticsEvent({
    eventName: "selfie_visibility_bundle_access_opened",
    userId: neonUser.id,
    path: "/academy/access/one-selfie",
    properties: {
      product_type: "selfie_visibility_bundle",
      has_asset_token: Boolean(accessToken),
      has_preset_token: Boolean(presetToken),
      has_active_pass: pass?.status === "active",
      ongoing_suite_member: hasOngoingSuiteMembership,
    },
  })

  if (annualUpsellAvailable) {
    await logAnalyticsEvent({
      eventName: "selfie_visibility_bundle_annual_upsell_viewed",
      userId: neonUser.id,
      path: "/academy/access/one-selfie",
      properties: {
        product_type: "sselfie_studio_membership_annual",
        source_product: "selfie_visibility_bundle",
        price_eur: 970,
      },
    })
  }

  return (
    <main className={`${inter.className} min-h-screen bg-[#F8FAFA] text-[#0D0E10]`}>
      <header className="flex items-center justify-between border-b border-[#C5C6C8] px-5 py-5 sm:px-10 lg:px-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.38em]">SSELFIE</p>
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#818283]">Your bundle</p>
      </header>

      <section className="grid border-b border-[#C5C6C8] lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.72fr)]">
        <div className="flex flex-col justify-center px-6 py-14 sm:px-10 sm:py-20 lg:px-16 lg:py-24">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#818283]">
            One clear path
          </p>
          <h1
            className={`${cormorant.className} mt-5 max-w-2xl text-[clamp(3.2rem,8vw,6.5rem)] font-light leading-[0.88] tracking-[-0.045em]`}
          >
            Start with
            <br />
            one selfie.
          </h1>
          <p className="mt-7 max-w-lg text-[15px] leading-7 text-[#282728]">
            You do not need to finish everything today. Make the source photo strong first. Then
            follow the four steps below.
          </p>
          <div className="mt-8">
            {starterKitHref ? (
              <BuyerHomeLink
                href={starterKitHref}
                assetId="starter_kit"
                className={primaryLink}
              >
                Start with the Selfie Kit
              </BuyerHomeLink>
            ) : (
              <p className="max-w-md border border-[#C5C6C8] bg-white px-5 py-4 text-sm text-[#282728]">
                Your downloads are finishing their setup. Refresh this page in a moment. If they
                still do not appear, reply to your delivery email.
              </p>
            )}
          </div>
          <p className="mt-5 text-[11px] leading-5 text-[#818283]">
            Lifetime access to the tools and courses. Your SUITE pass includes 200 credits and
            ends automatically{passEnds ? ` on ${passEnds}` : " after 30 days"}. No renewal.
          </p>
        </div>

        <div className="relative min-h-[360px] lg:min-h-[650px]">
          <Image
            src="/images/starter-kit/hero.png"
            alt="Sandra showing how one clear selfie becomes the starting point"
            fill
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover object-center"
            priority
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-14 sm:px-10 sm:py-20 lg:px-16">
        <div className="mb-10 max-w-xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#818283]">
            Your path
          </p>
          <h2 className={`${cormorant.className} mt-3 text-4xl font-light sm:text-5xl`}>
            One step. Then the next.
          </h2>
        </div>

        <div className="border-t border-[#C5C6C8]">
          <article className="grid gap-5 border-b border-[#C5C6C8] py-9 sm:grid-cols-[72px_minmax(0,1fr)_minmax(220px,0.62fr)] sm:items-start">
            <p className={`${cormorant.className} text-3xl font-light text-[#818283]`}>01</p>
            <div>
              <h3 className={`${cormorant.className} text-3xl font-light`}>Start with the selfie</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#282728]">
                Take one clear photo, edit it cleanly, and save the look you want to repeat.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2">
              {starterKitHref ? (
                <BuyerHomeLink href={starterKitHref} assetId="starter_kit" className={textLink}>
                  Open Starter Kit
                </BuyerHomeLink>
              ) : null}
              {presetsHref ? (
                <BuyerHomeLink href={presetsHref} assetId="presets_bundle" className={textLink}>
                  Open all presets
                </BuyerHomeLink>
              ) : null}
            </div>
          </article>

          <article className="grid gap-5 border-b border-[#C5C6C8] py-9 sm:grid-cols-[72px_minmax(0,1fr)_minmax(220px,0.62fr)] sm:items-start">
            <p className={`${cormorant.className} text-3xl font-light text-[#818283]`}>02</p>
            <div>
              <h3 className={`${cormorant.className} text-3xl font-light`}>Make the photos</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#282728]">
                Choose one visual direction from the Vault. Do not hunt for ten ideas. Start with
                the one you would actually post.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2">
              {promptVaultHref ? (
                <BuyerHomeLink href={promptVaultHref} assetId="prompt_vault" className={textLink}>
                  Open Prompt Vault
                </BuyerHomeLink>
              ) : null}
            </div>
          </article>

          <article className="grid gap-5 border-b border-[#C5C6C8] py-9 sm:grid-cols-[72px_minmax(0,1fr)_minmax(220px,0.62fr)] sm:items-start">
            <p className={`${cormorant.className} text-3xl font-light text-[#818283]`}>03</p>
            <div>
              <h3 className={`${cormorant.className} text-3xl font-light`}>
                Build the visible brand
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#282728]">
                Learn how the photo becomes recognizable content, and how to edit without losing
                yourself in the process.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2">
              <BuyerHomeLink href={brandedHref} assetId="branded_by_sselfie" className={textLink}>
                Open Branded by SSELFIE
              </BuyerHomeLink>
              <BuyerHomeLink href={editingHref} assetId="editing_masterclass" className={textLink}>
                Open Editing Masterclass
              </BuyerHomeLink>
            </div>
          </article>

          <article className="grid gap-5 border-b border-[#C5C6C8] py-9 sm:grid-cols-[72px_minmax(0,1fr)_minmax(220px,0.62fr)] sm:items-start">
            <p className={`${cormorant.className} text-3xl font-light text-[#818283]`}>04</p>
            <div>
              <h3 className={`${cormorant.className} text-3xl font-light`}>Keep creating with Maya</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#282728]">
                Your 30-day SUITE pass is the place to turn the direction into photos and content
                you can use. Open Maya and let her guide the next step.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2">
              <BuyerHomeLink href="/app?tab=create" assetId="maya_suite" className={primaryLink}>
                Open Maya
              </BuyerHomeLink>
            </div>
          </article>
        </div>
      </section>

      {hasOngoingSuiteMembership ? (
        <section className="border-t border-[#C5C6C8] bg-white px-6 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto max-w-6xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#818283]">
              Already a SUITE member
            </p>
            <p className={`${cormorant.className} mt-3 max-w-2xl text-3xl font-light`}>
              Your membership already keeps Maya open after this bundle pass. Nothing about your
              current membership changes.
            </p>
          </div>
        </section>
      ) : annualUpsellAvailable ? (
        <section className="border-t border-[#C5C6C8] bg-white px-6 py-12 sm:px-10 lg:px-16">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#818283]">
                Optional next step
              </p>
              <h2 className={`${cormorant.className} mt-3 text-3xl font-light sm:text-4xl`}>
                Want Maya to stay after the 30 days?
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#282728]">
                The standard annual SUITE plan is €970 for one year. It is a separate subscription
                checkout. Your bundle remains yours even if you do not continue.
              </p>
            </div>
            <BuyerHomeLink
              href={annualUpsellHref}
              assetId="annual_suite"
              eventName="selfie_visibility_bundle_annual_upsell_clicked"
              className={textLink}
            >
              See annual SUITE · €970
            </BuyerHomeLink>
          </div>
        </section>
      ) : null}

      <footer className="border-t border-[#C5C6C8] px-6 py-8 text-center text-[11px] text-[#818283] sm:px-10">
        Need help opening anything? Reply to your delivery email or email support@sselfie.ai.
      </footer>
    </main>
  )
}
