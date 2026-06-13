"use client"

type AdminToolShoot = {
  id: number
  title: string
  status?: string
  approvedShotCount?: number
  heroImageUrl?: string | null
}

type AdminToolSlide = {
  index: number
  kind?: string
  role?: string
  title: string
}

export type AdminContentToolResult =
  | {
      kind: "sources"
      format?: string | null
      shoots: AdminToolShoot[]
    }
  | {
      kind: "carousel"
      deck: {
        id: number
        title: string
        status: string
        caption: string
        sourceShootId?: number | null
        sourceShootTitle?: string | null
        slides: AdminToolSlide[]
      }
      sourceShoot?: AdminToolShoot | null
    }
  | {
      kind: "story"
      sequence: {
        id: number
        title: string
        status: string
        sourceShootId?: number | null
        sourceShootTitle?: string | null
        slides: AdminToolSlide[]
      }
      sourceShoot?: AdminToolShoot | null
    }
  | {
      kind: "error"
      tool?: string
      message: string
      shoots?: AdminToolShoot[]
    }

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#0D0E10] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white">
      {children}
    </span>
  )
}

function SourceShoot({ shoot }: { shoot?: AdminToolShoot | null }) {
  if (!shoot) return null
  return (
    <div className="mt-3 flex items-center gap-3 rounded-[6px] border border-[#C5C6C8]/50 bg-white p-2.5">
      {shoot.heroImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shoot.heroImageUrl} alt="" className="h-14 w-11 rounded-[4px] object-cover" loading="lazy" />
      ) : (
        <div className="h-14 w-11 rounded-[4px] bg-[#ECEDED]" />
      )}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#818283]">Source shoot</p>
        <p className="truncate text-[13px] font-medium text-[#0D0E10]">{shoot.title}</p>
        <p className="text-[12px] text-[#818283]">{shoot.approvedShotCount ?? 0} approved shots</p>
      </div>
    </div>
  )
}

function SlidesList({ slides }: { slides: AdminToolSlide[] }) {
  return (
    <div className="mt-3 space-y-1.5">
      {slides.slice(0, 8).map((slide) => (
        <div key={slide.index} className="rounded-[4px] bg-white px-3 py-2 text-[12px] text-[#4F5052]">
          <span className="text-[#818283]">
            {slide.index + 1}. {slide.kind || slide.role || "slide"} ·{" "}
          </span>
          {slide.title}
        </div>
      ))}
    </div>
  )
}

function SourcesCard({ shoots }: { shoots: AdminToolShoot[] }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Badge>Ready shoots</Badge>
        <span className="text-[12px] text-[#818283]">{shoots.length} available</span>
      </div>
      <div className="mt-3 space-y-2">
        {shoots.length > 0 ? (
          shoots.map((shoot) => <SourceShoot key={shoot.id} shoot={shoot} />)
        ) : (
          <p className="text-[13px] leading-relaxed text-[#4F5052]">
            Approve at least 2 rendered shots in Shoot Studio, then Maya can make carousels and
            story sequences from that shoot.
          </p>
        )}
      </div>
    </>
  )
}

function CarouselCard({ result }: { result: Extract<AdminContentToolResult, { kind: "carousel" }> }) {
  const deck = result.deck
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Carousel draft</Badge>
        <span className="text-[12px] text-[#818283]">{deck.slides.length} slides</span>
      </div>
      <h3 className="mt-3 font-serif text-[21px] font-light leading-tight text-[#0D0E10]">{deck.title}</h3>
      <SourceShoot shoot={result.sourceShoot} />
      <SlidesList slides={deck.slides} />
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`/api/admin/content-kit/render/${deck.id}/0?format=cover`}
          className="rounded-[4px] bg-[#0D0E10] px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white"
        >
          Download cover
        </a>
        {deck.slides.slice(0, 3).map((slide) => (
          <a
            key={slide.index}
            href={`/api/admin/content-kit/render/${deck.id}/${slide.index}`}
            className="rounded-[4px] border border-[#C5C6C8]/70 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#4F5052]"
          >
            Slide {slide.index + 1}
          </a>
        ))}
      </div>
      {deck.caption && (
        <details className="mt-3 rounded-[6px] bg-white px-3 py-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-[#818283]">
            Caption
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-[#4F5052]">{deck.caption}</p>
        </details>
      )}
    </>
  )
}

function StoryCard({ result }: { result: Extract<AdminContentToolResult, { kind: "story" }> }) {
  const sequence = result.sequence
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge>Story sequence</Badge>
        <span className="text-[12px] text-[#818283]">{sequence.slides.length} slides</span>
      </div>
      <h3 className="mt-3 font-serif text-[21px] font-light leading-tight text-[#0D0E10]">{sequence.title}</h3>
      <SourceShoot shoot={result.sourceShoot} />
      <SlidesList slides={sequence.slides} />
      <div className="mt-4 flex flex-wrap gap-2">
        {sequence.slides.slice(0, 4).map((slide) => (
          <a
            key={slide.index}
            href={`/api/admin/content-kit/story/${sequence.id}/${slide.index}`}
            className="rounded-[4px] border border-[#C5C6C8]/70 bg-white px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-[#4F5052]"
          >
            Story {slide.index + 1}
          </a>
        ))}
      </div>
    </>
  )
}

export function AdminContentToolCard({ result }: { result: AdminContentToolResult }) {
  return (
    <div className="rounded-[8px] border border-[#C5C6C8]/70 bg-[#F1F2F2] p-4">
      {result.kind === "sources" && <SourcesCard shoots={result.shoots} />}
      {result.kind === "carousel" && <CarouselCard result={result} />}
      {result.kind === "story" && <StoryCard result={result} />}
      {result.kind === "error" && (
        <>
          <Badge>{result.tool || "Tool"} needs setup</Badge>
          <p className="mt-3 text-[13px] leading-relaxed text-[#4F5052]">{result.message}</p>
          {Array.isArray(result.shoots) && result.shoots.length > 0 && <SourcesCard shoots={result.shoots} />}
        </>
      )}
    </div>
  )
}
