import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Private Brand Shoot | SSELFIE",
  description:
    "A simpler, high-touch SSELFIE offer for women who want brand photos and content support without another draining platform to manage.",
}

const inquiryHref =
  "mailto:hello@sselfie.ai?subject=Private%20Brand%20Shoot%20Inquiry&body=Hi%20Sandra%2C%0A%0AI%27m%20interested%20in%20the%20Private%20Brand%20Shoot.%0A%0AMy%20business%3A%0AWhat%20I%20need%20help%20with%3A%0AInstagram%20or%20website%3A%0A%0AThank%20you."

export default function PrivateShootPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(196,181,160,0.18), transparent 34%), #0f0d0b",
        color: "#f4f0e6",
      }}
    >
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "88px 24px 56px" }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(244,240,230,0.48)",
          }}
        >
          Private Offer
        </p>
        <h1
          style={{
            margin: "22px 0 0",
            fontFamily: "var(--font-display)",
            fontWeight: 300,
            fontSize: "clamp(3.2rem, 8vw, 6.8rem)",
            lineHeight: 0.94,
            letterSpacing: "-0.04em",
            maxWidth: 860,
          }}
        >
          Brand photos and content support, done with you.
        </h1>
        <p
          style={{
            maxWidth: 650,
            marginTop: 28,
            fontSize: "1.04rem",
            lineHeight: 1.9,
            color: "rgba(244,240,230,0.72)",
          }}
        >
          This is the calmer SSELFIE path. We use Maya behind the scenes, but the delivery stays
          private, guided, and simple. No big platform to learn while you are already carrying too
          much.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 32 }}>
          <a
            href={inquiryHref}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 24px",
              background: "#f4f0e6",
              color: "#0f0d0b",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: 12,
            }}
          >
            Inquire by Email
          </a>
          <Link
            href="/brand-strategy"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 24px",
              border: "1px solid rgba(244,240,230,0.2)",
              color: "rgba(244,240,230,0.82)",
              textDecoration: "none",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              fontSize: 12,
            }}
          >
            Start Smaller With Strategy
          </Link>
        </div>
      </section>

      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "0 24px 72px",
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {[
          {
            title: "What you get",
            lines: [
              "A private brand image direction tailored to your business.",
              "AI-supported brand photos created with Maya.",
              "Content support around the visuals so they actually get used.",
            ],
          },
          {
            title: "Who it is for",
            lines: [
              "Women who want the result, not another product to babysit.",
              "Founders low on energy but still needing to stay visible.",
              "Clients who want guided support around visuals and messaging together.",
            ],
          },
          {
            title: "How it works",
            lines: [
              "You email Sandra with your business, needs, and links.",
              "You get the next best recommendation and fit check.",
              "If it is a fit, delivery happens in a smaller, more supported flow.",
            ],
          },
        ].map((section) => (
          <article
            key={section.title}
            style={{
              border: "1px solid rgba(244,240,230,0.1)",
              background: "rgba(255,255,255,0.02)",
              padding: 28,
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.24em",
                color: "rgba(244,240,230,0.38)",
              }}
            >
              {section.title}
            </p>
            <ul style={{ margin: "18px 0 0", paddingLeft: 18, lineHeight: 1.85, color: "rgba(244,240,230,0.74)" }}>
              {section.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  )
}
