"use client"

import Link from "next/link"
import { useState } from "react"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500"] })

type MayaMomentProps = {
  token?: string
}

type ConceptResult = {
  scene: string
  lighting: string
  aesthetic: string
  caption: string
}

const FALLBACK_CONCEPT: ConceptResult = {
  scene:
    "A soft portrait in warm natural window light, minimal background, clean and editorial.",
  lighting:
    "Indirect daylight from a north-facing window, positioned 1 meter to the left of your face.",
  aesthetic: "Quiet luxury, approachable warmth",
  caption: "This is what showing up with intention looks like.",
}

function ShimmerLine({ width = "100%" }: { width?: string }) {
  return (
    <div
      style={{
        height: "14px",
        width,
        borderRadius: "3px",
        background:
          "linear-gradient(90deg, rgba(240,237,232,0.05) 0%, rgba(240,237,232,0.12) 50%, rgba(240,237,232,0.05) 100%)",
        backgroundSize: "200% 100%",
        animation: "maya-shimmer 1.4s ease-in-out infinite",
        marginBottom: "10px",
      }}
    />
  )
}

export default function MayaMoment({ token }: MayaMomentProps) {
  const [scene, setScene] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConceptResult | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = scene.trim()
    if (!trimmed) return

    setLoading(true)
    setResult(null)
    setHasSubmitted(true)

    try {
      const res = await fetch("/api/selfie-guide/maya-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: trimmed, token }),
      })

      if (!res.ok) throw new Error("non-ok response")

      const data = await res.json()
      const payload = data?.concept ?? data
      if (payload?.scene && payload?.lighting && payload?.aesthetic && payload?.caption) {
        setResult(payload as ConceptResult)
      } else {
        setResult(FALLBACK_CONCEPT)
      }
    } catch {
      setResult(FALLBACK_CONCEPT)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={inter.className}
      style={{
        marginTop: "56px",
        padding: "40px 0 0",
        borderTop: "1px solid rgba(168,164,156,0.14)",
      }}
    >
      {/* Heading */}
      <h3
        className={cormorant.className}
        style={{
          margin: "0 0 8px",
          fontSize: "clamp(28px, 4vw, 42px)",
          fontWeight: 300,
          letterSpacing: "0.01em",
          textTransform: "uppercase",
          color: "#f0ede8",
          lineHeight: 1.05,
        }}
      >
        See What Maya Does Next
      </h3>
      <p
        style={{
          margin: "0 0 28px",
          fontSize: "14px",
          fontWeight: 300,
          lineHeight: 1.7,
          color: "rgba(200,196,187,0.75)",
        }}
      >
        Type a scene or vibe. Maya will show you the concept.
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <input
          type="text"
          value={scene}
          onChange={(e) => setScene(e.target.value)}
          placeholder="Paris cafe, warm morning light, editorial..."
          maxLength={200}
          style={{
            width: "100%",
            padding: "14px 18px",
            fontSize: "14px",
            fontWeight: 300,
            lineHeight: 1.5,
            color: "#f0ede8",
            background: "rgba(28,27,25,0.8)",
            border: "1px solid rgba(195,190,182,0.25)",
            borderRadius: "3px",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
        <button
          type="submit"
          disabled={loading || !scene.trim()}
          style={{
            alignSelf: "flex-start",
            padding: "12px 24px",
            fontSize: "9px",
            fontWeight: 500,
            letterSpacing: "0.36em",
            textTransform: "uppercase",
            color: "#0a0a0a",
            background: loading || !scene.trim() ? "rgba(240,237,232,0.5)" : "#f0ede8",
            border: "none",
            borderRadius: "999px",
            cursor: loading || !scene.trim() ? "not-allowed" : "pointer",
            transition: "background 0.18s ease, opacity 0.18s ease",
          }}
        >
          {loading ? "Generating..." : "Generate concept"}
        </button>
      </form>

      {/* Loading shimmer */}
      {loading && (
        <div
          style={{
            marginTop: "24px",
            padding: "24px",
            background: "rgba(28,27,25,0.8)",
            border: "1px solid rgba(195,190,182,0.25)",
            borderRadius: "3px",
          }}
        >
          <ShimmerLine width="80%" />
          <ShimmerLine width="60%" />
          <ShimmerLine width="70%" />
        </div>
      )}

      {/* Result card */}
      {!loading && result && hasSubmitted && (
        <div
          style={{
            marginTop: "24px",
            padding: "28px 24px",
            background: "rgba(28,27,25,0.8)",
            border: "1px solid rgba(195,190,182,0.25)",
            borderRadius: "3px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Scene */}
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.38em",
                  textTransform: "uppercase",
                  color: "rgba(200,196,187,0.6)",
                }}
              >
                Scene
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 300,
                  lineHeight: 1.75,
                  color: "#f0ede8",
                }}
              >
                {result.scene}
              </p>
            </div>

            {/* Lighting */}
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.38em",
                  textTransform: "uppercase",
                  color: "rgba(200,196,187,0.6)",
                }}
              >
                Lighting
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 300,
                  lineHeight: 1.75,
                  color: "#f0ede8",
                }}
              >
                {result.lighting}
              </p>
            </div>

            {/* Aesthetic */}
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.38em",
                  textTransform: "uppercase",
                  color: "rgba(200,196,187,0.6)",
                }}
              >
                Aesthetic
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  fontWeight: 400,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(240,237,232,0.8)",
                }}
              >
                {result.aesthetic}
              </p>
            </div>

            {/* Caption direction */}
            <div>
              <p
                style={{
                  margin: "0 0 4px",
                  fontSize: "9px",
                  fontWeight: 500,
                  letterSpacing: "0.38em",
                  textTransform: "uppercase",
                  color: "rgba(200,196,187,0.6)",
                }}
              >
                Caption direction
              </p>
              <p
                className={cormorant.className}
                style={{
                  margin: 0,
                  fontSize: "19px",
                  fontWeight: 300,
                  fontStyle: "italic",
                  lineHeight: 1.6,
                  color: "#f0ede8",
                }}
              >
                &ldquo;{result.caption}&rdquo;
              </p>
            </div>
          </div>

          {/* CTA */}
          <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid rgba(168,164,156,0.14)" }}>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: "13px",
                fontWeight: 300,
                lineHeight: 1.7,
                color: "rgba(200,196,187,0.7)",
              }}
            >
              Want help turning this into real brand content?
            </p>
            <Link
              href="/private-shoot"
              style={{
                display: "inline-block",
                padding: "12px 22px",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                color: "#0a0a0a",
                background: "#f0ede8",
                borderRadius: "999px",
                textDecoration: "none",
                transition: "opacity 0.18s ease",
              }}
            >
              Turn this into a real photo in Studio
            </Link>
          </div>
        </div>
      )}

      {/* Shimmer animation */}
      <style jsx global>{`
        @keyframes maya-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}
