import Link from "next/link"
import { getVaultMayaPriceDisplay, VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT } from "@/lib/launch/cash-launch-pricing"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Vault Maya — your vault photos, made for you | SSELFIE",
  description:
    "Upload your selfie once, tap any vault look, and Maya makes the photo — still you — in about 30 seconds. New drops every week.",
}

const EXAMPLE_IMAGES = [
  { src: "/images/ai-prompts/mysterious-vogue-shot-1.png", alt: "Vault look: mysterious vogue editorial" },
  { src: "/images/ai-prompts/quiet-luxury-london-shot-1.jpg", alt: "Vault look: quiet luxury London editorial" },
  { src: "/images/ai-prompts/clean-girl-morning-shot-1.jpg", alt: "Vault look: clean girl morning editorial" },
]

export default function VaultMayaOfferPage() {
  const price = getVaultMayaPriceDisplay()
  const founderEnds = new Date(VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT)
  const founderEndsLabel = founderEnds.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  })

  return (
    <main className="min-h-screen bg-[#F8FAFA] text-neutral-900">
      <section className="mx-auto max-w-3xl px-5 pb-10 pt-14 text-center">
        <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">
          The Prompt Vault, made for you
        </p>
        <h1 className="mx-auto mt-3 max-w-xl font-serif text-4xl leading-tight text-neutral-950 sm:text-5xl">
          Maya makes your vault photos now.
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-neutral-600">
          You know the routine: copy a prompt, open ChatGPT, upload your selfie, paste, wait — and
          hope it still looks like you. Maya skips all of that. Upload your selfie once. Tap a look.
          Your photo is ready in about 30 seconds — and it&rsquo;s still you.
        </p>
        <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-2">
          {EXAMPLE_IMAGES.map((image) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image.src}
              src={image.src}
              alt={image.alt}
              className="aspect-[3/4] w-full rounded-md object-cover"
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-500">Vault looks, shown on Sandra</p>
      </section>

      <section className="mx-auto max-w-lg px-5 pb-10">
        <ul className="space-y-3 text-sm leading-relaxed text-neutral-700">
          <li>Every vault collection, ready to tap. No more copy and paste.</li>
          <li>Sandra&rsquo;s new drops, every week. You see them first, ready to wear.</li>
          <li>Your selfie, uploaded once. Maya remembers.</li>
          <li>30 photos a month. Need more? Top up anytime.</li>
          <li>A smart gallery that keeps everything. Save with one tap.</li>
          <li>
            Tell Sandra what to create next — send Maya a message, and your idea can be the next
            drop.
          </li>
        </ul>
        <p className="mt-6 border-l-2 border-neutral-950 pl-4 font-serif text-lg text-neutral-900">
          This is my style, my shoots, my lighting — the looks you bought the vault for, made on you
          by the engine I built for it.
        </p>
      </section>

      <section className="mx-auto max-w-lg px-5 pb-16 text-center">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          {price.flipped ? (
            <>
              <p className="font-serif text-3xl text-neutral-950">$29/month</p>
              <p className="mt-1 text-sm text-neutral-600">30 photos a month. Cancel anytime.</p>
            </>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">
                Founder price · this week only
              </p>
              <p className="mt-2 font-serif text-3xl text-neutral-950">$19/month</p>
              <p className="mt-1 text-sm text-neutral-600">
                Founders keep $19 for as long as they stay. After {founderEndsLabel} it&rsquo;s
                $29/month for new members. 30 photos a month. Cancel anytime.
              </p>
            </>
          )}
          <Link
            href="/checkout/vault-maya?source=vault_maya_offer_page&utm_source=website&utm_medium=offer_page&utm_campaign=vault_maya_launch"
            className="mt-5 inline-block rounded-sm bg-neutral-950 px-8 py-3.5 text-xs uppercase tracking-[0.16em] text-white"
          >
            Start with one selfie
          </Link>
          <p className="mt-4 text-xs text-neutral-500">
            Your face stays your face. Maya doesn&rsquo;t change you — she frames you.
          </p>
        </div>
        <p className="mt-8 text-sm text-neutral-500">
          Want Maya to create from your own ideas, plan your feed, and write your captions?{" "}
          <Link href="/checkout/membership?interval=month&source=vault_maya_offer_footer" className="underline underline-offset-2">
            That&rsquo;s SSELFIE SUITE.
          </Link>
        </p>
      </section>
    </main>
  )
}
