import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500"] })

export const metadata: Metadata = {
  title: "Set up your SSELFIE Presets · SSELFIE",
  description: "Install your SSELFIE presets in about two minutes. Phone and desktop, step by step.",
}

// Customer setup guide. Keep the download and walkthrough verified against live fulfillment.
// VIDEO: Sandra's preset-application walkthrough, re-edited 2026-06-17 (old website + Drive intro removed, new branded
// title-card intro prepended via Remotion). Hosted on Vercel Blob.
const PHONE_VIDEO_URL = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/presets/applying-your-presets.mp4"
const SETUP_PDF_URL = "" // Codex: set the downloadable PDF url (generated from this content) when ready.

const OBSIDIAN = "#0A0A0A"
const PORCELAIN = "#FFFFFF"
const CREAM = "#F5F5F5"
const SMOKE = "#666666"
const STONE = "#8A8780"
const WHISPER = "#E5E5E5"

const eyebrow = {
  fontFamily: inter.style.fontFamily,
  fontSize: "10px",
  letterSpacing: "0.42em",
  textTransform: "uppercase",
  color: STONE,
  margin: 0,
} as const

const btnDark = {
  display: "inline-block",
  background: OBSIDIAN,
  color: PORCELAIN,
  border: `1px solid ${OBSIDIAN}`,
  fontFamily: inter.style.fontFamily,
  fontSize: "10px",
  fontWeight: 500,
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  padding: "15px 32px",
  textDecoration: "none",
} as const

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li style={{ display: "flex", gap: 16, padding: "16px 0", borderTop: `1px solid ${WHISPER}`, listStyle: "none" }}>
      <span className={cormorant.className} style={{ fontSize: "26px", lineHeight: 1, color: OBSIDIAN, minWidth: 28 }}>{n}</span>
      <span style={{ fontSize: "15px", color: "#3A3632", lineHeight: 1.6, paddingTop: 2 }}>{children}</span>
    </li>
  )
}

export default function PresetSetupPage() {
  return (
    <main className={inter.className} style={{ background: PORCELAIN, color: OBSIDIAN, lineHeight: 1.55 }}>
      {/* HERO */}
      <section style={{ textAlign: "center", padding: "60px 24px 40px", maxWidth: 720, margin: "0 auto" }}>
        <p style={{ ...eyebrow, marginBottom: 20 }}>Setup guide</p>
        <h1 className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(36px, 7vw, 56px)", lineHeight: 1.05, margin: "0 0 16px" }}>
          Installed in about two minutes.
        </h1>
        <p style={{ fontSize: "15px", color: SMOKE, maxWidth: 420, margin: "0 auto" }}>
          Even if you&rsquo;ve never edited a photo. Pick your device below and follow along.
        </p>
      </section>

      {/* WHICH FILES */}
      <section style={{ background: CREAM, padding: "32px 24px", textAlign: "center" }}>
        <p style={{ ...eyebrow, marginBottom: 10 }}>First, which files?</p>
        <p className={cormorant.className} style={{ fontSize: "clamp(20px, 4vw, 25px)", lineHeight: 1.4, margin: "0 auto", maxWidth: 560 }}>
          Editing on your phone? Use the <strong style={{ fontWeight: 500 }}>DNG</strong> files. On your computer? Use the <strong style={{ fontWeight: 500 }}>XMP</strong> files. You get both.
        </p>
      </section>

      {/* ON YOUR PHONE */}
      <section style={{ padding: "52px 24px", maxWidth: 720, margin: "0 auto" }}>
        <p style={{ ...eyebrow, marginBottom: 8 }}>On your phone</p>
        <h2 className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(26px, 5vw, 34px)", margin: "0 0 22px" }}>
          The 2-minute phone install.
        </h2>
        <div style={{ position: "relative", width: "100%", paddingTop: "56.25%", background: OBSIDIAN, marginBottom: 28 }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={PHONE_VIDEO_URL}
            controls
            playsInline
            preload="metadata"
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0, objectFit: "cover" }}
          />
        </div>
        <ol style={{ margin: 0, padding: 0 }}>
          <Step n={1}>On your access page, tap <strong style={{ fontWeight: 500 }}>Mobile .dng</strong> and save the file to your phone.</Step>
          <Step n={2}>Open the free <strong style={{ fontWeight: 500 }}>Adobe Lightroom</strong> app (grab it from the App Store if you don&rsquo;t have it yet).</Step>
          <Step n={3}>In Lightroom, tap the <strong style={{ fontWeight: 500 }}>+</strong> and import the DNG file you just saved.</Step>
          <Step n={4}>Open that photo, tap the <strong style={{ fontWeight: 500 }}>•••</strong> in the corner, and choose <strong style={{ fontWeight: 500 }}>Create Preset</strong>. Name it and save it to a &ldquo;SSELFIE&rdquo; group.</Step>
          <Step n={5}>Done. Open any photo → <strong style={{ fontWeight: 500 }}>Presets</strong> → SSELFIE → tap. Your look, one tap.</Step>
        </ol>
      </section>

      {/* ON DESKTOP */}
      <section style={{ background: CREAM, padding: "52px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <p style={{ ...eyebrow, marginBottom: 8 }}>On your computer</p>
          <h2 className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(26px, 5vw, 34px)", margin: "0 0 22px" }}>
            Desktop, in Lightroom.
          </h2>
          <ol style={{ margin: 0, padding: 0 }}>
            <Step n={1}>Download the <strong style={{ fontWeight: 500 }}>Desktop .xmp</strong> file from your access page and unzip it.</Step>
            <Step n={2}>Open Lightroom and go to the <strong style={{ fontWeight: 500 }}>Develop</strong> module.</Step>
            <Step n={3}>In the <strong style={{ fontWeight: 500 }}>Presets</strong> panel on the left, click <strong style={{ fontWeight: 500 }}>+</strong> → <strong style={{ fontWeight: 500 }}>Import Presets</strong>, and select the .xmp files.</Step>
            <Step n={4}>They show up under Presets → SSELFIE. Click any one to apply.</Step>
          </ol>
          <p style={{ fontSize: "13px", color: SMOKE, marginTop: 18 }}>
            On Lightroom desktop (the newer CC version): <strong style={{ fontWeight: 500 }}>File → Import Profiles &amp; Presets</strong> instead.
          </p>
        </div>
      </section>

      {/* FOR BEST RESULTS */}
      <section style={{ padding: "52px 24px", maxWidth: 620, margin: "0 auto", textAlign: "center" }}>
        <p style={{ ...eyebrow, marginBottom: 14 }}>For best results</p>
        <p className={cormorant.className} style={{ fontWeight: 400, fontSize: "clamp(20px, 4vw, 25px)", lineHeight: 1.45, margin: 0 }}>
          Start with a clear, well-lit photo. After you tap the preset, nudge the exposure up or down so it fits your light. The preset gets you most of the way. You finish it. Same you, just your best light.
        </p>
      </section>

      {/* FOOTER ACTIONS */}
      <section style={{ background: OBSIDIAN, color: PORCELAIN, padding: "48px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "14px", color: "#B4B2A9", margin: "0 0 24px", maxWidth: 440, marginInline: "auto" }}>
          Stuck on anything? Reply to your delivery email or message me on Instagram. I read every one. 🤍
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          {SETUP_PDF_URL ? (
            <a href={SETUP_PDF_URL} style={{ ...btnDark, background: "transparent", color: PORCELAIN, border: `1px solid ${PORCELAIN}` }}>Download as PDF</a>
          ) : null}
          <Link href="/access/presets" style={{ ...btnDark, background: PORCELAIN, color: OBSIDIAN }}>Back to my presets</Link>
        </div>
      </section>
    </main>
  )
}
