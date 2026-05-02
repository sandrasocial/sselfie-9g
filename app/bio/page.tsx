import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Sandra Social | SSELFIE Links",
  description:
    "Sandra Social helps women stop hiding and start making money online with their phone, story, and simple first steps.",
}

const primaryLinks = [
  {
    href: "/selfie-guide",
    title: "Get the free selfie guide",
    description: "Start here if you keep hiding because every photo of you feels wrong.",
    featured: true,
  },
  {
    href: "/visibility-suite",
    title: "Show me the first step",
    description: "For when you want to make money online, but everything feels too big.",
    popular: true,
  },
  {
    href: "/join/studio",
    title: "Create with Maya",
    description: "Photos, captions, planning, and the next move when your brain is doing too much.",
  },
  {
    href: "/starter-kit",
    title: "Give me a simple first week",
    description: "A starter path when you need less noise and one place to begin.",
  },
  {
    href: "/work-with-me",
    title: "Work with Sandra",
    description: "For when you want my eyes on what you are building.",
  },
]

const proofPoints = [
  "Built my own brand from scratch with my phone, my story, and simple content.",
  "Grew an audience by teaching women to take better iPhone selfies.",
  "Built digital products, AI tools, and SSELFIE from the ground up.",
]

function PaperTexture({ dark = false }: { dark?: boolean }) {
  return (
    <svg
      aria-hidden
      className={`pointer-events-none absolute inset-0 h-full w-full ${
        dark ? "opacity-[0.055] mix-blend-screen" : "opacity-[0.18] mix-blend-multiply"
      }`}
    >
      <defs>
        <filter id={`bio-noise-${dark ? "dark" : "light"}`} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter={`url(#bio-noise-${dark ? "dark" : "light"})`} />
    </svg>
  )
}

export default function BioPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[color:var(--color-obsidian)] px-4 py-5 text-[color:var(--color-porcelain)] sm:px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--color-stone)_26%,transparent),transparent_42%),linear-gradient(to_bottom,var(--color-obsidian),color-mix(in_srgb,var(--color-obsidian)_92%,var(--color-smoke)))]" />
      <PaperTexture dark />

      <section className="relative z-10 mx-auto flex min-h-[calc(100svh-40px)] w-full max-w-[430px] flex-col">
        <header className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="font-serif text-[17px] font-light uppercase tracking-[0.36em] text-[color:var(--color-porcelain)] [text-shadow:var(--lp-dark)] no-underline"
          >
            SSELFIE
          </Link>
          <Link
            href="/studio"
            className="rounded-full border border-white/18 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-whisper)] no-underline transition-colors hover:bg-white/10"
          >
            Login
          </Link>
        </header>

        <div className="relative overflow-hidden rounded-[32px] border border-white/12 bg-[color:var(--color-smoke)] shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
          <div className="relative aspect-[4/5] min-h-[360px]">
            <Image
              src="/academy/visibility-suite/sandra-hero.png"
              alt="Sandra from SSELFIE"
              fill
              priority
              sizes="430px"
              className="object-cover object-[50%_18%]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,color-mix(in_srgb,var(--color-obsidian)_2%,transparent)_0%,color-mix(in_srgb,var(--color-obsidian)_10%,transparent)_36%,color-mix(in_srgb,var(--color-obsidian)_88%,transparent)_100%)]" />
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5 text-center sm:p-6">
            <p className="eyebrow on-dark mb-3 !tracking-[0.38em]">Sandra Social</p>
            <h1 className="font-serif text-[clamp(42px,12vw,58px)] font-light leading-[0.92] tracking-[-0.045em] text-[color:var(--color-porcelain)] [text-shadow:var(--lp-dark)]">
              Stop hiding.
              <br />
              Start here.
            </h1>
            <p className="mx-auto mt-5 max-w-[310px] text-[14px] leading-7 text-[color:var(--color-whisper)]">
              I help women start making money online with their phone, their story, and a first step that does not feel impossible.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          {primaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center justify-between gap-4 overflow-hidden rounded-[24px] border p-4 no-underline transition-all hover:-translate-y-0.5 ${
                item.featured
                  ? "border-[color:var(--color-porcelain)] bg-[color:var(--color-porcelain)] text-[color:var(--color-obsidian)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-2px_0_rgba(0,0,0,0.22),0_14px_38px_rgba(0,0,0,0.24)]"
                  : item.popular
                    ? "border-[color-mix(in_srgb,var(--color-pearl)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-pearl)_16%,transparent)] text-[color:var(--color-porcelain)] shadow-[0_14px_38px_rgba(0,0,0,0.18)] backdrop-blur-md hover:bg-[color-mix(in_srgb,var(--color-pearl)_20%,transparent)]"
                    : "border-white/12 bg-white/[0.06] text-[color:var(--color-porcelain)] backdrop-blur-md hover:bg-white/[0.09]"
              }`}
            >
              {item.popular && (
                <span className="pointer-events-none absolute inset-0 rounded-[24px] ring-1 ring-inset ring-[color-mix(in_srgb,var(--color-pearl)_32%,transparent)]" />
              )}
              <span className="min-w-0">
                {item.popular && (
                  <span className="mb-2 inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--color-pearl)_28%,transparent)] bg-white/[0.06] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-whisper)]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--color-pearl)] opacity-40" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--color-pearl)]" />
                    </span>
                    Most popular
                  </span>
                )}
                <span
                  className={`block font-serif text-[25px] font-light leading-none tracking-[-0.015em] ${
                    item.featured ? "[text-shadow:var(--lp-cream)]" : "[text-shadow:var(--lp-dark)]"
                  }`}
                >
                  {item.title}
                </span>
                <span
                  className={`mt-2 block text-[12px] leading-5 ${
                    item.featured ? "text-[color:var(--color-smoke)]" : "text-[color:var(--color-whisper)]"
                  }`}
                >
                  {item.description}
                </span>
              </span>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm transition-transform group-hover:translate-x-0.5 ${
                  item.featured ? "border-[color-mix(in_srgb,var(--color-obsidian)_14%,transparent)]" : "border-white/14"
                }`}
                aria-hidden
              >
                &rarr;
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-5 rounded-[26px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-md">
          <p className="eyebrow on-dark mb-4 !tracking-[0.32em]">Why I can help</p>
          <div className="space-y-3">
            {proofPoints.map((point) => (
              <p key={point} className="text-[12px] leading-6 text-[color:var(--color-whisper)]">
                {point}
              </p>
            ))}
          </div>
        </div>

        <footer className="mt-auto pt-6 text-center">
          <p className="mx-auto max-w-[320px] text-[11px] leading-6 text-[color-mix(in_srgb,var(--color-whisper)_72%,transparent)]">
            Built for the woman who knows she wants to begin.
            <br />
            She just does not want to be overwhelmed again.
          </p>
        </footer>
      </section>
    </main>
  )
}
