import Image from "next/image"
import type { ReactNode } from "react"

const CAMPAIGN_BASE = "/images/suite-personal-brand-grid"
const BAKED_CAMPAIGN_BASE = "/images/suite-baked-campaign"
const MAYA_AVATAR = "/images/ai-prompts/clean-girl-morning-shot-1.jpg"
const BROLL_VIDEO = "/videos/suite-visibility-broll.mp4"

type BakedCampaignAsset = {
  artwork: string
  alt: string
  copy: string
}

const CAROUSEL_SLIDES: BakedCampaignAsset[] = [
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/carousel-01-editorial-cover.png`,
    alt: "Finished Editorial Cover carousel design with Sandra in a black coat",
    copy: "This was never just about selfies.",
  },
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/carousel-02-top-minimal.png`,
    alt: "Finished Top Minimal carousel design with Sandra in ivory",
    copy: "The photo gets attention.",
  },
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/carousel-03-cutout-editorial.png`,
    alt: "Finished Cutout Editorial carousel design about story and connection",
    copy: "Your story builds connection.",
  },
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/carousel-04-statement.png`,
    alt: "Finished Statement carousel design over a phone and personal-brand grid",
    copy: "Your message builds trust.",
  },
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/carousel-05-lower-third.png`,
    alt: "Finished Lower Third carousel design with Sandra in a black halter dress",
    copy: "A clear offer creates the opportunity to earn.",
  },
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/carousel-06-statement.png`,
    alt: "Finished Statement carousel design over a personal-brand grid on a laptop",
    copy: "Earning your own money creates more choices.",
  },
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/carousel-07-series-cover.png`,
    alt: "Finished Series Cover carousel design with Sandra seated in a black gown",
    copy: "Start with one photo. Build from there.",
  },
]

const STORY_FRAMES: BakedCampaignAsset[] = [
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/story-01-lower-third.png`,
    alt: "Finished Lower Third Story design with Sandra directing a campaign",
    copy: "I didn't start because I felt ready.",
  },
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/story-02-cutout-editorial.png`,
    alt: "Finished Cutout Editorial Story design about starting with a phone",
    copy: "I started with my phone in a tiny bathroom.",
  },
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/story-03-top-minimal.png`,
    alt: "Finished Top Minimal Story design with Sandra in a flowing ivory outfit",
    copy: "One photo became one post.",
  },
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/story-04-statement.png`,
    alt: "Finished Statement Story design with Sandra in a black coat",
    copy: "One post helped me stop hiding.",
  },
  {
    artwork: `${BAKED_CAMPAIGN_BASE}/story-05-editorial-cover.png`,
    alt: "Finished Editorial Cover Story design with Sandra in a black jumpsuit",
    copy: "That is how I started building something of my own.",
  },
]

function MayaHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-full bg-black/[0.04] p-1 ring-1 ring-black/[0.06]">
        <Image
          src={MAYA_AVATAR}
          alt="Maya"
          width={compact ? 30 : 42}
          height={compact ? 30 : 42}
          className={`${compact ? "h-[30px] w-[30px]" : "h-[42px] w-[42px]"} rounded-full object-cover object-[50%_28%]`}
        />
      </div>
      <div className="min-w-0">
        <p
          className={`${compact ? "text-[13px]" : "font-serif text-[21px]"} leading-none text-stone-950`}
        >
          Maya
        </p>
        <p className="mt-1 text-[8px] uppercase tracking-[0.2em] text-stone-500">
          AI creative director
        </p>
      </div>
    </div>
  )
}

function ProgressCard({
  label,
  items,
  compact = false,
}: {
  label: string
  items: string[]
  compact?: boolean
}) {
  return (
    <div
      className={`${compact ? "space-y-2 p-2.5" : "space-y-2.5 p-3.5"} rounded-[15px] bg-white ring-1 ring-black/[0.07] shadow-[0_16px_36px_rgba(24,22,19,0.04)]`}
    >
      <p className="text-[8px] uppercase tracking-[0.2em] text-stone-500">{label}</p>
      {items.map(item => (
        <div
          key={item}
          className={`flex items-center gap-2.5 ${compact ? "text-[8px]" : "text-[10px]"} text-stone-600`}
        >
          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-stone-950 text-[8px] text-white">
            ✓
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

function ChatPanel({
  user,
  maya,
  progressLabel,
  progress,
  resultLabel,
  resultTitle,
  primaryAction,
  secondaryAction,
}: {
  user: string
  maya: string
  progressLabel: string
  progress: string[]
  resultLabel: string
  resultTitle: string
  primaryAction: string
  secondaryAction: string
}) {
  return (
    <aside className="flex h-full flex-col bg-stone-100 p-4 md:p-5">
      <MayaHeader />
      <div className="mt-4 space-y-2.5">
        <p className="ml-auto max-w-[90%] rounded-[17px_17px_5px_17px] bg-stone-900 px-3.5 py-3 text-[10px] leading-[1.55] text-white">
          {user}
        </p>
        <p className="max-w-[94%] rounded-[17px_17px_17px_5px] bg-white px-3.5 py-3 text-[10px] leading-[1.6] text-stone-600 ring-1 ring-black/[0.05]">
          {maya}
        </p>
      </div>
      <div className="mt-3">
        <ProgressCard label={progressLabel} items={progress} />
      </div>
      <div className="mt-3 rounded-[15px] bg-white p-3.5 ring-1 ring-black/[0.07] shadow-[0_16px_36px_rgba(24,22,19,0.04)]">
        <p className="text-[8px] uppercase tracking-[0.2em] text-stone-500">{resultLabel}</p>
        <p className="mt-2 font-serif text-[18px] leading-tight text-stone-800">{resultTitle}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <span className="flex min-h-10 items-center justify-center rounded-full bg-stone-950 px-3 text-center text-[8px] uppercase tracking-[0.12em] text-white">
            {primaryAction}
          </span>
          <span className="flex min-h-10 items-center justify-center rounded-full bg-stone-100 px-3 text-center text-[8px] uppercase tracking-[0.12em] text-stone-600 ring-1 ring-black/[0.08]">
            {secondaryAction}
          </span>
        </div>
      </div>
      <div className="mt-auto pt-3">
        <div className="flex min-h-11 items-center rounded-full bg-white px-4 text-[9px] text-stone-400 ring-1 ring-black/[0.07]">
          Message Maya...
        </div>
        <p className="mt-2 px-1 text-[7px] leading-relaxed text-stone-400">
          Maya can make mistakes. Review before you use it.
        </p>
      </div>
    </aside>
  )
}

function SceneShell({
  scene,
  eyebrow,
  title,
  subtitle,
  children,
  phone,
}: {
  scene: string
  eyebrow: string
  title: string
  subtitle: string
  children: ReactNode
  phone: ReactNode
}) {
  return (
    <article data-mockup-scene={scene} className="space-y-5">
      <div className="max-w-2xl">
        <p className="text-[9px] uppercase tracking-[0.34em] text-stone-500">{eyebrow}</p>
        <h3 className="mt-3 font-serif text-[clamp(30px,4vw,46px)] font-light leading-[1.02] text-stone-950">
          {title}
        </h3>
        <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-stone-600">{subtitle}</p>
      </div>

      <div className="relative rounded-[30px] bg-black/[0.035] p-2 ring-1 ring-black/[0.07] shadow-[0_34px_90px_rgba(29,25,20,0.12)] md:p-3 lg:pr-[246px]">
        <div className="overflow-hidden rounded-[23px] bg-white ring-1 ring-black/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="flex min-h-14 items-center justify-between border-b border-black/[0.07] px-4 md:px-5">
            <p className="font-serif text-[15px] uppercase tracking-[0.23em] text-stone-900">
              SSELFIE SUITE
            </p>
            <span className="rounded-full bg-stone-100 px-3 py-2 text-[8px] uppercase tracking-[0.16em] text-stone-500 ring-1 ring-black/[0.06]">
              Current campaign · Visibility
            </span>
          </div>
          {children}
        </div>
        <div className="mx-auto mt-3 w-[72%] max-w-[310px] lg:absolute lg:bottom-5 lg:right-4 lg:mt-0 lg:w-[214px]">
          {phone}
        </div>
      </div>
    </article>
  )
}

function PhoneShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-[37px] bg-stone-950 p-[7px] shadow-[0_25px_60px_rgba(20,17,14,0.25)]">
      <div className="overflow-hidden rounded-[30px] bg-white">
        <div className="flex h-8 items-end justify-center pb-1.5 text-[8px] font-semibold text-stone-900">
          9:41
        </div>
        <div className="border-y border-black/[0.06] px-3 py-2 text-center font-serif text-[13px] text-stone-800">
          {title}
        </div>
        {children}
      </div>
    </div>
  )
}

function BakedArtwork({ asset, sizes }: { asset: BakedCampaignAsset; sizes: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-stone-200">
      <Image src={asset.artwork} alt={asset.alt} fill sizes={sizes} className="object-cover" />
    </div>
  )
}

function CarouselMockup() {
  const selected = CAROUSEL_SLIDES[0]
  return (
    <SceneShell
      scene="carousel"
      eyebrow="01 · Carousel"
      title="One idea becomes a carousel she can actually use."
      subtitle="Maya keeps the message connected across seven slides, then Sandra reviews every word and visual before using it."
      phone={
        <PhoneShell title="Your carousel">
          <div className="relative aspect-square">
            <BakedArtwork asset={selected} sizes="190px" />
            <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-1 text-[7px] text-white">
              1 / 7
            </span>
          </div>
          <div className="bg-stone-100 p-3">
            <MayaHeader compact />
            <p className="mt-2.5 rounded-[13px] bg-white p-2.5 text-[8px] leading-relaxed text-stone-600 ring-1 ring-black/[0.06]">
              Your carousel is ready to review.
            </p>
            <p className="mt-2 text-center text-[7px] uppercase tracking-[0.16em] text-stone-500">
              Swipe to see all seven slides
            </p>
          </div>
        </PhoneShell>
      }
    >
      <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(250px,0.6fr)]">
        <div className="min-w-0 bg-stone-50 p-3 md:p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-serif text-[24px] leading-none text-stone-800">Your carousel</p>
              <p className="mt-2 text-[8px] uppercase tracking-[0.17em] text-stone-500">
                7 connected slides · review before you use
              </p>
            </div>
            <span className="hidden rounded-full bg-white px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-stone-500 ring-1 ring-black/[0.07] sm:block">
              View all slides
            </span>
          </div>
          <div className="space-y-3 md:grid md:grid-cols-[minmax(0,1fr)_92px] md:gap-2.5 md:space-y-0">
            <div className="relative aspect-square overflow-hidden rounded-[18px] ring-1 ring-black/[0.08] shadow-[0_24px_50px_rgba(28,24,19,0.12)]">
              <BakedArtwork
                asset={selected}
                sizes="(min-width: 1024px) 430px, (min-width: 768px) 52vw, 92vw"
              />
            </div>
            <div className="hidden content-start gap-2 md:grid">
              {CAROUSEL_SLIDES.slice(1).map((slide, index) => (
                <div
                  key={slide.copy}
                  className="relative aspect-square overflow-hidden rounded-[9px] ring-1 ring-black/[0.08]"
                >
                  <BakedArtwork asset={slide} sizes="92px" />
                  <span className="absolute left-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white/90 px-1 text-[7px] text-stone-600">
                    {index + 2}
                  </span>
                </div>
              ))}
            </div>
            <div
              aria-label="Carousel slide previews"
              className="-mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-2 md:hidden"
            >
              {CAROUSEL_SLIDES.map((slide, index) => (
                <div
                  key={slide.copy}
                  className="relative aspect-square w-[78px] shrink-0 snap-start overflow-hidden rounded-[9px] ring-1 ring-black/[0.08]"
                >
                  <BakedArtwork asset={slide} sizes="78px" />
                  <span className="absolute left-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white/90 px-1 text-[7px] text-stone-600">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <ChatPanel
          user="I want to explain why this was never just about selfies."
          maya="I pulled one clear story from that idea and built seven slides around it. I kept the words simple and used your black-and-ivory direction. Review anything you want to change."
          progressLabel="Carousel"
          progress={["Direction ready", "Seven slides written", "All seven slides ready"]}
          resultLabel="Carousel ready"
          resultTitle="This was never just about selfies."
          primaryAction="View all slides"
          secondaryAction="Change words"
        />
      </div>
    </SceneShell>
  )
}

function StoriesMockup() {
  const selected = STORY_FRAMES[0]
  return (
    <SceneShell
      scene="stories"
      eyebrow="02 · Stories"
      title="The same idea becomes more personal in Stories."
      subtitle="Maya uses Sandra's real story, keeps each frame short and makes the sequence feel connected instead of generic."
      phone={
        <PhoneShell title="Your Stories">
          <div className="relative aspect-[9/16]">
            <BakedArtwork asset={selected} sizes="190px" />
            <div className="absolute inset-x-3 top-3 grid grid-cols-5 gap-1">
              {STORY_FRAMES.map((frame, index) => (
                <span
                  key={frame.copy}
                  className={`h-[2px] rounded-full ${index === 0 ? "bg-white" : "bg-white/45"}`}
                />
              ))}
            </div>
          </div>
          <div className="bg-stone-100 p-3">
            <MayaHeader compact />
            <p className="mt-2.5 rounded-[13px] bg-white p-2.5 text-[8px] leading-relaxed text-stone-600 ring-1 ring-black/[0.06]">
              Five Stories are ready to review.
            </p>
          </div>
        </PhoneShell>
      }
    >
      <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(250px,0.6fr)]">
        <div className="min-w-0 bg-stone-50 p-3 md:p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-serif text-[24px] leading-none text-stone-800">
                Your Story sequence
              </p>
              <p className="mt-2 text-[8px] uppercase tracking-[0.17em] text-stone-500">
                5 connected frames · built from your story
              </p>
            </div>
            <span className="hidden rounded-full bg-white px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-stone-500 ring-1 ring-black/[0.07] sm:block">
              Preview sequence
            </span>
          </div>
          <div className="space-y-3 md:grid md:grid-cols-[minmax(0,321px)_80px] md:gap-2.5 md:space-y-0">
            <div className="relative mx-auto aspect-[9/16] w-full max-w-[321px] overflow-hidden rounded-[18px] ring-1 ring-black/[0.08] shadow-[0_24px_50px_rgba(28,24,19,0.12)] md:mx-0">
              <BakedArtwork asset={selected} sizes="(min-width: 768px) 321px, min(321px, 92vw)" />
            </div>
            <div className="hidden content-start gap-2 md:grid">
              {STORY_FRAMES.slice(1).map((frame, index) => (
                <div
                  key={frame.copy}
                  className="relative aspect-[9/16] overflow-hidden rounded-[9px] ring-1 ring-black/[0.08]"
                >
                  <BakedArtwork asset={frame} sizes="80px" />
                  <span className="absolute left-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white/90 px-1 text-[7px] text-stone-600">
                    {index + 2}
                  </span>
                </div>
              ))}
            </div>
            <div
              aria-label="Story frame previews"
              className="-mx-3 flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-2 md:hidden"
            >
              {STORY_FRAMES.map((frame, index) => (
                <div
                  key={frame.copy}
                  className="relative aspect-[9/16] w-[72px] shrink-0 snap-start overflow-hidden rounded-[9px] ring-1 ring-black/[0.08]"
                >
                  <BakedArtwork asset={frame} sizes="72px" />
                  <span className="absolute left-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white/90 px-1 text-[7px] text-stone-600">
                    {index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <ChatPanel
          user="Yes. Make it more personal and less like a lesson."
          maya="I used the part of your story you have already shared with me. Five short frames. Personal, but still simple. Nothing generic added."
          progressLabel="Stories"
          progress={["Story direction ready", "Five frames written", "All five frames ready"]}
          resultLabel="Stories ready"
          resultTitle="Five connected moments from your real story."
          primaryAction="View all slides"
          secondaryAction="Change frame 3"
        />
      </div>
    </SceneShell>
  )
}

function MotionMockup() {
  return (
    <SceneShell
      scene="motion"
      eyebrow="03 · Motion"
      title="One finished image becomes a short B-roll clip."
      subtitle="Maya keeps the movement quiet and believable. It is a real photo-to-motion result, shown exactly as the product creates it."
      phone={
        <PhoneShell title="Your B-roll">
          <div className="relative aspect-[9/16] overflow-hidden bg-black">
            <video
              src={BROLL_VIDEO}
              poster={`${CAMPAIGN_BASE}/post-01-founder-black.jpg`}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Sandra's personal-brand image animated into a short B-roll clip"
              className="h-full w-full object-cover object-[50%_28%]"
            />
            <span className="absolute bottom-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-[9px] text-white">
              Ⅱ
            </span>
          </div>
          <div className="bg-stone-100 p-3">
            <MayaHeader compact />
            <p className="mt-2.5 rounded-[13px] bg-white p-2.5 text-[8px] leading-relaxed text-stone-600 ring-1 ring-black/[0.06]">
              Your B-roll clip is ready to download.
            </p>
          </div>
        </PhoneShell>
      }
    >
      <div className="grid md:grid-cols-[minmax(0,1.4fr)_minmax(250px,0.6fr)]">
        <div className="min-w-0 bg-stone-50 p-3 md:p-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="font-serif text-[24px] leading-none text-stone-800">
                Your image in motion
              </p>
              <p className="mt-2 text-[8px] uppercase tracking-[0.17em] text-stone-500">
                One image · one short B-roll clip
              </p>
            </div>
            <span className="hidden rounded-full bg-white px-3 py-2 text-[8px] uppercase tracking-[0.14em] text-stone-500 ring-1 ring-black/[0.07] sm:block">
              Saved to your videos
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-2 text-[7px] uppercase tracking-[0.2em] text-stone-500">
                Source image
              </p>
              <div className="relative aspect-[9/16] overflow-hidden rounded-[17px] ring-1 ring-black/[0.08]">
                <Image
                  src={`${CAMPAIGN_BASE}/post-01-founder-black.jpg`}
                  alt="Source image of Sandra in a black coat holding coffee"
                  fill
                  sizes="(min-width: 1024px) 260px, 42vw"
                  className="object-cover object-[50%_28%]"
                />
              </div>
            </div>
            <div>
              <p className="mb-2 text-[7px] uppercase tracking-[0.2em] text-stone-500">
                B-roll result
              </p>
              <div className="relative aspect-[9/16] overflow-hidden rounded-[17px] bg-black ring-1 ring-black/[0.08] shadow-[0_24px_50px_rgba(28,24,19,0.12)]">
                <video
                  src={BROLL_VIDEO}
                  poster={`${CAMPAIGN_BASE}/post-01-founder-black.jpg`}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Short motion result created from Sandra's approved campaign image"
                  className="h-full w-full object-cover object-[50%_28%]"
                />
                <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-[10px] text-white">
                  Ⅱ
                </span>
              </div>
            </div>
          </div>
        </div>
        <ChatPanel
          user="Can you make this image move without making it feel fake?"
          maya="Yes. I will keep it subtle. A slow camera move, natural fabric movement and no change to your face."
          progressLabel="Motion"
          progress={["Source image ready", "Motion direction ready", "Video saved"]}
          resultLabel="Saved to your videos"
          resultTitle="A quiet B-roll clip that still feels like you."
          primaryAction="Download video"
          secondaryAction="Create Stories"
        />
      </div>
    </SceneShell>
  )
}

export function SuiteMultiFormatWalkthrough() {
  return (
    <div className="mf mt-20 space-y-20 md:mt-28 md:space-y-28">
      <div className="max-w-3xl">
        <p className="text-[9px] uppercase tracking-[0.36em] text-stone-500">
          One connected campaign
        </p>
        <h2 className="mt-4 font-serif text-[clamp(34px,5vw,56px)] font-light leading-[1.02] text-stone-950">
          One idea becomes content you can actually use.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-[1.75] text-stone-600">
          Maya keeps the direction with you, then helps you move from one idea into a carousel,
          Stories and a short B-roll clip without starting from a blank page every time.
        </p>
      </div>
      <CarouselMockup />
      <StoriesMockup />
      <MotionMockup />
      <p className="text-center text-[9px] leading-relaxed tracking-[0.05em] text-stone-500">
        Illustrated walkthrough of the current Maya flow. The exact screen keeps improving.
      </p>
    </div>
  )
}
