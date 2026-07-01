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
  description: "A guided first-shoot path for turning one clear selfie into brand images you can actually use.",
}

const featured = VAULT_COLLECTION_META.slice(0, 4)

const path = [
  "Choose the right selfie.",
  "Pick your signature look.",
  "Create your first three AI brand images.",
  "Choose the images that still look like you.",
  "Turn them into content you can actually post.",
]

const whatYouCreate = [
  {
    title: "A profile image",
    copy: "A clear first-impression image that still feels like you.",
  },
  {
    title: "A reel cover",
    copy: "A stronger image you can use for covers, hooks, carousels, or your grid.",
  },
  {
    title: "A lifestyle image",
    copy: "A less posed image for stories, soft selling, and everyday content.",
  },
  {
    title: "A 3x3 feed direction",
    copy: "A simple visual rhythm so your Instagram starts feeling connected instead of random.",
  },
  {
    title: "A 7-day content plan",
    copy: "A clear way to use the images, so they do not just sit in your camera roll.",
  },
]

const whatYouLearn = [
  "Choose the selfie that gives AI the best chance of keeping you recognizable.",
  "Pick one Signature Visual World so your brand starts looking connected, not random.",
  "Create your first 3-image AI brand shoot with simple prompts and Maya support.",
  "Use the Keep / Fix / Delete filter so you stop saving images that look pretty but do not look like you.",
  "Turn your final images into posts, stories, reel covers, offer visuals, and profile updates.",
]

const forYouIf = [
  "You know your content could look clearer and more intentional.",
  "You want brand photos, but you are not ready to book a full photoshoot.",
  "You have tried AI images before, but the results looked random, fake, or nothing like you.",
  "You want your Instagram, website, and offers to feel more connected.",
  "You want to look like the woman you are becoming online.",
]

const systemValue = [
  "Full 5-module guided first-shoot path",
  "Prompt Vault included",
  "Visual Consistency Code worksheet",
  "Maya Prompt Concierge workflow",
  "Keep / Fix / Delete image filter",
  "7-day posting plan",
]

const systemFaq = [
  {
    question: "What is Selfie to Brand Shoot?",
    answer:
      "It is the guided first-shoot path that shows you how to turn one clear selfie into a small set of AI brand images, then use those images in your content.",
  },
  {
    question: "Will the images still feel like me?",
    answer:
      "That is the point. You learn how to choose images that still look recognizable, fit your visual world, and feel believable enough to post.",
  },
  {
    question: "Do I need a photographer or studio?",
    answer: "No. You start with one clear selfie, your phone, and a simple visual direction.",
  },
  {
    question: "What if I already bought the Vault or Starter Kit?",
    answer:
      "Your $27 Vault purchase or $37 Starter Kit purchase can be credited toward the System when you come from your buyer access page.",
  },
]

const transformationProof = [
  {
    label: "Source selfie",
    title: "Start with one clear photo",
    image: "/images/selfie-to-brand-shoot/source-selfie-front.jpg",
    alt: "Clear source selfie example for the Selfie to Brand Shoot System",
  },
  {
    label: "Brand shoot result",
    title: "Create the first brand image",
    image: "/images/selfie-to-brand-shoot/module-5-content-use/profile-identity-cafe.jpg",
    alt: "AI personal brand shoot result created from a source selfie",
  },
  {
    label: "Where it goes",
    title: "Use it for your profile, reel cover, story, or offer",
    image: "/images/selfie-to-brand-shoot/module-5-content-use/reel-cover-cafe.jpg",
    alt: "Editorial reel cover example from the Selfie to Brand Shoot System",
  },
]

const sameWorldUses = [
  {
    label: "Profile image",
    image: "/images/selfie-to-brand-shoot/module-5-content-use/profile-identity-cafe.jpg",
    alt: "Profile image example from one cohesive visual world",
  },
  {
    label: "Reel cover",
    image: "/images/selfie-to-brand-shoot/module-5-content-use/reel-cover-cafe.jpg",
    alt: "Reel cover example from one cohesive visual world",
  },
  {
    label: "Story image",
    image: "/images/selfie-to-brand-shoot/module-5-content-use/story-intro-lipstick.jpg",
    alt: "Story image example from one cohesive visual world",
  },
]

const systemPreview = [
  {
    module: "Module 1",
    title: "Choose the selfie",
    image: "/images/selfie-to-brand-shoot/module-1-source-selfies/good-front-selfie.png",
    alt: "Module 1 source selfie decision preview",
  },
  {
    module: "Module 2",
    title: "Pick the visual world",
    image: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-05-brand-anchor.jpeg",
    alt: "Module 2 signature visual world preview",
  },
  {
    module: "Module 3",
    title: "Build the prompt",
    image: "/images/selfie-to-brand-shoot/module-2-signature-world/signature-grid-07-work-creator.jpeg",
    alt: "Module 3 brand shoot prompt preview",
  },
  {
    module: "Module 4",
    title: "Keep what still looks like you",
    image: "/images/selfie-to-brand-shoot/module-5-content-use/about-me-balcony.jpg",
    alt: "Module 4 image selection preview",
  },
  {
    module: "Module 5",
    title: "Turn it into content",
    image: "/images/selfie-to-brand-shoot/module-5-content-use/lifestyle-work-laptop.jpg",
    alt: "Module 5 content planning preview",
  },
]

const customerProof = {
  name: "Laurie Garcia",
  detail: "48-year-old business owner and esthetician",
  quote:
    "It took one session and 1 post for my reel views to go up by 40%. The technology and effort that has been put into this app is absolutely amazing and worth every penny.",
  note:
    "Laurie described SSELFIE as her personal photographer, assistant, marketer, advisor, strategist, cheerleader, tech guide, and social media expert.",
}

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
            Start with one clear selfie. Bring your real face, your style, and the direction you
            want people to recognize.
          </p>
          <p>
            You need one clear selfie, the right visual direction, and a simple system that shows
            you what to do next.
          </p>
          <p>
            I will show you how to choose the right selfie, pick your signature look, create your
            first AI brand images, choose the ones that still look like you, and turn them into
            content you can actually post.
          </p>
          <p>
            This is for the moment when you don&apos;t need more random images. You need one clear
            direction that helps people understand who you&apos;re becoming online.
          </p>
          <p className="sbs-price-line">
            The full System. $197 one-time. Prompt Vault included.
          </p>
          <div className="sbs-actions">
            <Link href="/checkout/selfie-to-brand-shoot" className="sbs-primary">
              Start The System · $197
            </Link>
            <Link href="/prompt-vault" className="sbs-secondary">
              View The Vault
            </Link>
          </div>
          <p className="sbs-risk-line">
            One payment. Instant access. Reply to me and a real person, usually me, helps.
          </p>
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

      <section className="sbs-proof-strip">
        <div className="sbs-proof-intro">
          <p className="sbs-label">WHAT THIS ACTUALLY LOOKS LIKE</p>
          <h2 className={cormorant.className}>One selfie becomes something your brand can use.</h2>
          <p>
            The point is not to make a folder of pretty AI images. The point is to move from one
            usable source photo into visuals that help your profile, offers, and content feel easier
            to understand.
          </p>
        </div>
        <div className="sbs-transformation-row">
          {transformationProof.map((item, index) => (
            <article key={item.label} className="sbs-transform-card">
              <div className="sbs-transform-image">
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 768px) 86vw, 27vw"
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p className="sbs-label">{item.label}</p>
              <h3 className={cormorant.className}>{item.title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="sbs-customer-proof">
        <div>
          <p className="sbs-label">REAL CUSTOMER PROOF</p>
          <h2 className={cormorant.className}>This is for women who are ready to look clearer online.</h2>
          <p>
            The result is not only a prettier image. It is clarity around how your face, story, and
            visuals can start working together so people understand what you&apos;re building.
          </p>
        </div>
        <article className="sbs-customer-quote">
          <blockquote>&ldquo;{customerProof.quote}&rdquo;</blockquote>
          <div>
            <strong>{customerProof.name}</strong>
            <span>{customerProof.detail}</span>
          </div>
          <p>{customerProof.note}</p>
        </article>
      </section>

      <section className="sbs-sales-strip">
        <div>
          <p className="sbs-label">WHAT YOU&apos;LL CREATE</p>
          <h2 className={cormorant.className}>Your first AI brand shoot, from one selfie.</h2>
        </div>
        <p>
          Inside the system, you will build a small but useful set of brand images you can use
          across your Instagram, website, offers, stories, and everyday content. The full Prompt
          Vault is included, but this is not just a folder of prompts.
        </p>
      </section>

      <section className="sbs-value-stack">
        <div>
          <p className="sbs-label">WHAT IS INCLUDED</p>
          <h2 className={cormorant.className}>A guided first-shoot path, not another prompt folder.</h2>
          <p>
            If you bought the Vault or Starter Kit, that purchase can come off when you enter from
            your buyer access page.
          </p>
        </div>
        <div className="sbs-value-list">
          {systemValue.map(item => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </section>

      <section className="sbs-sales-deliverables">
        {whatYouCreate.map(item => (
          <article key={item.title}>
            <h3 className={cormorant.className}>{item.title}</h3>
            <p>{item.copy}</p>
          </article>
        ))}
      </section>

      <section className="sbs-world-proof">
        <div>
          <p className="sbs-label">ONE VISUAL WORLD, MANY USES</p>
          <h2 className={cormorant.className}>Your images should feel connected, not copied.</h2>
          <p>
            You are not choosing a new aesthetic every time you post. You are building one
            recognizable look that can stretch across different content moments.
          </p>
        </div>
        <div className="sbs-world-grid" aria-label="One visual world shown across three content uses">
          {sameWorldUses.map(item => (
            <figure key={item.label}>
              <Image
                src={item.image}
                alt={item.alt}
                fill
                sizes="(max-width: 768px) 86vw, 19vw"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
              <figcaption>{item.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="sbs-sales-learn">
        <div>
          <p className="sbs-label">WHAT YOU&apos;LL LEARN</p>
          <h2 className={cormorant.className}>The simple path from selfie to brand images.</h2>
        </div>
        <div className="sbs-learn-list">
          {whatYouLearn.map(item => (
            <article key={item}>
              <span />
              <p>{item}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sbs-sales-path">
        {path.map((step, index) => (
          <article key={step}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{step}</p>
          </article>
        ))}
      </section>

      <section className="sbs-system-preview">
        <div>
          <p className="sbs-label">INSIDE THE SYSTEM</p>
          <h2 className={cormorant.className}>You are not left guessing what to do next.</h2>
          <p>
            Each module gives you one decision, one action, and one clear output so the process
            feels guided instead of overwhelming.
          </p>
        </div>
        <div className="sbs-system-strip">
          {systemPreview.map(item => (
            <article key={item.module}>
              <div>
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes="(max-width: 768px) 82vw, 16vw"
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
              <p className="sbs-label">{item.module}</p>
              <h3 className={cormorant.className}>{item.title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="sbs-sales-for-you">
        <div>
          <p className="sbs-label">THIS IS FOR YOU IF</p>
          <h2 className={cormorant.className}>
            You want better brand photos, but you do not know where to start.
          </h2>
        </div>
        <div>
          {forYouIf.map(item => (
            <p key={item}>{item}</p>
          ))}
        </div>
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
          <h2 className={cormorant.className}>This is not about making random AI photos.</h2>
          <p>
            It is about creating a visual direction your audience can start recognizing.
          </p>
          <p>
            One selfie. One visual world. One small brand shoot you can actually use.
          </p>
          <p>
            If you already bought the Vault, your $27 can be credited toward the full System from
            your Vault access page.
          </p>
          <Link href="/checkout/selfie-to-brand-shoot" className="sbs-primary">
            Enter Selfie To Brand Shoot · $197
          </Link>
          <p className="sbs-risk-line">
            One payment. Instant access. Reply to me and a real person, usually me, helps.
          </p>
        </div>
      </section>

      <section className="sbs-faq">
        <div>
          <p className="sbs-label">A FEW QUICK ANSWERS</p>
          <h2 className={cormorant.className}>Before you start the System.</h2>
        </div>
        <div className="sbs-faq-list">
          {systemFaq.map(item => (
            <article key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </article>
          ))}
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
        .sbs-price-line {
          margin: 24px 0 0;
          color: #0D0E10;
          font-size: 14px;
          line-height: 1.7;
        }
        .sbs-risk-line {
          margin: 12px 0 0;
          max-width: 430px;
          color: #818283;
          font-size: 12px;
          line-height: 1.7;
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
        .sbs-sales-learn,
        .sbs-sales-for-you,
        .sbs-proof-strip,
        .sbs-customer-proof,
        .sbs-value-stack,
        .sbs-world-proof,
        .sbs-system-preview,
        .sbs-sales-proof,
        .sbs-faq {
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
        .sbs-sales-learn,
        .sbs-proof-strip,
        .sbs-customer-proof,
        .sbs-value-stack,
        .sbs-world-proof,
        .sbs-system-preview,
        .sbs-sales-for-you,
        .sbs-faq {
          display: grid;
          grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
          gap: clamp(28px, 5vw, 68px);
          align-items: start;
        }
        .sbs-customer-quote {
          display: grid;
          gap: 24px;
          padding: clamp(24px, 4vw, 40px);
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-customer-quote blockquote {
          margin: 0;
          color: #0D0E10;
          font-size: clamp(1.45rem, 2.3vw, 2.35rem);
          font-weight: 300;
          line-height: 1.42;
        }
        .sbs-customer-quote strong,
        .sbs-customer-quote span {
          display: block;
        }
        .sbs-customer-quote strong {
          margin-bottom: 6px;
          color: #0D0E10;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .sbs-customer-quote span {
          color: #818283;
          font-size: 13px;
          line-height: 1.6;
        }
        .sbs-customer-quote p {
          max-width: none;
          margin: 0;
          padding-top: 22px;
          border-top: 1px solid rgba(197,198,200,0.35);
          color: #4F5052;
          font-size: 14px;
          line-height: 1.75;
        }
        .sbs-value-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-value-list p {
          max-width: none;
          margin: 0;
          padding: 20px;
          background: #FFFFFF;
          color: #0D0E10;
          font-size: 14px;
          line-height: 1.6;
        }
        .sbs-proof-intro {
          position: sticky;
          top: 24px;
        }
        .sbs-transformation-row {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-transform-card {
          min-width: 0;
          display: grid;
          gap: 12px;
          padding: 16px;
          background: #FFFFFF;
        }
        .sbs-transform-image {
          position: relative;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.28);
        }
        .sbs-transform-card > span {
          color: #818283;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.22em;
        }
        .sbs-transform-card .sbs-label {
          margin: 0;
        }
        .sbs-transform-card h3,
        .sbs-system-strip h3 {
          margin: 0;
          color: #0D0E10;
          font-size: clamp(1.9rem, 2.4vw, 2.8rem);
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 1;
        }
        .sbs-world-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1px;
          min-width: 0;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-world-grid figure {
          position: relative;
          min-height: clamp(360px, 36vw, 500px);
          margin: 0;
          overflow: hidden;
          background: #FFFFFF;
        }
        .sbs-world-grid figcaption {
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
        .sbs-system-strip {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-system-strip article {
          min-width: 0;
          display: grid;
          align-content: start;
          gap: 14px;
          padding: 14px;
          background: #FFFFFF;
        }
        .sbs-system-strip article > div {
          position: relative;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          background: #F8FAFA;
          border: 1px solid rgba(197,198,200,0.28);
        }
        .sbs-system-strip .sbs-label {
          margin: 0;
        }
        .sbs-learn-list {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-learn-list article {
          display: grid;
          grid-template-columns: 14px minmax(0, 1fr);
          gap: 16px;
          align-items: start;
          padding: 18px 20px;
          background: #FFFFFF;
        }
        .sbs-learn-list span {
          width: 7px;
          height: 7px;
          margin-top: 10px;
          border-radius: 999px;
          background: #0D0E10;
        }
        .sbs-learn-list p,
        .sbs-sales-for-you p {
          max-width: none;
          margin: 0;
        }
        .sbs-sales-for-you > div:last-child {
          display: grid;
          gap: 14px;
          padding: 26px;
          background: #FFFFFF;
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-sales-for-you > div:last-child p {
          padding-bottom: 14px;
          border-bottom: 1px solid rgba(197,198,200,0.28);
        }
        .sbs-sales-for-you > div:last-child p:last-child {
          padding-bottom: 0;
          border-bottom: 0;
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
        .sbs-faq-list {
          display: grid;
          gap: 1px;
          background: rgba(197,198,200,0.35);
          border: 1px solid rgba(197,198,200,0.35);
        }
        .sbs-faq-list article {
          padding: 24px;
          background: #FFFFFF;
        }
        .sbs-faq-list h3 {
          margin: 0 0 10px;
          color: #0D0E10;
          font-size: 16px;
          font-weight: 500;
          line-height: 1.4;
        }
        .sbs-faq-list p {
          margin: 0;
          color: #4F5052;
          font-size: 14px;
          line-height: 1.75;
        }
        @media (max-width: 860px) {
          .sbs-sales-hero,
          .sbs-sales-strip,
          .sbs-sales-learn,
          .sbs-proof-strip,
          .sbs-customer-proof,
          .sbs-value-stack,
          .sbs-world-proof,
          .sbs-system-preview,
          .sbs-sales-for-you,
          .sbs-sales-proof,
          .sbs-faq,
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
          .sbs-transformation-row,
          .sbs-world-grid,
          .sbs-system-strip {
            grid-template-columns: 1fr;
          }
          .sbs-proof-intro {
            position: static;
          }
          .sbs-world-grid figure {
            min-height: 460px;
          }
          .sbs-sales-deliverables {
            grid-template-columns: 1fr;
          }
          .sbs-value-list {
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
