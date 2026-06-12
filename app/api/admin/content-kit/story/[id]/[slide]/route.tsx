import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getStorySequence } from "@/lib/content-kit/story-generator"
import type { StoryLine, StorySlide } from "@/lib/content-kit/types"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

const OBSIDIAN = "#0A0A0A"
const PORCELAIN = "#FFFFFF"
const PEARL = "#F5F5F5"
const SMOKE = "#666666"
const STONE = "#8A8780"

const WIDTH = 1080
const HEIGHT = 1920

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
    ]).then(([serif, serifSemi, sans, sansSemi, hand]) => ({ serif, serifSemi, sans, sansSemi, hand }))
  }
  return fontCache
}

/** Hand-drawn underline: a slightly wobbly stroke (doctrine: soft underline under
 * the identity phrase). */
function Squiggle({ color, width: w }: { color: string; width: number }) {
  return (
    <svg width={w} height={14} viewBox={`0 0 ${w} 14`}>
      <path
        d={`M 4 9 Q ${w * 0.22} 2, ${w * 0.46} 8 T ${w * 0.78} 7 T ${w - 4} 5`}
        stroke={color}
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Imperfect hand-drawn ellipse around the CTA keyword. */
function KeywordCircle({ color, w, h }: { color: string; w: number; h: number }) {
  const cx = w / 2
  const cy = h / 2
  const rx = w / 2 - 8
  const ry = h / 2 - 4
  // Two overlapping arcs with a slight tilt = the "drawn twice" marker look.
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", top: 0, left: 0 }}>
      <ellipse
        cx={cx}
        cy={cy + 3}
        rx={rx}
        ry={ry}
        stroke={color}
        strokeWidth={5}
        fill="none"
        transform={`rotate(-3 ${cx} ${cy})`}
      />
      <ellipse
        cx={cx - 4}
        cy={cy}
        rx={rx - 5}
        ry={ry + 2}
        stroke={color}
        strokeWidth={3}
        fill="none"
        opacity={0.6}
        transform={`rotate(2 ${cx} ${cy})`}
      />
    </svg>
  )
}

/** Small hand-drawn arrow (doctrine: arrow toward the action). */
function Arrow({ color }: { color: string }) {
  return (
    <svg width={56} height={72} viewBox="0 0 56 72">
      <path d="M 28 6 Q 20 36, 27 60" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" />
      <path d="M 16 50 Q 22 58, 27 62 Q 33 57, 38 49" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" />
    </svg>
  )
}

function Line({ line, light }: { line: StoryLine; light: boolean }) {
  const leadColor = light ? PORCELAIN : OBSIDIAN
  const supportColor = light ? "rgba(255,255,255,0.88)" : SMOKE

  if (line.size === "keyword") {
    return (
      <div style={{ display: "flex", position: "relative", padding: "18px 56px", marginTop: 20, marginBottom: 8 }}>
        <KeywordCircle color={leadColor} w={line.text.length * 92 + 112} h={196} />
        <div
          style={{
            display: "flex",
            fontFamily: "Cormorant Garamond",
            fontWeight: 600,
            fontSize: 160,
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
            background:
              "linear-gradient(180deg, rgba(10,10,10,0.32) 0%, rgba(10,10,10,0.00) 18%, rgba(10,10,10,0.00) 42%, rgba(10,10,10,0.86) 100%)",
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          top: 96,
          left: 80,
          width: WIDTH - 160,
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
            color: hasImage ? "rgba(255,255,255,0.92)" : STONE,
          }}
        >
          SSELFIE
        </div>
        <div style={{ display: "flex", fontSize: 26, color: hasImage ? "rgba(255,255,255,0.8)" : STONE, letterSpacing: 5 }}>
          {index + 1} / {total}
        </div>
      </div>

      {/* Doctrine: text in clean lower negative space, never over the face. */}
      <div
        style={{
          position: "absolute",
          bottom: 110,
          left: 80,
          width: WIDTH - 160,
          display: "flex",
          flexDirection: "column",
          alignItems: isCta ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isCta ? "center" : "flex-start",
            marginBottom: 44,
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
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: WIDTH - 160,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 7,
              textTransform: "uppercase",
              color: hasImage ? "rgba(255,255,255,0.92)" : STONE,
            }}
          >
            @sandra.social
          </div>
          <div style={{ display: "flex", fontSize: 26, color: hasImage ? "rgba(255,255,255,0.8)" : STONE, letterSpacing: 5 }}>
            sselfie.ai
          </div>
        </div>
      </div>
    </div>
  )
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; slide: string }> },
) {
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
  const sequence = await getStorySequence(Number(id))
  const slideIndex = Number(slideParam)
  if (!sequence || !Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= sequence.slides.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const fonts = await loadFonts()

  return new ImageResponse(
    <StoryFrame slide={sequence.slides[slideIndex]} index={slideIndex} total={sequence.slides.length} />,
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
    },
  )
}
