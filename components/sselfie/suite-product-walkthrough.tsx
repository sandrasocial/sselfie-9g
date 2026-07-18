import Image from "next/image"

const GRID_ITEMS = [
  {
    src: "/images/suite-personal-brand-grid/post-01-founder-black.jpg",
    alt: "Sandra in a black coat holding coffee",
  },
  {
    src: "/images/suite-personal-brand-grid/post-02-black-jumpsuit.jpg",
    alt: "Sandra in a black jumpsuit in a minimal studio",
  },
  {
    src: "/images/suite-personal-brand-grid/post-03-white-flowing.jpg",
    alt: "Sandra in a flowing ivory wrap dress",
  },
  {
    src: "/images/suite-personal-brand-grid/post-04-creative-director.jpg",
    alt: "Sandra arranging personal-brand photographs at a creative direction table",
  },
  {
    src: "/images/suite-personal-brand-grid/post-05-black-halter.jpg",
    alt: "Sandra wearing a black halter dress against an ivory wall",
  },
  {
    src: "/images/suite-personal-brand-grid/post-06-phone-flatlay.jpg",
    alt: "Phone and earbuds beside a monochrome personal-brand photo grid",
  },
  {
    src: "/images/suite-personal-brand-grid/post-07-white-wrap.jpg",
    alt: "Close portrait of Sandra in an ivory wrap blouse",
  },
  {
    src: "/images/suite-personal-brand-grid/post-08-laptop-grid.jpg",
    alt: "Laptop displaying Sandra's personal-brand content grid",
  },
  {
    src: "/images/suite-personal-brand-grid/post-09-chair-gown.jpg",
    alt: "Sandra seated on a white sculptural chair in a black dress",
  },
]

function GridPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-[2px] bg-stone-200" aria-label="Example nine-post content grid">
      {GRID_ITEMS.map((item, index) => (
        <div
          key={item.src}
          className={`relative aspect-square overflow-hidden bg-stone-100 ${index === 4 ? "ring-2 ring-inset ring-stone-500" : ""}`}
        >
          <Image
            src={item.src}
            alt={item.alt}
            fill
            sizes={compact ? "90px" : "(min-width: 1024px) 220px, 30vw"}
            className="object-cover"
          />
          {index === 4 ? (
            <span className="absolute left-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center rounded bg-white/90 px-1 text-[9px] text-stone-700 shadow-sm">
              5
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function MayaHeader({ small = false }: { small?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/images/ai-prompts/clean-girl-morning-shot-1.jpg"
        alt="Maya"
        width={40}
        height={40}
        className={`${small ? "h-8 w-8" : "h-10 w-10"} rounded-full object-cover object-[50%_28%]`}
      />
      <div className="min-w-0">
        <p className={`${small ? "text-sm" : "font-serif text-xl"} leading-none text-stone-950`}>Maya</p>
        <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-stone-500">AI creative director</p>
      </div>
    </div>
  )
}

function MayaProgress({ compact = false }: { compact?: boolean }) {
  const items = compact
    ? ["Direction ready", "Three posts planned", "Creating post 5"]
    : ["Visual direction ready", "Three posts planned", "Creating post 5"]

  return (
    <div className="space-y-2.5 rounded-xl border border-stone-200 bg-white p-3.5">
      <p className="text-[9px] uppercase tracking-[0.18em] text-stone-500">This week</p>
      {items.map((item, index) => (
        <div key={item} className="flex items-center gap-2.5 text-[10px] text-stone-700">
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
              index < 2 ? "border-stone-400 bg-stone-900 text-white" : "border-stone-400"
            }`}
          >
            {index < 2 ? "✓" : <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-500" />}
          </span>
          <span>{item}</span>
        </div>
      ))}
    </div>
  )
}

export function SuiteProductWalkthrough() {
  return (
    <figure className="mf">
      <div className="relative overflow-hidden rounded-[24px] border border-stone-300 bg-stone-100 p-2 shadow-[0_30px_90px_rgba(20,20,20,0.12)] sm:p-3 lg:pr-[238px]">
        <div className="overflow-hidden rounded-[18px] border border-stone-200 bg-white">
          <div className="flex min-h-12 items-center justify-between border-b border-stone-200 px-4">
            <p className="font-serif text-sm uppercase tracking-[0.22em] text-stone-900 sm:text-base">SSELFIE SUITE</p>
            <div className="rounded-lg border border-stone-200 px-3 py-2 text-[9px] text-stone-600">
              Current grid · Signature
            </div>
          </div>

          <div className="grid md:grid-cols-[minmax(0,1.35fr)_minmax(230px,0.65fr)]">
            <div className="p-3 sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-serif text-lg text-stone-950 sm:text-2xl">Your next nine posts</p>
                  <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-stone-500">Calendar · drag, change, or create</p>
                </div>
                <span className="hidden min-h-11 items-center border border-stone-300 px-3 text-[9px] uppercase tracking-[0.14em] text-stone-600 sm:flex">
                  Preview week
                </span>
              </div>
              <GridPreview />
            </div>

            <aside className="border-t border-stone-200 bg-stone-50 p-4 md:border-l md:border-t-0 sm:p-5">
              <MayaHeader />
              <div className="mt-4 rounded-xl bg-stone-100 p-4 text-xs leading-relaxed text-stone-700">
                I pulled one clear direction from your selfie and planned three posts around it. You can change anything before you create.
              </div>
              <div className="mt-3">
                <MayaProgress />
              </div>
              <div className="mt-3 rounded-xl border border-stone-200 bg-white p-3.5">
                <p className="text-[9px] uppercase tracking-[0.18em] text-stone-500">Post 5</p>
                <p className="mt-2 font-serif text-lg text-stone-900">A warmer edit. A clearer focus.</p>
                <div className="mt-3 flex gap-2">
                  <span className="flex min-h-10 flex-1 items-center justify-center border border-stone-300 px-2 text-[9px] uppercase tracking-[0.12em] text-stone-600">Preview</span>
                  <span className="flex min-h-10 flex-1 items-center justify-center bg-stone-900 px-2 text-[9px] uppercase tracking-[0.12em] text-white">Use this</span>
                </div>
              </div>
              <div className="mt-3 flex min-h-11 items-center rounded-xl border border-stone-200 bg-white px-3 text-[10px] text-stone-400">
                Message Maya…
              </div>
              <p className="mt-2 text-[8px] leading-relaxed text-stone-400">Maya can make mistakes. Review before you use it.</p>
            </aside>
          </div>
        </div>

        <div className="mx-auto mt-3 w-[74%] max-w-[310px] overflow-hidden rounded-[34px] border-[7px] border-stone-900 bg-white shadow-[0_22px_55px_rgba(20,20,20,0.22)] lg:absolute lg:bottom-5 lg:right-4 lg:mt-0 lg:w-[208px]">
          <div className="flex h-8 items-end justify-center pb-1.5 text-[8px] font-semibold text-stone-900">9:41</div>
          <div className="border-y border-stone-200 px-3 py-2 text-center font-serif text-sm text-stone-900">Your week</div>
          <GridPreview compact />
          <div className="border-t border-stone-200 bg-stone-50 p-3">
            <MayaHeader small />
            <p className="mt-3 rounded-xl bg-stone-100 p-3 text-[9px] leading-relaxed text-stone-700">
              Your direction is ready. Want me to create the first post?
            </p>
            <div className="mt-2">
              <MayaProgress compact />
            </div>
          </div>
        </div>
      </div>
      <figcaption className="mt-4 text-center text-[10px] leading-relaxed tracking-[0.04em] text-stone-500">
        Illustrated walkthrough of the current Maya + Calendar flow. The exact screen keeps improving.
      </figcaption>
    </figure>
  )
}
