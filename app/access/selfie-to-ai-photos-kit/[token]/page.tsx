import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { sql } from "@/lib/db/client"
import { logAnalyticsEvent } from "@/lib/analytics/events"
import { CopyButton } from "@/components/ai-prompts/copy-button"
import { SelfieAiKitTrackedLink } from "@/components/selfie-ai-photos-kit/tracked-link"
import {
  SELFIE_AI_PHOTOS_KIT_SOURCE,
  SELFIE_AI_PHOTOS_KIT_TAG,
} from "@/lib/freebie/selfie-ai-photos-kit-access"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "Selfie To AI Photos Kit · SSELFIE",
  description: "Your source selfie checklist, AI photo starter prompts, and still-you fix prompts.",
  robots: { index: false, follow: false },
}

const STARTER_PROMPTS = [
  {
    title: "Signature Profile Image",
    use: "Use this when you need one clear first-impression image for your profile, bio, or about page.",
    image: "/images/ai-prompts/clean-girl-morning-shot-10.jpg",
    prompt:
      "Use my uploaded source selfie as the identity reference. Create a realistic editorial profile image that still looks like me. Keep my face shape, eyes, nose, mouth, skin tone, hair color, age, and natural expression recognizable. Use soft natural window light, clean neutral styling, simple makeup, and a calm personal-brand feeling. The image should feel polished but not fake, like a clear version of me on a good day. Vertical 4:5.",
  },
  {
    title: "Editorial Reel Cover",
    use: "Use this when you want a stronger image for Reels, carousels, or a post that needs to stop the scroll.",
    image: "/images/ai-prompts/dark-feminine-cafe-shot-1.jpg",
    prompt:
      "Use my uploaded source selfie as the identity reference. Create a realistic editorial reel cover image that still looks like me. Keep my face, age, hair, and natural features recognizable. Place me in a clean personal-brand scene with stronger composition, simple wardrobe, and enough negative space for text overlay. Make it polished and confident, but not overly perfect or AI-looking. Vertical 4:5, crop safe for Instagram.",
  },
  {
    title: "Lifestyle Brand Image",
    use: "Use this when you want the image to feel more like a real moment for stories, soft selling, or daily content.",
    image: "/images/ai-prompts/clean-girl-morning-shot-9.jpg",
    prompt:
      "Use my uploaded source selfie as the identity reference. Create a realistic lifestyle personal-brand image that still looks like me. Keep my face, body proportions, hair color, skin tone, and age believable. Show me in a natural everyday moment with coffee, laptop, phone, mirror, or a quiet work setting. The image should feel lived-in, simple, and useful for Instagram stories or a soft brand post. Vertical 4:5.",
  },
]

const FIX_PROMPTS = [
  {
    title: "Make it look more like me",
    prompt:
      "Keep the same image direction, lighting, outfit, and background, but make the face look more like my source selfie. Preserve my eyes, nose, mouth, jawline, face shape, skin tone, hairline, hair color, age, and natural expression.",
  },
  {
    title: "Make it less AI",
    prompt:
      "Keep the same visual direction, but make the image more realistic and less AI-generated. Add natural skin texture, believable hair, normal hands, realistic fabric, and a less perfect expression.",
  },
  {
    title: "Stay in the same world",
    prompt:
      "Create another version with the same mood, colors, lighting, styling, and background direction. Do not change the aesthetic. Only improve the pose, crop, and face realism.",
  },
]

const CHECKLIST = [
  "Use one clear selfie where your face is sharp.",
  "Avoid sunglasses, heavy filters, or extreme angles.",
  "Use a photo where your hair, face shape, and skin tone look current.",
  "Upload the selfie first, then paste one prompt.",
  "If the result is close, use a fix prompt before changing the whole idea.",
]

const SOURCE_SELFIE_EXAMPLES = [
  {
    label: "Choose this",
    title: "Clear, front-facing light",
    note: "Your face is sharp, current, and easy to read.",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-front-selfie.png",
  },
  {
    label: "Choose this",
    title: "A gentle three-quarter angle",
    note: "Your features are still visible without an extreme pose.",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-3-4-selfie.png",
  },
  {
    label: "Skip this",
    title: "Heavy filters",
    note: "The AI copies the filter instead of learning what you look like.",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/bad-filtered-selfie.png",
  },
  {
    label: "Skip this",
    title: "Blur or low detail",
    note: "If your features are soft in the source, the result starts as a guess.",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/bad-blurry-selfie.png",
  },
]

type TokenResult = { valid: false } | { valid: true; name?: string | null }

async function validateToken(token: string): Promise<TokenResult> {
  try {
    const rows = await sql`
      SELECT name
      FROM freebie_subscribers
      WHERE access_token = ${token}
        AND (
          source = ${SELFIE_AI_PHOTOS_KIT_SOURCE}
          OR ${SELFIE_AI_PHOTOS_KIT_SOURCE} = ANY(COALESCE(email_tags, ARRAY[]::text[]))
          OR ${SELFIE_AI_PHOTOS_KIT_TAG} = ANY(COALESCE(email_tags, ARRAY[]::text[]))
        )
      LIMIT 1
    `
    if (rows.length === 0) return { valid: false }
    return { valid: true, name: (rows[0].name as string | null) ?? null }
  } catch (error) {
    console.error("[selfie-ai-photos-kit/access] DB error during token validation:", error)
    return { valid: false }
  }
}

export default async function SelfieAiPhotosKitAccessPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await validateToken(token)

  if (!result.valid) {
    return (
      <main
        className={`min-h-screen bg-brand-porcelain px-5 py-16 text-brand-obsidian ${inter.className}`}
      >
        <div className="mx-auto max-w-xl border border-stone-pale/55 bg-white p-8 text-center shadow-2xl">
          <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.28em] text-stone-accent">
            Access link
          </p>
          <h1 className={`mb-4 text-4xl font-light leading-none ${cormorant.className}`}>
            I could not open this Kit link.
          </h1>
          <p className="mb-7 text-sm font-light leading-relaxed text-stone-quarry">
            If you bought the Selfie To AI Photos Kit, use the email from your checkout or recover
            access below.
          </p>
          <Link
            href="/access"
            className="inline-block bg-brand-obsidian px-6 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-white"
          >
            Recover access
          </Link>
        </div>
      </main>
    )
  }

  logAnalyticsEvent({
    eventName: "selfie_ai_photos_kit_access_opened",
    path: "/access/selfie-to-ai-photos-kit/[token]",
    properties: { token_prefix: token.slice(0, 8) },
  }).catch(() => {})

  const firstName = result.name ? result.name.split(" ")[0] : null
  const vaultUrl =
    "/checkout/prompt-vault?source=selfie_ai_photos_kit_access&utm_source=kit_access&utm_medium=access_page&utm_campaign=selfie_ai_photos_kit_vault_bridge&checkout_source=selfie_ai_photos_kit_access&buyer_stage=micro&cta_keyword=PROMPT"
  const suiteUrl =
    "/join/studio?source=selfie_ai_photos_kit_access&utm_source=kit_access&utm_medium=access_page&utm_campaign=selfie_ai_photos_kit_suite_bridge"

  return (
    <main className={`min-h-screen bg-brand-porcelain text-brand-obsidian ${inter.className}`}>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link
          href="/"
          className={`text-xl font-light uppercase tracking-[0.26em] ${cormorant.className}`}
        >
          SSELFIE
        </Link>
        <span className="text-[10px] font-medium uppercase tracking-[0.26em] text-stone-accent">
          AI Photos Kit
        </span>
      </nav>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 pt-6 md:grid-cols-[1fr_0.8fr] md:items-end">
        <div>
          <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.32em] text-stone-accent">
            Selfie To AI Photos Kit
          </p>
          <h1
            className={`max-w-3xl text-5xl font-light leading-[0.95] sm:text-6xl md:text-7xl ${cormorant.className}`}
          >
            {firstName ? `${firstName}, start` : "Start"} with one clear selfie.
          </h1>
          <p className="mt-6 max-w-xl text-base font-light leading-relaxed text-stone-quarry">
            Start with your source selfie checklist. Then copy one prompt at a time until you have
            three photos: one profile image, one reel cover, one lifestyle image. Don&apos;t try to
            do it all at once.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {STARTER_PROMPTS.map(prompt => (
            <div key={prompt.title} className="relative aspect-[3/4] overflow-hidden bg-white">
              <Image
                src={prompt.image}
                alt=""
                fill
                sizes="160px"
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-stone-pale/55 bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[0.8fr_1fr]">
          <div>
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-stone-accent">
              Start here
            </p>
            <h2 className={`text-4xl font-light leading-none ${cormorant.className}`}>
              Your source selfie decides the result.
            </h2>
          </div>
          <div className="grid gap-3">
            {CHECKLIST.map(item => (
              <div
                key={item}
                className="border border-stone-pale/45 bg-brand-porcelain px-4 py-3 text-sm font-light leading-relaxed text-stone-quarry"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="max-w-2xl">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-stone-accent">
            Source selfie examples
          </p>
          <h2 className={`text-4xl font-light leading-none ${cormorant.className}`}>
            Choose this. Skip that.
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-stone-quarry">
            You do not need a professional photo. You need one recent selfie where the AI can
            clearly see you.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SOURCE_SELFIE_EXAMPLES.map(example => (
            <article
              key={example.title}
              className="overflow-hidden border border-stone-pale/55 bg-white"
            >
              <div className="relative aspect-[4/5] bg-brand-porcelain">
                <Image
                  src={example.image}
                  alt={`${example.label}: ${example.title}`}
                  fill
                  sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 22vw"
                  className="object-cover"
                />
              </div>
              <div className="p-4">
                <p className="text-[9px] font-medium uppercase tracking-[0.24em] text-stone-accent">
                  {example.label}
                </p>
                <h3 className={`mt-2 text-2xl font-light leading-none ${cormorant.className}`}>
                  {example.title}
                </h3>
                <p className="mt-3 text-xs font-light leading-relaxed text-stone-quarry">
                  {example.note}
                </p>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 border border-stone-pale/55 bg-white p-6 sm:p-8">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-stone-accent">
            Phone setup
          </p>
          <h2 className={`text-4xl font-light leading-none ${cormorant.className}`}>
            On your phone, in this order.
          </h2>
          <ol className="mt-6 grid gap-3 md:grid-cols-3">
            {[
              ["01", "Open ChatGPT", "Start a new image conversation on your phone."],
              [
                "02",
                "Upload the selfie first",
                "Add the clear source photo before you write anything.",
              ],
              [
                "03",
                "Paste one starter prompt",
                "Run it once, then use a fix prompt if something feels off.",
              ],
            ].map(([number, title, detail]) => (
              <li key={number} className="border border-stone-pale/45 bg-brand-porcelain p-4">
                <span className="text-[9px] font-medium uppercase tracking-[0.24em] text-stone-accent">
                  {number}
                </span>
                <h3 className={`mt-3 text-2xl font-light leading-none ${cormorant.className}`}>
                  {title}
                </h3>
                <p className="mt-3 text-xs font-light leading-relaxed text-stone-quarry">
                  {detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-stone-pale/55 bg-white px-5 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 max-w-2xl">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-stone-accent">
              Starter shoot
            </p>
            <h2 className={`text-4xl font-light leading-none ${cormorant.className}`}>
              Copy one prompt at a time.
            </h2>
            <p className="mt-4 text-sm font-light leading-relaxed text-stone-quarry">
              Upload your selfie to ChatGPT first. Then paste the prompt. If the image is close, fix
              the detail instead of changing the whole direction.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {STARTER_PROMPTS.map(prompt => (
              <article
                key={prompt.title}
                className="border border-stone-pale/55 bg-white shadow-xl"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-brand-porcelain">
                  <Image
                    src={prompt.image}
                    alt={`Example direction for ${prompt.title}`}
                    fill
                    sizes="(max-width: 768px) 90vw, 30vw"
                    className="object-cover object-center"
                  />
                </div>
                <div className="p-5">
                  <h3 className={`text-3xl font-light leading-none ${cormorant.className}`}>
                    {prompt.title}
                  </h3>
                  <p className="mt-3 text-xs font-light leading-relaxed text-stone-quarry">
                    {prompt.use}
                  </p>
                  <div className="mt-5 border border-stone-pale/45 bg-brand-porcelain p-4">
                    <p className="text-xs font-light leading-relaxed text-stone-quarry">
                      {prompt.prompt}
                    </p>
                    <div className="mt-4">
                      <CopyButton
                        text={prompt.prompt}
                        promptTitle={prompt.title}
                        trackEvent="selfie_ai_photos_kit_prompt_copied"
                        trackSource="selfie-ai-photos-kit"
                      />
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-obsidian px-5 py-14 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-stone-pale">
            Fix prompts
          </p>
          <h2 className={`max-w-2xl text-4xl font-light leading-none ${cormorant.className}`}>
            If the image is close, fix it. Do not start over.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {FIX_PROMPTS.map(fix => (
              <article key={fix.title} className="border border-white/15 bg-white/5 p-5">
                <h3 className={`text-2xl font-light ${cormorant.className}`}>{fix.title}</h3>
                <p className="mt-3 text-xs font-light leading-relaxed text-stone-pale">
                  {fix.prompt}
                </p>
                <div className="mt-5">
                  <CopyButton
                    text={fix.prompt}
                    promptTitle={fix.title}
                    trackEvent="selfie_ai_photos_kit_prompt_copied"
                    trackSource="selfie-ai-photos-kit"
                  />
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-14 md:grid-cols-2">
        <div className="border border-stone-pale/55 bg-white p-7 shadow-xl">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-stone-accent">
            Want more visual worlds?
          </p>
          <h2 className={`text-4xl font-light leading-none ${cormorant.className}`}>
            Open the full Prompt Vault.
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-stone-quarry">
            This Kit gets you the first result. The Vault gives you full photoshoot worlds whenever
            you want more.
          </p>
          <SelfieAiKitTrackedLink
            href={vaultUrl}
            event="selfie_ai_photos_kit_vault_upgrade_click"
            className="mt-7 inline-block bg-brand-obsidian px-6 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-white"
          >
            Get the Prompt Vault
          </SelfieAiKitTrackedLink>
        </div>
        <div className="border border-stone-pale/55 bg-white p-7 shadow-xl">
          <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.3em] text-stone-accent">
            Want Maya every month?
          </p>
          <h2 className={`text-4xl font-light leading-none ${cormorant.className}`}>
            Keep creating in SUITE.
          </h2>
          <p className="mt-4 text-sm font-light leading-relaxed text-stone-quarry">
            Use Maya when you want a monthly system for photos, covers, captions, and content
            direction.
          </p>
          <SelfieAiKitTrackedLink
            href={suiteUrl}
            event="selfie_ai_photos_kit_suite_click"
            className="mt-7 inline-block border border-brand-obsidian px-6 py-3 text-[10px] font-medium uppercase tracking-[0.2em] text-brand-obsidian"
          >
            See SSELFIE SUITE
          </SelfieAiKitTrackedLink>
        </div>
      </section>
    </main>
  )
}
