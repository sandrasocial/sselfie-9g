import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCarousel } from "@/lib/content-kit/carousel-generator"
import type { CarouselSlide } from "@/lib/content-kit/types"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

// Design system tokens (docs/SSELFIE_DESIGN_SYSTEM.md)
const OBSIDIAN = "#0A0A0A"
const PORCELAIN = "#FFFFFF"
const SMOKE = "#666666"
const WHISPER = "#E5E5E5"
const STONE = "#8A8780"
const STONE_SOFT = "#D4D1CC"

const WIDTH = 1080
const HEIGHT = 1350
const PAD = 96

let fontCache: Promise<{ serif: Buffer; serifSemi: Buffer; sans: Buffer; sansSemi: Buffer }> | null = null

function loadFonts() {
  if (!fontCache) {
    const dir = join(process.cwd(), "assets", "fonts")
    fontCache = Promise.all([
      readFile(join(dir, "cormorant-garamond-500.ttf")),
      readFile(join(dir, "cormorant-garamond-600.ttf")),
      readFile(join(dir, "inter-400.ttf")),
      readFile(join(dir, "inter-600.ttf")),
    ]).then(([serif, serifSemi, sans, sansSemi]) => ({ serif, serifSemi, sans, sansSemi }))
  }
  return fontCache
}

function Frame({
  dark,
  eyebrow,
  counter,
  children,
}: {
  dark?: boolean
  eyebrow?: string
  counter: string
  children: React.ReactNode
}) {
  const fg = dark ? PORCELAIN : OBSIDIAN
  const muted = dark ? STONE_SOFT : STONE
  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        backgroundColor: dark ? OBSIDIAN : PORCELAIN,
        padding: PAD,
        fontFamily: "Inter",
        color: fg,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: muted,
          }}
        >
          {eyebrow || "SSELFIE"}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: muted, letterSpacing: 4 }}>{counter}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}>
        {children}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: muted,
          }}
        >
          @sandra.social
        </div>
        <div style={{ display: "flex", fontSize: 24, color: muted, letterSpacing: 4 }}>sselfie.ai</div>
      </div>
    </div>
  )
}

/** Photo-first slide: full-bleed image, bottom scrim, white text. The niche-viral
 * format (@prompts.ig pattern) with Sandra's editorial typography on top. */
function PhotoFrame({ slide, counter }: { slide: CarouselSlide; counter: string }) {
  const isHook = slide.kind === "hook"
  const isCta = slide.kind === "cta"
  const isPlainPhoto = slide.kind === "photo"
  const hasText = !isPlainPhoto && Boolean(slide.title)

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        fontFamily: "Inter",
        backgroundColor: OBSIDIAN,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.imageUrl}
        width={WIDTH}
        height={HEIGHT}
        style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          background: hasText
            ? "linear-gradient(180deg, rgba(10,10,10,0.30) 0%, rgba(10,10,10,0.00) 22%, rgba(10,10,10,0.00) 46%, rgba(10,10,10,0.82) 100%)"
            : "linear-gradient(180deg, rgba(10,10,10,0.30) 0%, rgba(10,10,10,0.00) 20%, rgba(10,10,10,0.00) 78%, rgba(10,10,10,0.45) 100%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 72,
          width: WIDTH - 144,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 600,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.92)",
          }}
        >
          {slide.eyebrow || "SSELFIE"}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.8)", letterSpacing: 4 }}>
          {counter}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: 72,
          width: WIDTH - 144,
          display: "flex",
          flexDirection: "column",
          alignItems: isCta ? "center" : "flex-start",
        }}
      >
        {hasText && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: isCta ? "center" : "flex-start",
              marginBottom: 40,
            }}
          >
            <div style={{ display: "flex", width: 110, height: 2, backgroundColor: PORCELAIN, marginBottom: 40 }} />
            <div
              style={{
                display: "flex",
                fontFamily: "Cormorant Garamond",
                fontWeight: 600,
                fontSize: isHook ? 96 : 80,
                lineHeight: 1.06,
                color: PORCELAIN,
                textAlign: isCta ? "center" : "left",
              }}
            >
              {slide.title}
            </div>
            {slide.body ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 32,
                  color: "rgba(255,255,255,0.88)",
                  marginTop: 28,
                  lineHeight: 1.45,
                  textAlign: isCta ? "center" : "left",
                  maxWidth: 820,
                }}
              >
                {slide.body}
              </div>
            ) : null}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: WIDTH - 144,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.92)",
            }}
          >
            @sandra.social
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,0.8)", letterSpacing: 4 }}>
            sselfie.ai
          </div>
        </div>
      </div>
    </div>
  )
}

function SlideContent({ slide }: { slide: CarouselSlide }) {
  if (slide.kind === "hook") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", width: 120, height: 2, backgroundColor: OBSIDIAN, marginBottom: 56 }} />
        <div
          style={{
            display: "flex",
            fontFamily: "Cormorant Garamond",
            fontWeight: 600,
            fontSize: 104,
            lineHeight: 1.08,
            letterSpacing: -1,
          }}
        >
          {slide.title}
        </div>
        {slide.body ? (
          <div style={{ display: "flex", fontSize: 32, color: SMOKE, marginTop: 48, lineHeight: 1.5 }}>
            {slide.body}
          </div>
        ) : null}
      </div>
    )
  }

  if (slide.kind === "step") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Cormorant Garamond",
            fontWeight: 500,
            fontSize: 200,
            lineHeight: 1,
            color: STONE_SOFT,
          }}
        >
          {String(slide.stepNumber ?? "").padStart(2, "0")}
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Cormorant Garamond",
            fontWeight: 600,
            fontSize: 72,
            lineHeight: 1.12,
            marginTop: 24,
          }}
        >
          {slide.title}
        </div>
        {slide.body ? (
          <div style={{ display: "flex", fontSize: 34, color: SMOKE, marginTop: 40, lineHeight: 1.55 }}>
            {slide.body}
          </div>
        ) : null}
      </div>
    )
  }

  if (slide.kind === "list") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Cormorant Garamond",
            fontWeight: 600,
            fontSize: 72,
            lineHeight: 1.12,
          }}
        >
          {slide.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 56 }}>
          {(slide.items || []).map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                paddingTop: 28,
                paddingBottom: 28,
                borderBottom: `1px solid ${WHISPER}`,
              }}
            >
              <div style={{ display: "flex", fontSize: 30, color: STONE, width: 64 }}>{index + 1}</div>
              <div style={{ display: "flex", fontSize: 34, lineHeight: 1.4 }}>{item}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (slide.kind === "quote") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Cormorant Garamond",
            fontWeight: 500,
            fontSize: 84,
            lineHeight: 1.2,
            justifyContent: "center",
          }}
        >
          {`“${slide.title}”`}
        </div>
        {slide.body ? (
          <div
            style={{
              display: "flex",
              fontSize: 28,
              color: STONE_SOFT,
              marginTop: 48,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            {slide.body}
          </div>
        ) : null}
      </div>
    )
  }

  // cta
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ display: "flex", width: 120, height: 2, backgroundColor: PORCELAIN, marginBottom: 56 }} />
      <div
        style={{
          display: "flex",
          fontFamily: "Cormorant Garamond",
          fontWeight: 600,
          fontSize: 92,
          lineHeight: 1.1,
          justifyContent: "center",
        }}
      >
        {slide.title}
      </div>
      {slide.body ? (
        <div
          style={{
            display: "flex",
            fontSize: 34,
            color: STONE_SOFT,
            marginTop: 48,
            lineHeight: 1.5,
            justifyContent: "center",
            maxWidth: 760,
          }}
        >
          {slide.body}
        </div>
      ) : null}
    </div>
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slide: string }> },
) {
  // Admin session, or CRON_SECRET bearer for server-side consumers (emails, automation).
  const bearer = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const hasCronAuth = Boolean(cronSecret && bearer === `Bearer ${cronSecret}`)
  if (!hasCronAuth) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const { id, slide: slideParam } = await params
  const deck = await getCarousel(Number(id))
  const slideIndex = Number(slideParam)
  if (!deck || !Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= deck.slides.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const slide = deck.slides[slideIndex]
  const dark = slide.kind === "quote" || slide.kind === "cta"
  const counter = `${slideIndex + 1} / ${deck.slides.length}`
  const fonts = await loadFonts()

  return new ImageResponse(
    slide.imageUrl ? (
      <PhotoFrame slide={slide} counter={counter} />
    ) : (
      <Frame dark={dark} eyebrow={slide.eyebrow} counter={counter}>
        <SlideContent slide={slide} />
      </Frame>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Cormorant Garamond", data: fonts.serif, weight: 500, style: "normal" },
        { name: "Cormorant Garamond", data: fonts.serifSemi, weight: 600, style: "normal" },
        { name: "Inter", data: fonts.sans, weight: 400, style: "normal" },
        { name: "Inter", data: fonts.sansSemi, weight: 600, style: "normal" },
      ],
      headers: {
        "Content-Disposition": `inline; filename="${deck.slug}-${String(slideIndex + 1).padStart(2, "0")}.png"`,
        "Cache-Control": "private, max-age=300",
      },
    },
  )
}
