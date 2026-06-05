import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { NOIR_FEMME_SERIES, VAULT_COLLECTION_META } from "@/lib/ai-prompts/prompt-data"
import { logAnalyticsEvent } from "@/lib/analytics/events"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const metadata: Metadata = {
  title: "Selfie to Brand Shoot System | SSELFIE",
  description: "Turn one selfie into elevated personal brand images with Sandra's visual identity system.",
}

const featured = VAULT_COLLECTION_META.slice(0, 4)

const path = [
  "Choose the source selfie that keeps you looking like you.",
  "Pick the visual world your brand needs next.",
  "Create one first result before browsing everything.",
  "Use Sandra's taste filter to keep the strongest images.",
  "Turn the shoot into a profile image, reel cover, story, or offer visual.",
]

export default async function SelfieToBrandShootLandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ checkout?: string }>
}) {
  const params = searchParams ? await searchParams : {}
  const checkoutFailed = params.checkout === "failed"

  logAnalyticsEvent({
    eventName: "selfie_to_brand_shoot_landing_view",
    path: "/selfie-to-brand-shoot",
    properties: {
      source: "public_landing",
    },
  }).catch(() => {})

  return (
    <main className={`sbs-sales ${inter.className}`}>
      {checkoutFailed && (
        <section className="sbs-retry-banner" aria-label="Checkout retry">
          <div>
            <p className="sbs-label">CHECKOUT PAUSED</p>
            <h2 className={cormorant.className}>Your payment form did not open cleanly.</h2>
            <p>
              Nothing was charged. Try again and we will reopen the secure System checkout for you.
            </p>
          </div>
          <Link href="/checkout/selfie-to-brand-shoot?source=checkout_retry" className="sbs-primary">
            Retry Checkout
          </Link>
        </section>
      )}
      <section className="sbs-sales-hero">
        <div className="sbs-sales-copy">
          <p className="sbs-label">SELFIE TO BRAND SHOOT</p>
          <h1 className={cormorant.className}>Turn one selfie into your first AI brand shoot.</h1>
          <p>
            The guided SSELFIE path for creating elevated personal brand images from your own
            photo, so you know what to post, how to show up, and how to turn your visuals into a
            simple first step online. The full Prompt Vault is included, but this is not just
            prompts.
          </p>
          <div className="sbs-actions">
            <Link href="/checkout/selfie-to-brand-shoot" className="sbs-primary">
              Start The System
            </Link>
            <Link href="/prompt-vault" className="sbs-secondary">
              View The Vault
            </Link>
          </div>
        </div>
        <div className="sbs-sales-board" aria-label="SSELFIE visual identity previews">
          {featured.slice(0, 3).map((collection, index) => (
            <figure key={collection.name} className={`sbs-sales-image sbs-sales-image-${index}`}>
              <Image
                src={collection.thumbnails[index === 0 ? 2 : 0]}
                alt={`${collection.name} preview`}
                fill
                priority={index === 0}
                sizes="(max-width: 768px) 74vw, 28vw"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
              <figcaption>{collection.name.replace(" Editorial", "")}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="sbs-sales-strip">
        <div>
          <p className="sbs-label">WHAT YOU GET</p>
          <h2 className={cormorant.className}>A transformation path, not another prompt folder.</h2>
        </div>
        <p>
          Source selfie guidance, Vault access, visual-world selection, first-result workflow,
          image selection, Maya prompt support, a course workbook, and a content-use plan for your
          first week.
        </p>
      </section>

      <section className="sbs-sales-deliverables">
        {[
          {
            title: "Choose the right source selfie",
            copy: "Stop guessing which photo to upload. Learn what gives AI enough truth to keep you recognizable.",
          },
          {
            title: "Build one Signature Visual World",
            copy: "Choose the repeatable style, colors, light, wardrobe, and mood your audience can start recognizing.",
          },
          {
            title: "Create your first three image anchors",
            copy: "Use starter prompts and Maya support to create a profile portrait, reel cover, and lifestyle image.",
          },
          {
            title: "Keep, fix, or delete with taste",
            copy: "Choose images that still look like you, match your world, and have a clear content use.",
          },
          {
            title: "Turn the shoot into content",
            copy: "Leave with a 3x3 feed rhythm, caption starters, story sequence, and a first 7-day posting plan.",
          },
        ].map(item => (
          <article key={item.title}>
            <h3 className={cormorant.className}>{item.title}</h3>
            <p>{item.copy}</p>
          </article>
        ))}
      </section>

      <section className="sbs-sales-path">
        {path.map((step, index) => (
          <article key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{step}</p>
          </article>
        ))}
      </section>

      <section className="sbs-sales-proof">
        <div className="sbs-proof-image">
          <Image
            src={NOIR_FEMME_SERIES[2]?.exampleImage || featured[0].thumbnails[0]}
            alt="Noir Femme AI brand shoot example"
            fill
            sizes="(max-width: 768px) 92vw, 44vw"
            style={{ objectFit: "cover", objectPosition: "center top" }}
          />
        </div>
        <div>
          <p className="sbs-label">THE CORE PROMISE</p>
          <h2 className={cormorant.className}>Aesthetic certainty for the woman becoming visible online.</h2>
          <p>
            You are not buying more AI options. You are buying the path for
            deciding what to create, what to keep, and where that image belongs in the brand you
            are building online.
          </p>
          <p>
            If you already bought the Vault, your $27 can be credited toward the full System from
            your Vault access page.
          </p>
          <Link href="/checkout/selfie-to-brand-shoot" className="sbs-primary">
            Enter Selfie To Brand Shoot
          </Link>
        </div>
      </section>

      <style>{`
        .sbs-sales {
          min-height: 100vh;
          background: #F8FAFA;
          color: #0D0E10;
        }
        .sbs-retry-banner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 22px;
          align-items: center;
          max-width: 1180px;
          margin: 24px auto 0;
          padding: 22px clamp(20px, 5vw, 34px);
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.55);
          box-shadow: 0 16px 50px rgba(13,14,16,0.06);
        }
        .sbs-retry-banner h2 {
          margin-bottom: 10px;
          font-size: clamp(2rem, 4vw, 3.4rem);
        }
        .sbs-retry-banner p {
          margin: 0;
        }
        .sbs-sales-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.82fr) minmax(420px, 1.18fr);
          gap: clamp(30px, 5vw, 76px);
          align-items: center;
          max-width: 1280px;
          margin: 0 auto;
          padding: clamp(54px, 8vw, 110px) clamp(20px, 5vw, 64px);
        }
        .sbs-label {
          margin: 0 0 16px;
          color: #818283;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.36em;
          line-height: 1.7;
          text-transform: uppercase;
        }
        .sbs-sales h1 {
          max-width: 650px;
          margin: 0 0 24px;
          font-size: clamp(4rem, 8.5vw, 7.2rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.9;
        }
        .sbs-sales h2 {
          margin: 0 0 18px;
          font-size: clamp(2.7rem, 5vw, 5rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.96;
        }
        .sbs-sales p {
          max-width: 570px;
          color: #4F5052;
          font-size: 16px;
          line-height: 1.8;
        }
        .sbs-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 28px;
        }
        .sbs-primary,
        .sbs-secondary {
          min-height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 15px 22px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-decoration: none;
          text-transform: uppercase;
        }
        .sbs-primary {
          background: #0D0E10;
          color: #F8FAFA;
        }
        .sbs-secondary {
          border: 1px solid rgba(197,198,200,0.62);
          color: #0D0E10;
        }
        .sbs-sales-board {
          position: relative;
          min-height: clamp(500px, 58vw, 760px);
        }
        .sbs-sales-image {
          position: absolute;
          margin: 0;
          overflow: hidden;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.45);
        }
        .sbs-sales-image-0 {
          inset: 0 27% 12% 10%;
        }
        .sbs-sales-image-1 {
          inset: 15% 0 0 54%;
        }
        .sbs-sales-image-2 {
          inset: 58% 42% 0 0;
        }
        .sbs-sales-image figcaption {
          position: absolute;
          left: 12px;
          right: 12px;
          bottom: 12px;
          padding: 9px 10px;
          background: rgba(13,14,16,0.68);
          color: #F8FAFA;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .sbs-sales-strip,
        .sbs-sales-proof {
          max-width: 1180px;
          margin: 0 auto;
          padding: clamp(46px, 7vw, 84px) clamp(20px, 5vw, 64px);
          border-top: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-sales-strip {
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
          gap: 34px;
          align-items: end;
        }
        .sbs-sales-path {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 clamp(20px, 5vw, 64px) clamp(48px, 7vw, 88px);
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 1px;
        }
        .sbs-sales-deliverables {
          max-width: 1180px;
          margin: 0 auto;
          padding: 0 clamp(20px, 5vw, 64px) clamp(48px, 7vw, 70px);
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
        }
        .sbs-sales-deliverables article {
          min-height: 250px;
          display: grid;
          align-content: end;
          gap: 14px;
          padding: 22px;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-sales-deliverables h3 {
          margin: 0;
          color: #0D0E10;
          font-size: clamp(2rem, 3vw, 3.1rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 0.98;
        }
        .sbs-sales-deliverables p {
          margin: 0;
          color: #4F5052;
          font-size: 14px;
          line-height: 1.7;
        }
        .sbs-sales-path article {
          min-height: 190px;
          padding: 22px;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-sales-path span {
          display: block;
          margin-bottom: 30px;
          color: #818283;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
        }
        .sbs-sales-path p {
          margin: 0;
          font-size: 14px;
          line-height: 1.65;
        }
        .sbs-sales-proof {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: clamp(30px, 5vw, 70px);
          align-items: center;
          padding-bottom: clamp(70px, 10vw, 120px);
        }
        .sbs-proof-image {
          position: relative;
          min-height: clamp(520px, 58vw, 720px);
          border: 1px solid rgba(197,198,200,0.45);
          background: #FFFFFF;
          overflow: hidden;
        }
        @media (max-width: 860px) {
          .sbs-sales-hero,
          .sbs-sales-strip,
          .sbs-sales-proof,
          .sbs-retry-banner {
            grid-template-columns: 1fr;
          }
          .sbs-sales h1 {
            font-size: clamp(3.4rem, 16vw, 5.4rem);
          }
          .sbs-sales-board {
            min-height: 520px;
          }
          .sbs-sales-image-0 {
            inset: 0 18% 18% 0;
          }
          .sbs-sales-image-1 {
            inset: 32% 0 0 48%;
          }
          .sbs-sales-image-2 {
            inset: 63% 42% 0 0;
          }
          .sbs-sales-path {
            grid-template-columns: 1fr;
          }
          .sbs-sales-deliverables {
            grid-template-columns: 1fr;
          }
          .sbs-sales-path article {
            min-height: unset;
          }
          .sbs-sales-deliverables article {
            min-height: 190px;
          }
        }
      `}</style>
    </main>
  )
}
