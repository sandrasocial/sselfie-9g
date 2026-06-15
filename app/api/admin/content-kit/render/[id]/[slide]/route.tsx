import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getCarousel } from "@/lib/content-kit/carousel-generator"
import { Arrow, KeywordCircle, Squiggle, TUTORIAL_BURGUNDY } from "@/lib/content-kit/accents"
import type { CarouselSlide, ContentAccent, ContentOverlayAsset } from "@/lib/content-kit/types"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

// Design system tokens (docs/SSELFIE_DESIGN_SYSTEM.md)
const OBSIDIAN = "#0A0A0A"
const PORCELAIN = "#FFFFFF"
const SMOKE = "#666666"
const WHISPER = "#E5E5E5"
const STONE = "#8A8780"
const STONE_SOFT = "#D4D1CC"
const TUTORIAL_ACCENT = TUTORIAL_BURGUNDY

const WIDTH = 1080
const HEIGHT = 1350
const PAD = 96

let fontCache: Promise<{
  serif: Buffer
  serifSemi: Buffer
  sans: Buffer
  sansSemi: Buffer
}> | null = null

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

function accentPosition(target: ContentAccent["target"], width: number, height: number) {
  const map: Record<ContentAccent["target"], { left: number; top: number }> = {
    "top-left": { left: 120, top: 220 },
    "top-right": { left: width - 270, top: 220 },
    "middle-left": { left: 120, top: height / 2 - 80 },
    "middle-right": { left: width - 270, top: height / 2 - 80 },
    "bottom-left": { left: 120, top: height - 360 },
    "bottom-right": { left: width - 310, top: height - 360 },
    center: { left: width / 2 - 110, top: height / 2 - 80 },
    keyword: { left: width / 2 - 220, top: height - 430 },
  }
  return map[target]
}

function SlideAccents({
  accents,
  width,
  height,
}: {
  accents?: ContentAccent[]
  width: number
  height: number
}) {
  if (!accents?.length) return null
  return (
    <>
      {accents.slice(0, 4).map((accent, index) => {
        const color = accent.color || TUTORIAL_ACCENT
        const position = accentPosition(accent.target, width, height)
        return (
          <div
            key={`${accent.type}-${accent.target}-${index}`}
            style={{
              position: "absolute",
              left: position.left,
              top: position.top,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {accent.type === "arrow" ? <Arrow color={color} /> : null}
            {accent.type === "circle" ? <KeywordCircle color={color} w={220} h={120} /> : null}
            {accent.type === "squiggle" ? <Squiggle color={color} width={260} /> : null}
            {accent.label ? (
              <div
                style={{
                  display: "flex",
                  marginLeft: 18,
                  padding: "12px 18px",
                  borderRadius: 999,
                  backgroundColor: color,
                  color: PORCELAIN,
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {accent.label}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

function isScreenshotReferenceUrl(value?: string): boolean {
  return Boolean(value && value.includes("/content-kit/reel-references/"))
}

function Frame({
  dark,
  eyebrow,
  counter,
  width,
  height,
  accents,
  children,
}: {
  dark?: boolean
  eyebrow?: string
  counter: string
  width: number
  height: number
  accents?: ContentAccent[]
  children: React.ReactNode
}) {
  const fg = dark ? PORCELAIN : OBSIDIAN
  const muted = dark ? STONE_SOFT : STONE
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        position: "relative",
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
        <div style={{ display: "flex", fontSize: 24, color: muted, letterSpacing: 4 }}>
          {counter}
        </div>
      </div>
      <div
        style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center" }}
      >
        {children}
      </div>
      <SlideAccents accents={accents} width={width} height={height} />
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
        <div style={{ display: "flex", fontSize: 24, color: muted, letterSpacing: 4 }}>
          sselfie.ai
        </div>
      </div>
    </div>
  )
}

function OverlayAssets({
  assets,
  width,
  height,
}: {
  assets?: ContentOverlayAsset[]
  width: number
  height: number
}) {
  if (!assets?.length) return null
  return (
    <>
      {assets.slice(0, 2).map((asset, index) => {
        const placement = asset.placement || "middle-right"
        const isFull = placement === "full"
        const boxW = isFull ? width - 144 : placement === "center" ? 680 : 390
        const boxH = isFull ? height - 320 : placement === "center" ? 660 : 520
        const left =
          placement === "left"
            ? 72
            : placement === "center" || isFull
              ? (width - boxW) / 2
              : width - boxW - 72
        const top = isFull
          ? 180
          : placement === "top-right"
            ? 210 + index * 34
            : placement === "bottom-right"
              ? height - boxH - 250 - index * 34
              : placement === "center"
                ? (height - boxH) / 2
                : 405 + index * 34
        const fit = asset.fit || "cover"
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
              borderRadius: isFull ? 18 : 28,
              overflow: "hidden",
              border: isFull ? `3px solid ${TUTORIAL_ACCENT}` : "4px solid rgba(255,255,255,0.92)",
              backgroundColor: PORCELAIN,
              boxShadow: isFull ? "0 18px 48px rgba(0,0,0,0.16)" : "0 28px 80px rgba(0,0,0,0.42)",
              transform: isFull ? "none" : index % 2 === 0 ? "rotate(1.5deg)" : "rotate(-1.5deg)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} width={boxW} height={boxH} style={{ objectFit: fit }} />
            {asset.label ? (
              <div
                style={{
                  position: "absolute",
                  left: 22,
                  bottom: 22,
                  display: "flex",
                  padding: "10px 16px",
                  borderRadius: 999,
                  backgroundColor: TUTORIAL_ACCENT,
                  color: PORCELAIN,
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {asset.label}
              </div>
            ) : null}
          </div>
        )
      })}
    </>
  )
}

/** 2x2 photo grid (the prompts.ig signature: same person, four worlds), with the
 * hook line over a bottom scrim when the slide has a title. */
function GridFrame({
  slide,
  counter,
  width,
  height,
}: {
  slide: CarouselSlide
  counter: string
  width: number
  height: number
}) {
  const urls = (slide.gridUrls || []).slice(0, 4)
  const gap = 8
  const cellW = (width - gap) / 2
  const cellH = (height - gap) / 2
  const hasText = Boolean(slide.title)

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexWrap: "wrap",
        position: "relative",
        backgroundColor: OBSIDIAN,
        fontFamily: "Inter",
      }}
    >
      {urls.map((url, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={index}
          src={url}
          width={cellW}
          height={cellH}
          style={{
            objectFit: "cover",
            marginRight: index % 2 === 0 ? gap : 0,
            marginBottom: index < 2 ? gap : 0,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
          background: hasText
            ? "linear-gradient(180deg, rgba(10,10,10,0.28) 0%, rgba(10,10,10,0.00) 18%, rgba(10,10,10,0.00) 52%, rgba(10,10,10,0.85) 100%)"
            : "linear-gradient(180deg, rgba(10,10,10,0.28) 0%, rgba(10,10,10,0.00) 18%, rgba(10,10,10,0.00) 80%, rgba(10,10,10,0.45) 100%)",
        }}
      />
      <OverlayAssets assets={slide.overlayAssets} width={width} height={height} />
      <SlideAccents accents={slide.accents} width={width} height={height} />
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 72,
          width: width - 144,
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
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "rgba(255,255,255,0.8)",
            letterSpacing: 4,
          }}
        >
          {counter}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: 72,
          width: width - 144,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {hasText && (
          <div
            style={{
              display: "flex",
              fontFamily: "Cormorant Garamond",
              fontWeight: 600,
              fontSize: 100,
              lineHeight: 1.05,
              color: PORCELAIN,
              marginBottom: 40,
            }}
          >
            {slide.title}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "rgba(255,255,255,0.8)",
              letterSpacing: 4,
            }}
          >
            sselfie.ai
          </div>
        </div>
      </div>
    </div>
  )
}

/** Photo-first slide: full-bleed image, bottom scrim, white text. The niche-viral
 * format (@prompts.ig pattern) with Sandra's editorial typography on top. */
function PhotoFrame({
  slide,
  counter,
  width,
  height,
}: {
  slide: CarouselSlide
  counter: string
  width: number
  height: number
}) {
  const isHook = slide.kind === "hook"
  const isCta = slide.kind === "cta"
  const isPlainPhoto = slide.kind === "photo"
  const hasText = slide.headlineRender !== "baked" && !isPlainPhoto && Boolean(slide.title)

  return (
    <div
      style={{
        width,
        height,
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
        width={width}
        height={height}
        style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width,
          height,
          display: "flex",
          background: hasText
            ? "linear-gradient(180deg, rgba(10,10,10,0.30) 0%, rgba(10,10,10,0.00) 22%, rgba(10,10,10,0.00) 46%, rgba(10,10,10,0.82) 100%)"
            : "linear-gradient(180deg, rgba(10,10,10,0.30) 0%, rgba(10,10,10,0.00) 20%, rgba(10,10,10,0.00) 78%, rgba(10,10,10,0.45) 100%)",
        }}
      />
      <OverlayAssets assets={slide.overlayAssets} width={width} height={height} />
      <SlideAccents accents={slide.accents} width={width} height={height} />
      <div
        style={{
          position: "absolute",
          top: 64,
          left: 72,
          width: width - 144,
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
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "rgba(255,255,255,0.8)",
            letterSpacing: 4,
          }}
        >
          {counter}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 64,
          left: 72,
          width: width - 144,
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
            <div
              style={{
                display: "flex",
                width: 110,
                height: 2,
                backgroundColor: PORCELAIN,
                marginBottom: 40,
              }}
            />
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
            {slide.kind === "list" && slide.items?.length ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginTop: 28,
                  maxWidth: 680,
                }}
              >
                {slide.items.slice(0, 4).map((item, index) => (
                  <div key={index} style={{ display: "flex", alignItems: "flex-start", gap: 18 }}>
                    <div
                      style={{
                        display: "flex",
                        fontSize: 27,
                        color: "rgba(255,255,255,0.78)",
                        width: 34,
                      }}
                    >
                      {index + 1}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        fontSize: 30,
                        lineHeight: 1.32,
                        color: "rgba(255,255,255,0.9)",
                      }}
                    >
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {slide.kind === "step" && slide.stepNumber ? (
              <div
                style={{
                  display: "flex",
                  marginTop: 22,
                  fontSize: 25,
                  letterSpacing: 5,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.72)",
                }}
              >
                Step {slide.stepNumber}
              </div>
            ) : null}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: width - 144,
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
          <div
            style={{
              display: "flex",
              fontSize: 24,
              color: "rgba(255,255,255,0.8)",
              letterSpacing: 4,
            }}
          >
            sselfie.ai
          </div>
        </div>
      </div>
    </div>
  )
}

function BeforeAfterFrame({
  slide,
  counter,
  width,
  height,
}: {
  slide: CarouselSlide
  counter: string
  width: number
  height: number
}) {
  const beforeUrl = slide.imageUrl
  const afterUrl = slide.overlayAssets?.[0]?.url || slide.gridUrls?.[0] || slide.imageUrl
  const beforeFit = isScreenshotReferenceUrl(beforeUrl) ? "contain" : "cover"
  const imageTop = 350
  const imageH = 690
  const gap = 28
  const imageW = (width - PAD * 2 - gap) / 2

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        position: "relative",
        backgroundColor: PORCELAIN,
        fontFamily: "Inter",
        color: OBSIDIAN,
        padding: PAD,
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
            color: STONE,
          }}
        >
          {slide.eyebrow || "Before / After"}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: STONE, letterSpacing: 4 }}>
          {counter}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 190,
          left: PAD,
          width: width - PAD * 2,
          display: "flex",
          fontFamily: "Cormorant Garamond",
          fontWeight: 600,
          fontSize: 78,
          lineHeight: 1.06,
        }}
      >
        {slide.title || "From this to this"}
      </div>

      <div
        style={{
          position: "absolute",
          top: imageTop,
          left: PAD,
          width: imageW,
          height: imageH,
          display: "flex",
          overflow: "hidden",
          borderRadius: 26,
          border: `3px solid ${WHISPER}`,
          backgroundColor: "#F5F5F5",
        }}
      >
        {beforeUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={beforeUrl} width={imageW} height={imageH} style={{ objectFit: beforeFit }} />
        ) : null}
        <div
          style={{
            position: "absolute",
            left: 22,
            bottom: 22,
            display: "flex",
            padding: "10px 16px",
            borderRadius: 999,
            backgroundColor: "rgba(10,10,10,0.82)",
            color: PORCELAIN,
            fontSize: 21,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          From this
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: imageTop,
          left: PAD + imageW + gap,
          width: imageW,
          height: imageH,
          display: "flex",
          overflow: "hidden",
          borderRadius: 26,
          border: `4px solid ${TUTORIAL_ACCENT}`,
          backgroundColor: "#F5F5F5",
        }}
      >
        {afterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={afterUrl} width={imageW} height={imageH} style={{ objectFit: "cover" }} />
        ) : null}
        <div
          style={{
            position: "absolute",
            left: 22,
            bottom: 22,
            display: "flex",
            padding: "10px 16px",
            borderRadius: 999,
            backgroundColor: TUTORIAL_ACCENT,
            color: PORCELAIN,
            fontSize: 21,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          To this
        </div>
      </div>

      {slide.body ? (
        <div
          style={{
            position: "absolute",
            left: PAD,
            top: imageTop + imageH + 52,
            width: width - PAD * 2,
            display: "flex",
            fontSize: 32,
            color: SMOKE,
            lineHeight: 1.45,
          }}
        >
          {slide.body}
        </div>
      ) : null}

      <SlideAccents accents={slide.accents} width={width} height={height} />

      <div
        style={{
          position: "absolute",
          bottom: 72,
          left: PAD,
          width: width - PAD * 2,
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
            color: STONE,
          }}
        >
          @sandra.social
        </div>
        <div style={{ display: "flex", fontSize: 24, color: STONE, letterSpacing: 4 }}>
          sselfie.ai
        </div>
      </div>
    </div>
  )
}

function SlideContent({ slide }: { slide: CarouselSlide }) {
  if (slide.kind === "hook") {
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            width: 120,
            height: 2,
            backgroundColor: OBSIDIAN,
            marginBottom: 56,
          }}
        />
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
          <div
            style={{ display: "flex", fontSize: 32, color: SMOKE, marginTop: 48, lineHeight: 1.5 }}
          >
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
          <div
            style={{ display: "flex", fontSize: 34, color: SMOKE, marginTop: 40, lineHeight: 1.55 }}
          >
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
              <div style={{ display: "flex", fontSize: 30, color: STONE, width: 64 }}>
                {index + 1}
              </div>
              <div style={{ display: "flex", fontSize: 34, lineHeight: 1.4 }}>{item}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (slide.kind === "quote") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 120,
          height: 2,
          backgroundColor: PORCELAIN,
          marginBottom: 56,
        }}
      />
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
  { params }: { params: Promise<{ id: string; slide: string }> }
) {
  // Admin session, or CRON_SECRET bearer for server-side consumers (emails, automation).
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
  const deck = await getCarousel(Number(id))
  const slideIndex = Number(slideParam)
  if (
    !deck ||
    !Number.isInteger(slideIndex) ||
    slideIndex < 0 ||
    slideIndex >= deck.slides.length
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const slide = deck.slides[slideIndex]
  const dark = slide.kind === "quote" || slide.kind === "cta"
  // format=cover renders the same slide at story/reel-cover size (1080x1920),
  // with the counter dropped (a cover is a standalone, not "1 / 11").
  const isCover = new URL(request.url).searchParams.get("format") === "cover"
  const width = WIDTH
  const height = isCover ? 1920 : HEIGHT
  const counter = isCover ? "" : `${slideIndex + 1} / ${deck.slides.length}`
  const fonts = await loadFonts()

  return new ImageResponse(
    slide.kind === "grid" && slide.gridUrls?.length ? (
      <GridFrame slide={slide} counter={counter} width={width} height={height} />
    ) : slide.kind === "before-after" ? (
      <BeforeAfterFrame slide={slide} counter={counter} width={width} height={height} />
    ) : slide.imageUrl ? (
      <PhotoFrame slide={slide} counter={counter} width={width} height={height} />
    ) : (
      <Frame
        dark={dark}
        eyebrow={slide.eyebrow}
        counter={counter}
        width={width}
        height={height}
        accents={slide.accents}
      >
        <SlideContent slide={slide} />
      </Frame>
    ),
    {
      width,
      height,
      fonts: [
        { name: "Cormorant Garamond", data: fonts.serif, weight: 500, style: "normal" },
        { name: "Cormorant Garamond", data: fonts.serifSemi, weight: 600, style: "normal" },
        { name: "Inter", data: fonts.sans, weight: 400, style: "normal" },
        { name: "Inter", data: fonts.sansSemi, weight: 600, style: "normal" },
      ],
      headers: {
        "Content-Disposition": `inline; filename="${deck.slug}-${isCover ? "cover" : String(slideIndex + 1).padStart(2, "0")}.png"`,
        "Cache-Control": "private, max-age=300",
      },
    }
  )
}
