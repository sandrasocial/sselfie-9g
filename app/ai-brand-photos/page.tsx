import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500"] })

export const metadata: Metadata = {
  title: "How to Create Professional Brand Photos with AI — No Photographer Needed",
  description:
    "A step-by-step guide to creating professional brand photos using AI. Sandra shows you how she generates unlimited on-brand photos with SSELFIE — no studio, no schedule, no €500 shoots.",
  openGraph: {
    title: "How to Create Professional Brand Photos with AI",
    description:
      "Stop booking photography shoots. Here's exactly how to create professional brand photos with AI — in your style, on demand, for less than €3/day.",
    url: "https://sselfie.ai/ai-brand-photos",
    type: "article",
    images: [{ url: "https://sselfie.ai/og-image.png", width: 1200, height: 630 }],
  },
  alternates: { canonical: "https://sselfie.ai/ai-brand-photos" },
}

const BLOB = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com"
const IMAGES = {
  hero: `${BLOB}/maya-pro-generations/30vxpdwy61rmw0cvdxj8apjzgc-xG6gcWZ8hR4QLToseBbqTGM0dPr9NM.png`,
  result1: `${BLOB}/maya-pro-generations/mg0q5j29yhrmr0cvh4gax57cnr-p22TsIJ1grFHwnQrt2tXZ5foPm1vvv.png`,
  result2: `${BLOB}/maya-generations/8239-hQrbpFYBbCHzcY8YQ95YKqqpZmbdbW.png`,
  result3: `${BLOB}/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png`,
  result4: `${BLOB}/maya-generations/8227-Y8Hi0TmnDBrZmgOGBbRXt1jk4eigZR.png`,
  sandra: `${BLOB}/tmpbmq4nfg7.png`,
  result5: `${BLOB}/maya-pro-generations/c8cjbbd6ehrmt0cvhqasfj7q30-CVfFXH8JOv3NtYQFMbPU0opeNPo6De.png`,
}

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Create Professional Brand Photos with AI",
  description:
    "A step-by-step guide to generating professional AI brand photos using SSELFIE — no photographer, no studio, no lighting equipment needed.",
  totalTime: "PT30M",
  estimatedCost: { "@type": "MonetaryAmount", currency: "USD", value: "17" },
  tool: [{ "@type": "HowToTool", name: "SSELFIE (sselfie.ai)" }, { "@type": "HowToTool", name: "Smartphone camera" }],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Take 15–20 selfies in natural light",
      text: "Stand near a window. No ring light needed. Take photos from different angles — front-facing, slight left, slight right, looking down. Natural, unposed expressions work best. The more variety, the better your AI model.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Upload your selfies and train your custom model",
      text: "Upload your photos to SSELFIE. Maya trains a custom AI model specifically on your face — this takes about 20 minutes. You only do this once. Every photo generated after uses this model, so every result looks like you.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Tell Maya what kind of photo you need",
      text: "Chat with Maya like you'd text a friend. 'I need a confident headshot for my LinkedIn.' 'I want something warm and approachable for my email list.' Maya already knows your brand profile — she'll suggest styles that fit.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Maya generates your photo",
      text: "Click generate. Maya creates your photo in about 30 seconds. You'll see it appear directly in the chat. If it's not right, just describe the change — 'make it warmer' or 'try a different background' — and regenerate.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Download and use it everywhere",
      text: "Save your photo to your gallery. Use it on Instagram, your website, email headers, course platforms, anywhere you need to show up professionally. Studio members get 200 credits per month — that's 200 new brand photos.",
    },
  ],
}

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "How to Create Professional Brand Photos with AI — No Photographer Needed",
  description:
    "Sandra, founder of SSELFIE, shares the exact process she uses to create unlimited professional brand photos with AI — for less than the cost of one photography shoot per month.",
  author: {
    "@type": "Person",
    name: "Sandra",
    url: "https://sselfie.ai",
    jobTitle: "Founder, SSELFIE",
    sameAs: ["https://instagram.com/sandra.social"],
  },
  publisher: { "@type": "Organization", name: "SSELFIE", url: "https://sselfie.ai" },
  datePublished: "2026-03-16",
  dateModified: "2026-03-16",
  mainEntityOfPage: "https://sselfie.ai/ai-brand-photos",
}

export default function AIBrandPhotosPage() {
  return (
    <main className={`page ${inter.className}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

      {/* HEADER */}
      <header className="site-header">
        <Link href="/" className={`logo ${cormorant.className}`}>SSELFIE</Link>
        <Link href="/checkout/membership" className="header-cta">Start Free →</Link>
      </header>

      {/* HERO */}
      <section className="hero">
        <div className="hero-image-wrap">
          <Image src={IMAGES.hero} alt="AI-generated brand photo by SSELFIE" fill priority sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center 20%", filter: "brightness(0.45)" }} />
        </div>
        <div className="hero-content">
          <p className="eyebrow">HOW-TO GUIDE · 2026</p>
          <h1 className={cormorant.className}>
            How to Create Professional Brand Photos with AI
          </h1>
          <p className="hero-sub">
            No photographer. No studio. No €500 shoot every time you need a new photo.
            Here's exactly how I do it — and how you can too.
          </p>
          <p className="byline">By Sandra · Founder, SSELFIE</p>
        </div>
      </section>

      {/* ARTICLE BODY */}
      <article className="article">

        {/* THE PROBLEM */}
        <section className="prose-section">
          <p className="section-label">01 — THE PROBLEM</p>
          <h2 className={cormorant.className}>I was spending €500 every time I needed a photo.</h2>
          <p>
            I built a personal brand from Iceland. Single mum, running everything myself. Every time I
            launched something new — a course, an offer, a rebrand — I needed new photos. Which meant
            booking a photographer, waiting two weeks, paying €500, and crossing my fingers the shots
            would actually work.
          </p>
          <p>
            Most of the time, they didn't. Wrong vibe. Wrong lighting. Too stiff. And by the time I
            got them, the launch window had passed.
          </p>
          <p>
            So I built something different. A tool that creates professional brand photos on demand —
            in your style, with your face, in under a minute. That's SSELFIE.
          </p>
        </section>

        {/* HOW IT WORKS */}
        <section className="prose-section">
          <p className="section-label">02 — HOW IT WORKS</p>
          <h2 className={cormorant.className}>AI trains on your face. Every photo looks like you.</h2>
          <p>
            Most AI photo tools use a generic model. You get a photo of a person — just not really you.
            SSELFIE is different. We train a custom AI model specifically on your face, using photos you
            upload. After that, every single generation is you.
          </p>
          <p>
            The model also knows your brand. Your colours, your vibe, your voice. So when Maya — our
            AI — generates a photo, it's not just you in the frame. It's you, in your brand.
          </p>
        </section>

        {/* RESULTS GALLERY */}
        <section className="gallery-section">
          <p className="section-label">03 — RESULTS</p>
          <h2 className={`gallery-heading ${cormorant.className}`}>What the photos actually look like.</h2>
          <div className="gallery-grid">
            {[IMAGES.result1, IMAGES.result2, IMAGES.result3, IMAGES.result4, IMAGES.result5].map((src, i) => (
              <div key={i} className="gallery-item">
                <Image src={src} alt={`AI brand photo example ${i + 1} — generated by SSELFIE`}
                  fill sizes="(max-width: 600px) 100vw, 33vw" style={{ objectFit: "cover" }} />
              </div>
            ))}
            <div className="gallery-caption">
              <p>These were all generated with SSELFIE. No studio. No photographer. Just Maya and a selfie.</p>
            </div>
          </div>
        </section>

        {/* STEP-BY-STEP */}
        <section className="prose-section">
          <p className="section-label">04 — STEP BY STEP</p>
          <h2 className={cormorant.className}>How to create your first AI brand photo.</h2>
          <p>This takes about 30 minutes the first time. After that, each new photo takes under a minute.</p>

          {[
            {
              step: "01",
              title: "Take 15–20 selfies in natural light",
              body: "Stand near a window. No ring light needed, no professional setup. Take photos from slightly different angles — front on, slight left, slight right, chin down, looking up. Variety matters more than perfection. Casual, genuine expressions tend to produce better results than forced smiles.",
            },
            {
              step: "02",
              title: "Upload and train your custom model",
              body: "Upload your selfies to SSELFIE. Maya trains a custom AI model on your face — this runs in the background and takes about 20 minutes. You only do this once. From then on, every photo generated uses this model. The more photos you upload, the more accurate it gets.",
            },
            {
              step: "03",
              title: "Tell Maya what you need",
              body: "This part feels like texting. 'I need a professional headshot for my website.' 'Something warm and personal for my newsletter.' 'A dark, moody shot for my new offer launch.' Maya knows your brand profile — she'll interpret your brief and suggest options that fit your aesthetic.",
            },
            {
              step: "04",
              title: "Generate and refine",
              body: "Click generate. Your photo appears in about 30 seconds. If something's off — the background, the lighting, the expression — just say so. 'Make it warmer.' 'Try outdoors.' 'Less formal.' Regenerate until it's right. You're not locked into anything.",
            },
            {
              step: "05",
              title: "Download and use everywhere",
              body: "Save to your gallery. Use on Instagram, LinkedIn, your website hero, email headers, Canva templates, slide decks — anywhere you show up professionally. Studio members generate up to 200 photos per month.",
            },
          ].map(({ step, title, body }) => (
            <div key={step} className="step-card">
              <span className="step-num">STEP {step}</span>
              <h3 className={cormorant.className}>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </section>

        {/* COST COMPARISON */}
        <section className="comparison-section">
          <p className="section-label">05 — THE MATH</p>
          <h2 className={cormorant.className}>What it costs vs. a photographer.</h2>
          <table className="cost-table">
            <thead>
              <tr>
                <th>Method</th>
                <th>Cost</th>
                <th>Turnaround</th>
                <th>Photos/month</th>
              </tr>
            </thead>
            <tbody>
              <tr className="row-highlight">
                <td><strong>SSELFIE Studio</strong></td>
                <td>$97/month</td>
                <td>30 seconds</td>
                <td>200 photos</td>
              </tr>
              <tr>
                <td>Photographer (mid-range)</td>
                <td>€500–€1,500/shoot</td>
                <td>2–3 weeks</td>
                <td>30–60 edited</td>
              </tr>
              <tr>
                <td>VA + stock photos</td>
                <td>€500–€1,500/month</td>
                <td>1–2 days</td>
                <td>Not your face</td>
              </tr>
              <tr>
                <td>DIY with phone</td>
                <td>Free</td>
                <td>Now</td>
                <td>Inconsistent quality</td>
              </tr>
            </tbody>
          </table>
          <p className="table-note">
            SSELFIE Studio works out to less than €3.50/day. One coffee. For unlimited professional brand photos, every month.
          </p>
        </section>

        {/* SANDRA'S NOTE */}
        <section className="note-section">
          <div className="note-image-wrap">
            <Image src={IMAGES.sandra} alt="Sandra — Founder of SSELFIE" fill
              sizes="(max-width: 700px) 100vw, 45vw" style={{ objectFit: "cover", objectPosition: "center top" }} />
          </div>
          <div className="note-body">
            <p className="section-label">FROM SANDRA</p>
            <blockquote>
              "I know what it's like to need a professional photo today — not in two weeks after a shoot, not after three rounds of editing, not after paying for something that didn't feel like me.
              <br /><br />
              That's why I built SSELFIE. I wanted a tool that knew my face, knew my brand, and could give me a new photo in the time it takes to write a caption.
              <br /><br />
              Over 180,000 personal brand builders follow what I create with this. Now you can create the same thing — in your style, with your face."
            </blockquote>
            <p className="sig">— Sandra, Founder of SSELFIE</p>
            <Link href="/selfie-guide" className="note-cta">Start with the Selfie Guide — $17 →</Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="faq-section">
          <p className="section-label">06 — COMMON QUESTIONS</p>
          <h2 className={cormorant.className}>Things people ask before they start.</h2>
          <div className="faq-list">
            {[
              {
                q: "Will the photos actually look like me?",
                a: "Yes — that's the whole point. SSELFIE trains a custom model on your face. Generic AI tools produce photos of 'a person'. SSELFIE produces photos of you. Upload more selfies for better accuracy.",
              },
              {
                q: "Do I need a good camera?",
                a: "No. Your phone is fine. Natural window light works better than a ring light. The main thing is variety — different angles, different expressions. Studio-quality images are not necessary.",
              },
              {
                q: "How long does training take?",
                a: "About 20 minutes. You only train once. Every photo you generate after that uses your personal model.",
              },
              {
                q: "What can I use the photos for?",
                a: "Anything. Instagram, LinkedIn profiles, website hero images, email headers, course thumbnails, presentation slides, press pages. All commercial use is included.",
              },
              {
                q: "What's the difference between the Selfie Guide and Studio?",
                a: "The Selfie Guide ($17, one-time) teaches you Sandra's exact framework for taking selfies that work for personal brand content — plus gives you access to try SSELFIE. Studio ($97/month) is the full membership with 200 credits, unlimited generation, and Maya remembering your brand across every session.",
              },
              {
                q: "Can I cancel Studio anytime?",
                a: "Yes. No contracts, no lock-in. Cancel from your account settings whenever you want. Your generated photos stay with you.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="faq-item">
                <summary className={cormorant.className}>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="cta-section">
          <h2 className={cormorant.className}>Ready to stop waiting for shoots?</h2>
          <p>Start with the $17 Selfie Guide and take your first AI brand photo today.</p>
          <div className="cta-group">
            <Link href="/selfie-guide" className="btn-primary">Start with Selfie Guide — $17</Link>
            <Link href="/checkout/membership" className="btn-outline">Join Studio — $97/mo</Link>
          </div>
        </section>

      </article>

      {/* FOOTER */}
      <footer className="site-footer">
        <Link href="/" className={`footer-logo ${cormorant.className}`}>SSELFIE</Link>
        <nav className="footer-nav">
          <Link href="/selfie-guide">Selfie Guide</Link>
          <Link href="/brand-strategy">Brand Strategy</Link>
          <Link href="/why-studio">Studio</Link>
          <Link href="/privacy">Privacy</Link>
        </nav>
        <p className="footer-copy">© 2026 SSELFIE Studio · sselfie.ai</p>
      </footer>

      <style jsx>{`
        .page { background: #0d0c0b; color: #f0ede8; min-height: 100vh; }

        /* HEADER */
        .site-header {
          padding: 24px 48px; display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid rgba(195,190,182,0.12); position: sticky; top: 0; z-index: 50;
          background: rgba(13,12,11,0.92); backdrop-filter: blur(20px);
        }
        .logo { font-size: 22px; letter-spacing: 0.12em; color: #f0ede8; text-decoration: none; font-weight: 300; }
        .header-cta {
          font-size: 12px; letter-spacing: 0.12em; color: #0d0c0b; background: #c8c4bb;
          padding: 8px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;
        }
        .header-cta:hover { background: #f0ede8; }

        /* HERO */
        .hero { position: relative; height: 70vh; min-height: 480px; display: flex; align-items: flex-end; }
        .hero-image-wrap { position: absolute; inset: 0; }
        .hero-content {
          position: relative; z-index: 1; padding: 56px 48px;
          background: linear-gradient(to top, rgba(13,12,11,0.85) 0%, transparent 100%);
          width: 100%;
        }
        .eyebrow { font-size: 11px; letter-spacing: 0.18em; color: #8a8780; margin-bottom: 16px; }
        h1 { font-size: clamp(36px, 5vw, 58px); font-weight: 300; line-height: 1.15; max-width: 760px; margin: 0 0 20px; }
        .hero-sub { font-size: 17px; font-weight: 300; color: #c8c4bb; max-width: 560px; line-height: 1.65; margin: 0 0 16px; }
        .byline { font-size: 12px; color: #8a8780; letter-spacing: 0.08em; }

        /* ARTICLE */
        .article { max-width: 860px; margin: 0 auto; padding: 0 24px; }

        /* PROSE SECTION */
        .prose-section { padding: 72px 0 40px; border-top: 1px solid rgba(195,190,182,0.10); margin-top: 8px; }
        .section-label { font-size: 10px; letter-spacing: 0.2em; color: #8a8780; text-transform: uppercase; margin-bottom: 24px; }
        .prose-section h2 { font-size: clamp(28px, 3.5vw, 42px); font-weight: 300; line-height: 1.2; margin: 0 0 28px; }
        .prose-section p { font-size: 16px; line-height: 1.8; color: #c8c4bb; margin-bottom: 20px; }

        /* STEPS */
        .step-card {
          margin: 32px 0; padding: 28px 32px; border: 1px solid rgba(195,190,182,0.12);
          border-radius: 12px; background: rgba(175,170,162,0.05);
        }
        .step-num { font-size: 10px; letter-spacing: 0.2em; color: #8a8780; display: block; margin-bottom: 10px; }
        .step-card h3 { font-size: 24px; font-weight: 300; margin: 0 0 14px; }
        .step-card p { font-size: 15px; line-height: 1.75; color: #c8c4bb; margin: 0; }

        /* GALLERY */
        .gallery-section { padding: 72px 0 40px; border-top: 1px solid rgba(195,190,182,0.10); }
        .gallery-heading { font-size: clamp(28px, 3.5vw, 42px); font-weight: 300; margin: 0 0 40px; }
        .gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .gallery-item { position: relative; aspect-ratio: 3/4; border-radius: 10px; overflow: hidden; background: #1a1917; }
        .gallery-caption { grid-column: 1 / -1; padding: 16px 0; }
        .gallery-caption p { font-size: 13px; color: #8a8780; line-height: 1.6; }

        /* COST TABLE */
        .comparison-section { padding: 72px 0 40px; border-top: 1px solid rgba(195,190,182,0.10); }
        .comparison-section h2 { font-size: clamp(28px, 3.5vw, 42px); font-weight: 300; margin: 0 0 32px; }
        .cost-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .cost-table th {
          text-align: left; padding: 12px 16px; font-size: 10px; font-weight: 500;
          letter-spacing: 0.15em; color: #8a8780; border-bottom: 1px solid rgba(195,190,182,0.15);
        }
        .cost-table td { padding: 14px 16px; color: #c8c4bb; border-bottom: 1px solid rgba(195,190,182,0.08); }
        .row-highlight td { color: #f0ede8; background: rgba(175,170,162,0.07); }
        .row-highlight td:first-child { border-left: 2px solid rgba(195,190,182,0.4); }
        .table-note { font-size: 14px; color: #8a8780; margin-top: 20px; line-height: 1.6; }

        /* NOTE */
        .note-section {
          margin: 72px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 0;
          border: 1px solid rgba(195,190,182,0.12); border-radius: 16px; overflow: hidden;
        }
        .note-image-wrap { position: relative; min-height: 480px; }
        .note-body { padding: 48px 40px; display: flex; flex-direction: column; justify-content: center; }
        .note-body blockquote {
          font-size: 17px; line-height: 1.8; color: #c8c4bb; margin: 0 0 24px;
          font-style: italic; border: none; padding: 0;
        }
        .sig { font-size: 13px; color: #8a8780; margin-bottom: 32px; }
        .note-cta {
          align-self: flex-start; font-size: 13px; font-weight: 500; letter-spacing: 0.08em;
          color: #0d0c0b; background: #c8c4bb; padding: 12px 24px; border-radius: 8px;
          text-decoration: none; transition: background 0.15s;
        }
        .note-cta:hover { background: #f0ede8; }

        /* FAQ */
        .faq-section { padding: 72px 0 40px; border-top: 1px solid rgba(195,190,182,0.10); }
        .faq-section h2 { font-size: clamp(28px, 3.5vw, 42px); font-weight: 300; margin: 0 0 40px; }
        .faq-item {
          border-bottom: 1px solid rgba(195,190,182,0.10); padding: 20px 0; cursor: pointer;
        }
        .faq-item summary { font-size: 20px; font-weight: 300; color: #f0ede8; list-style: none; cursor: pointer; }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-item p { font-size: 15px; line-height: 1.75; color: #c8c4bb; margin: 16px 0 4px; }

        /* CTA SECTION */
        .cta-section {
          padding: 80px 0; text-align: center; border-top: 1px solid rgba(195,190,182,0.10); margin-top: 40px;
        }
        .cta-section h2 { font-size: clamp(32px, 4vw, 52px); font-weight: 300; margin: 0 0 16px; }
        .cta-section p { font-size: 16px; color: #8a8780; margin-bottom: 36px; }
        .cta-group { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn-primary {
          font-size: 14px; font-weight: 500; letter-spacing: 0.06em; color: #0d0c0b;
          background: #c8c4bb; padding: 14px 28px; border-radius: 8px; text-decoration: none;
          transition: background 0.15s;
        }
        .btn-primary:hover { background: #f0ede8; }
        .btn-outline {
          font-size: 14px; font-weight: 400; letter-spacing: 0.06em; color: #f0ede8;
          background: transparent; border: 1px solid rgba(195,190,182,0.3); padding: 14px 28px;
          border-radius: 8px; text-decoration: none; transition: border-color 0.15s;
        }
        .btn-outline:hover { border-color: rgba(195,190,182,0.6); }

        /* FOOTER */
        .site-footer {
          border-top: 1px solid rgba(195,190,182,0.12); padding: 40px 48px;
          display: flex; align-items: center; gap: 32px; flex-wrap: wrap;
        }
        .footer-logo { font-size: 18px; letter-spacing: 0.12em; color: #f0ede8; text-decoration: none; }
        .footer-nav { display: flex; gap: 24px; flex: 1; }
        .footer-nav a { font-size: 12px; color: #8a8780; text-decoration: none; letter-spacing: 0.08em; }
        .footer-nav a:hover { color: #f0ede8; }
        .footer-copy { font-size: 11px; color: #8a8780; letter-spacing: 0.06em; }

        @media (max-width: 768px) {
          .site-header { padding: 20px 24px; }
          .hero-content { padding: 40px 24px; }
          .article { padding: 0 16px; }
          .gallery-grid { grid-template-columns: repeat(2, 1fr); }
          .gallery-item:last-of-type { display: none; }
          .note-section { grid-template-columns: 1fr; }
          .note-image-wrap { min-height: 320px; }
          .cost-table { font-size: 13px; }
          .cost-table th, .cost-table td { padding: 10px 10px; }
          .site-footer { padding: 32px 24px; flex-direction: column; align-items: flex-start; gap: 20px; }
        }
      `}</style>
    </main>
  )
}
