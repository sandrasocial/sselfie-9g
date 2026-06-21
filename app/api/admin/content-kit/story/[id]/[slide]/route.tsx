import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getStorySequence } from "@/lib/content-kit/story-generator"
import { Arrow, KeywordCircle, Squiggle } from "@/lib/content-kit/accents"
import type { ContentOverlayAsset, StoryLine, StorySlide } from "@/lib/content-kit/types"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

const OBSIDIAN = "#0A0A0A"
const PORCELAIN = "#FFFFFF"
const PEARL = "#F5F5F5"
const SMOKE = "#666666"
const STONE = "#8A8780"

const WIDTH = 1080
const HEIGHT = 1920
// STORY-OVERLAY-01 — Instagram Story safe zones. IG overlays avatar/name/clock up top and the
// reply bar + reactions at the bottom, so critical text must stay inside this band.
const SIDE = 80
const HEADER_TOP = 150
const FOOTER_BOTTOM = 175
const TEXT_BOTTOM = 380 // bottom-zone text anchor: lowest critical baseline clears the reply bar
const TEXT_TOP = 320 // top-zone text anchor: clears the avatar/name row

let fontCache: Promise<{
  serif: Buffer
  serifSemi: Buffer
  sans: Buffer
  sansSemi: Buffer
  hand: Buffer
}> | null = null

function loadFonts() {
  if (!fontCache) {
    const dir = join(process.cwd(), "assets", "fonts")
    fontCache = Promise.all([
      readFile(join(dir, "cormorant-garamond-500.ttf")),
      readFile(join(dir, "cormorant-garamond-600.ttf")),
      readFile(join(dir, "inter-400.ttf")),
      readFile(join(dir, "inter-600.ttf")),
      readFile(join(dir, "caveat-500.ttf")),
    ]).then(([serif, serifSemi, sans, sansSemi, hand]) => ({
      serif,
      serifSemi,
      sans,
      sansSemi,
      hand,
    }))
  }
  return fontCache
}

function OverlayAssets({ assets }: { assets?: ContentOverlayAsset[] }) {
  if (!assets?.length) return null
  return (
    <>
      {assets.slice(0, 2).map((asset, index) => {
        const placement = asset.placement || "middle-right"
        const boxW = placement === "center" ? 620 : 430
        const boxH = placement === "center" ? 520 : 590
        const left = placement === "center" ? (WIDTH - boxW) / 2 : WIDTH - boxW - 72
        const top =
          placement === "top-right"
            ? 280 + index * 40
            : placement === "bottom-right"
              ? HEIGHT - boxH - 360 - index * 40
              : placement === "center"
                ? (HEIGHT - boxH) / 2
                : 590 + index * 40
        return (
          <div
            key={asset.url}
            style={{
              position: "absolute",
              left,
              top,
              width: boxW,
              height: boxH,
              display: "flex",
              overflow: "hidden",
              borderRadius: 34,
              border: "4px solid rgba(255,255,255,0.92)",
              boxShadow: "0 34px 90px rgba(0,0,0,0.42)",
              transform: index % 2 === 0 ? "rotate(1.5deg)" : "rotate(-1.5deg)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} width={boxW} height={boxH} style={{ objectFit: "cover" }} />
          </div>
        )
      })}
    </>
  )
}

function Line({ line, light }: { line: StoryLine; light: boolean }) {
  const leadColor = light ? PORCELAIN : OBSIDIAN
  const supportColor = light ? "rgba(255,255,255,0.88)" : SMOKE

  if (line.size === "keyword") {
    // Auto-fit so PROMPT / KIT / VAULT / PRESETS / START all stay inside the side margins and the
    // circle wraps them. The circle box is sized to the padded text so it never clips.
    const len = Math.max(line.text.length, 1)
    const fontSize = Math.max(96, Math.min(160, Math.floor((808 / len - 8) / 0.55)))
    const circleW = Math.round(len * (0.55 * fontSize + 8) + 112)
    const circleH = fontSize + 36
    return (
      <div
        style={{
          display: "flex",
          position: "relative",
          padding: "18px 56px",
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        <KeywordCircle color={leadColor} w={circleW} h={circleH} />
        <div
          style={{
            display: "flex",
            fontFamily: "Cormorant Garamond",
            fontWeight: 600,
            fontSize,
            lineHeight: 1,
            letterSpacing: 8,
            color: leadColor,
          }}
        >
          {line.text}
        </div>
      </div>
    )
  }

  if (line.size === "support") {
    return (
      <div
        style={{
          display: "flex",
          fontSize: 38,
          lineHeight: 1.5,
          color: supportColor,
          marginTop: 18,
          maxWidth: 820,
        }}
      >
        {line.text}
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
      <div
        style={{
          display: "flex",
          fontFamily: "Cormorant Garamond",
          fontWeight: 600,
          fontSize: 76,
          lineHeight: 1.14,
          color: leadColor,
          maxWidth: 880,
        }}
      >
        {line.text}
      </div>
      {line.emphasis && (
        <div style={{ display: "flex", marginTop: 10, marginLeft: 6 }}>
          <Squiggle color={leadColor} width={340} />
        </div>
      )}
    </div>
  )
}

function StoryFrame({ slide, index, total }: { slide: StorySlide; index: number; total: number }) {
  const hasImage = Boolean(slide.imageUrl)
  const isCta = slide.role === "cta"
  const light = hasImage
  const noteColor = hasImage ? "rgba(255,255,255,0.92)" : STONE

  if (slide.headlineRender === "baked" && slide.imageUrl) {
    return (
      <div style={{ width: WIDTH, height: HEIGHT, display: "flex", backgroundColor: OBSIDIAN }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slide.imageUrl} width={WIDTH} height={HEIGHT} style={{ objectFit: "cover" }} />
      </div>
    )
  }

  const zone: "top" | "bottom" = slide.textZone === "top" ? "top" : "bottom"
  // Zone-local scrim: darken ONLY the half the text sits in. The center band (where the face
  // usually is) stays at 0 alpha, so we never put a heavy gradient over her face. textPanel
  // deepens that scrim when the photo behind the text is busy.
  const panelStrength = slide.textPanel ? 0.88 : 0.72
  const zoneScrim =
    zone === "bottom"
      ? `linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 50%, rgba(10,10,10,${panelStrength}) 100%)`
      : `linear-gradient(0deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 50%, rgba(10,10,10,${panelStrength}) 100%)`
  const metaLight = hasImage ? "rgba(255,255,255,0.92)" : STONE
  const metaDim = hasImage ? "rgba(255,255,255,0.8)" : STONE

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: hasImage ? OBSIDIAN : PEARL,
        fontFamily: "Inter",
      }}
    >
      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.imageUrl}
          width={WIDTH}
          height={HEIGHT}
          style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
        />
      )}
      {hasImage && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: WIDTH,
            height: HEIGHT,
            display: "flex",
            background: zoneScrim,
          }}
        />
      )}
      {hasImage && (
        // Confined wordmark scrim: just the top strip, so "SSELFIE" reads without dimming the face.
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: WIDTH,
            height: 240,
            display: "flex",
            background: "linear-gradient(180deg, rgba(10,10,10,0.34) 0%, rgba(10,10,10,0) 100%)",
          }}
        />
      )}
      <OverlayAssets assets={slide.overlayAssets} />

      <div
        style={{
          position: "absolute",
          top: HEADER_TOP,
          left: SIDE,
          width: WIDTH - SIDE * 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: 7,
            textTransform: "uppercase",
            color: metaLight,
          }}
        >
          SSELFIE
        </div>
        <div style={{ display: "flex", fontSize: 26, color: metaDim, letterSpacing: 5 }}>
          {index + 1} / {total}
        </div>
      </div>

      {/* Doctrine: text in clean negative space, never over the face, inside the IG safe band. */}
      <div
        style={{
          position: "absolute",
          left: SIDE,
          width: WIDTH - SIDE * 2,
          ...(zone === "bottom" ? { bottom: TEXT_BOTTOM } : { top: TEXT_TOP }),
          display: "flex",
          flexDirection: "column",
          alignItems: isCta ? "center" : "flex-start",
        }}
      >
        {!isCta && (
          <div
            style={{
              display: "flex",
              width: 110,
              height: 2,
              backgroundColor: light ? PORCELAIN : OBSIDIAN,
              marginBottom: 18,
            }}
          />
        )}
        {slide.lines.map((line, lineIndex) => (
          <Line key={lineIndex} line={line} light={light} />
        ))}
        {isCta && (
          <div style={{ display: "flex", marginTop: 4 }}>
            <Arrow color={light ? PORCELAIN : OBSIDIAN} />
          </div>
        )}
        {slide.note && (
          <div
            style={{
              display: "flex",
              fontFamily: "Caveat",
              fontSize: 52,
              color: noteColor,
              marginTop: 26,
              transform: "rotate(-3deg)",
            }}
          >
            {slide.note}
          </div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          bottom: FOOTER_BOTTOM,
          left: SIDE,
          width: WIDTH - SIDE * 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            fontWeight: 600,
            letterSpacing: 7,
            textTransform: "uppercase",
            color: metaLight,
          }}
        >
          @sandra.social
        </div>
        <div style={{ display: "flex", fontSize: 26, color: metaDim, letterSpacing: 5 }}>
          sselfie.ai
        </div>
      </div>
    </div>
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slide: string }> }
) {
  const bearer = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  const hasCronAuth = Boolean(cronSecret && bearer === `Bearer ${cronSecret}`)
  if (!hasCronAuth) {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const { id, slide: slideParam } = await params
  const sequence = await getStorySequence(Number(id))
  const slideIndex = Number(slideParam)
  if (
    !sequence ||
    !Number.isInteger(slideIndex) ||
    slideIndex < 0 ||
    slideIndex >= sequence.slides.length
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const fonts = await loadFonts()

  return new ImageResponse(
    <StoryFrame
      slide={sequence.slides[slideIndex]}
      index={slideIndex}
      total={sequence.slides.length}
    />,
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: "Cormorant Garamond", data: fonts.serif, weight: 500, style: "normal" },
        { name: "Cormorant Garamond", data: fonts.serifSemi, weight: 600, style: "normal" },
        { name: "Inter", data: fonts.sans, weight: 400, style: "normal" },
        { name: "Inter", data: fonts.sansSemi, weight: 600, style: "normal" },
        { name: "Caveat", data: fonts.hand, weight: 500, style: "normal" },
      ],
      headers: {
        "Content-Disposition": `inline; filename="story-${sequence.id}-${String(slideIndex + 1).padStart(2, "0")}.png"`,
        "Cache-Control": "private, max-age=300",
      },
    }
  )
}
