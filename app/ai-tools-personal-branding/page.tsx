import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500"] })

export const metadata: Metadata = {
  title: "Best AI Tools for Personal Branding in 2026 — What Actually Works",
  description:
    "The honest guide to AI tools for personal branding. Sandra covers photo generation, caption writing, feed planning, and strategy — what to use, what to skip, and what to combine.",
  openGraph: {
    title: "Best AI Tools for Personal Branding in 2026 — What Actually Works",
    description:
      "From AI headshots to caption writers and feed planners — a real creator's guide to the AI tools that actually help you build a personal brand. No fluff.",
    url: "https://sselfie.ai/ai-tools-personal-branding",
    type: "article",
    images: [{ url: "https://sselfie.ai/og-image.png", width: 1200, height: 630 }],
  },
  alternates: { canonical: "https://sselfie.ai/ai-tools-personal-branding" },
}

const BLOB = "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com"
const IMAGES = {
  hero: `${BLOB}/maya-pro-generations/6sb8n7v1g9rmr0cvhyjr95kg5g-5IoNZKlXP8Umw6U040gkJeTer43jLY.png`,
  photo1: `${BLOB}/maya-pro-generations/30vxpdwy61rmw0cvdxj8apjzgc-xG6gcWZ8hR4QLToseBbqTGM0dPr9NM.png`,
  photo2: `${BLOB}/maya-pro-generations/mg0q5j29yhrmr0cvh4gax57cnr-p22TsIJ1grFHwnQrt2tXZ5foPm1vvv.png`,
  photo3: `${BLOB}/maya-generations/8239-hQrbpFYBbCHzcY8YQ95YKqqpZmbdbW.png`,
  photo4: `${BLOB}/maya-pro-generations/c8cjbbd6ehrmt0cvhqasfj7q30-CVfFXH8JOv3NtYQFMbPU0opeNPo6De.png`,
  sandra: `${BLOB}/tmpbmq4nfg7.png`,
}

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Best AI Tools for Personal Branding in 2026 — What Actually Works",
  description:
    "An honest guide to the AI tools that actually help personal brand builders — covering photo generation, caption writing, feed planning, and brand strategy.",
  author: {
    "@type": "Person",
    name: "Sandra",
    url: "https://sselfie.ai",
    description: "Founder of SSELFIE, personal branding expert, 180K+ Instagram followers",
  },
  publisher: {
    "@type": "Organization",
    name: "SSELFIE",
    url: "https://sselfie.ai",
  },
  datePublished: "2026-03-16",
  dateModified: "2026-03-16",
  mainEntityOfPage: { "@type": "WebPage", "@id": "https://sselfie.ai/ai-tools-personal-branding" },
  image: IMAGES.hero,
  keywords:
    "best AI tools personal branding, AI for personal brand, AI Instagram content creator, AI headshots personal brand, personal branding AI tools 2026",
  about: [
    { "@type": "Thing", name: "Personal Branding" },
    { "@type": "Thing", name: "Artificial Intelligence" },
    { "@type": "Thing", name: "Instagram Marketing" },
    { "@type": "SoftwareApplication", name: "SSELFIE", url: "https://sselfie.ai" },
  ],
}

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the best AI tool for personal branding?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The best AI tool for personal branding depends on your biggest bottleneck. For ongoing brand photos and Instagram content, SSELFIE trains a custom AI model on your face and uses Maya to plan your feed, write captions, and generate unlimited photos. For one-time headshots, Aragon AI is solid. For video content, CapCut AI is popular. Most personal brand builders need AI for photos first — that's the biggest time and money drain.",
      },
    },
    {
      "@type": "Question",
      name: "Can AI replace a photographer for personal branding?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For most personal brand content — Instagram posts, website headers, email graphics, launch photos — yes. AI tools like SSELFIE train a custom model on your face and generate professional-quality photos in any style on demand. Where AI still falls short: video, live events, and highly physical product shoots. But for solo creators and coaches who need 3–5 content photos per week, AI is a real alternative to booking photographers.",
      },
    },
    {
      "@type": "Question",
      name: "What AI tools do personal brand builders actually use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The most common AI tools in a personal brand stack: SSELFIE or Aragon for brand photos, ChatGPT or Claude for caption ideation, CapCut AI for video editing, Canva AI for graphics and templates, and Notion AI for content planning. The key is keeping the stack small — too many tools creates more overhead than they save.",
      },
    },
    {
      "@type": "Question",
      name: "How much do AI personal branding tools cost?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Costs vary: SSELFIE Studio is $97/month (unlimited photos, AI caption writing, feed planning). Aragon AI is $29–$99 per session. Canva Pro is $13/month. ChatGPT Plus is $20/month. CapCut is free with paid upgrades. A complete AI personal brand stack typically runs $50–$150/month, compared to $500–$2,000 per photographer shoot.",
      },
    },
  ],
}

const TOOLS = [
  {
    category: "AI Brand Photos",
    emoji: "📸",
    tools: [
      {
        name: "SSELFIE",
        url: "https://sselfie.ai",
        price: "$97/month",
        bestFor: "Personal brand builders who post weekly content",
        summary:
          "Trains a custom AI model on your face. Generates unlimited brand photos in any scene, outfit, or mood — guided by Maya, an AI that knows your brand voice. Also plans your Instagram feed and writes captions. Built specifically for content creators and coaches.",
        verdict: "Best all-in-one for ongoing brand content",
        verdictType: "top",
      },
      {
        name: "Aragon AI",
        url: "https://aragon.ai",
        price: "$29–$99 per batch",
        bestFor: "One-time professional headshots",
        summary:
          "Fast, clean, professional results. Upload your photos, get ~40 AI headshots in a few hours. Consistently good for LinkedIn, speaker pages, and press kits. Doesn't do ongoing content — it's a one-time headshot tool.",
        verdict: "Best for a single batch of headshots",
        verdictType: "good",
      },
      {
        name: "Midjourney",
        url: "https://midjourney.com",
        price: "$10–$60/month",
        bestFor: "Creative direction and concept imagery",
        summary:
          "Stunning images, but not trained on your face. Good for moodboards, brand visuals, and creative concepts. Requires prompt engineering skill. Not the right tool if you want photos that actually look like you.",
        verdict: "Creative but not for personal brand photos",
        verdictType: "niche",
      },
    ],
  },
  {
    category: "AI Captions & Copy",
    emoji: "✍️",
    tools: [
      {
        name: "Maya (inside SSELFIE)",
        url: "https://sselfie.ai",
        price: "Included with Studio",
        bestFor: "Brand-consistent captions in your voice",
        summary:
          "Maya knows your brand profile — your tone, your audience, your content pillars. She writes captions that sound like you, not like generic AI copy. Works best when paired with SSELFIE photos because she already has context from your feed.",
        verdict: "Best for brand-voice captions",
        verdictType: "top",
      },
      {
        name: "ChatGPT",
        url: "https://chatgpt.com",
        price: "Free / $20/month",
        bestFor: "Caption drafts and content ideation",
        summary:
          "Strong at generating caption variations and hooks. Requires you to brief it every session — it doesn't remember your brand voice. Works well if you have a clear brand voice guide and paste it in. Not the smoothest workflow for weekly content.",
        verdict: "Good starting point, needs briefing every time",
        verdictType: "good",
      },
      {
        name: "Claude",
        url: "https://claude.ai",
        price: "Free / $20/month",
        bestFor: "Longer-form content and brand voice refinement",
        summary:
          "Better than ChatGPT for nuanced writing and brand voice matching. Understands context well. Same limitation — no persistent memory of your brand. Great for writing your About page, email sequences, or refining your brand manifesto.",
        verdict: "Better for long-form brand writing",
        verdictType: "good",
      },
    ],
  },
  {
    category: "AI Video & Content",
    emoji: "🎬",
    tools: [
      {
        name: "CapCut AI",
        url: "https://capcut.com",
        price: "Free / paid upgrades",
        bestFor: "Reels, TikToks, and short-form video editing",
        summary:
          "The standard for AI video editing. Auto-captions, AI cuts, templates for Reels and TikTok. If you create video content, you're probably already using it. The AI script-to-video feature is useful for educational content.",
        verdict: "Essential for video creators",
        verdictType: "top",
      },
      {
        name: "Opus Clip",
        url: "https://opus.pro",
        price: "$15–$99/month",
        bestFor: "Repurposing long-form video into clips",
        summary:
          "Upload a long video, get AI-clipped highlights optimized for short-form. Good if you have podcasts, webinars, or long YouTube content you want to turn into Instagram Reels.",
        verdict: "Good for repurposing long video",
        verdictType: "good",
      },
    ],
  },
  {
    category: "AI Design & Graphics",
    emoji: "🎨",
    tools: [
      {
        name: "Canva AI",
        url: "https://canva.com",
        price: "$13/month",
        bestFor: "Templates, carousels, branded graphics",
        summary:
          "The backbone of most personal brand graphic work. AI features (Magic Write, background removal, image generation) are useful but not groundbreaking. The real value is the template library and brand kit. Doesn't create photos of you — use it for text-based graphics, carousels, and story templates.",
        verdict: "Essential for graphic design, not for photos",
        verdictType: "good",
      },
    ],
  },
]

export default function AIToolsPersonalBrandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        .tools-page {
          background: #0d0c0b;
          color: #f0ede8;
          min-height: 100vh;
        }
        .tools-page * {
          box-sizing: border-box;
        }
        .tools-hero {
          position: relative;
          overflow: hidden;
          min-height: 65vh;
          display: flex;
          align-items: flex-end;
          padding: 0 24px 64px;
        }
        .tools-hero-img {
          position: absolute;
          inset: 0;
          object-fit: cover;
          object-position: center top;
          z-index: 0;
        }
        .tools-hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(13,12,11,0.1) 0%, rgba(13,12,11,0.65) 55%, rgba(13,12,11,0.97) 100%);
          z-index: 1;
        }
        .tools-hero-content {
          position: relative;
          z-index: 2;
          max-width: 760px;
          margin: 0 auto;
          width: 100%;
        }
        .tools-label {
          font-family: var(--inter);
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8a8780;
          margin-bottom: 16px;
        }
        .tools-h1 {
          font-size: clamp(2.2rem, 5vw, 3.8rem);
          font-weight: 300;
          line-height: 1.1;
          letter-spacing: -0.01em;
          color: #f0ede8;
          margin: 0 0 20px;
          text-shadow: 0 2px 20px rgba(0,0,0,0.5);
        }
        .tools-hero-sub {
          font-family: var(--inter);
          font-size: 1rem;
          font-weight: 300;
          color: #c8c4bb;
          line-height: 1.65;
          max-width: 560px;
          text-shadow: 0 1px 8px rgba(0,0,0,0.55);
        }
        .tools-section {
          max-width: 760px;
          margin: 0 auto;
          padding: 64px 24px;
        }
        .tools-section + .tools-section {
          padding-top: 0;
        }
        .tools-h2 {
          font-size: clamp(1.6rem, 3.5vw, 2.4rem);
          font-weight: 300;
          color: #f0ede8;
          margin: 0 0 32px;
          line-height: 1.2;
        }
        .tools-h3 {
          font-size: clamp(1.1rem, 2.5vw, 1.4rem);
          font-weight: 300;
          color: #f0ede8;
          margin: 0 0 8px;
          line-height: 1.3;
        }
        .tools-body {
          font-family: var(--inter);
          font-size: 1rem;
          font-weight: 300;
          color: #c8c4bb;
          line-height: 1.75;
          margin: 0 0 20px;
        }
        .tools-body strong {
          color: #f0ede8;
          font-weight: 400;
        }
        /* TOC */
        .tools-toc {
          border: 1px solid rgba(240,237,232,0.08);
          border-radius: 4px;
          padding: 24px 28px;
          margin: 32px 0;
        }
        .tools-toc-title {
          font-family: var(--inter);
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #8a8780;
          margin-bottom: 16px;
        }
        .tools-toc ol {
          margin: 0;
          padding-left: 20px;
        }
        .tools-toc li {
          font-family: var(--inter);
          font-size: 0.875rem;
          font-weight: 300;
          color: #c8c4bb;
          line-height: 2;
        }
        .tools-toc a {
          color: #c8c4bb;
          text-decoration: none;
        }
        .tools-toc a:hover { color: #f0ede8; }
        /* Category header */
        .tools-cat-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(240,237,232,0.1);
        }
        .tools-cat-emoji {
          font-size: 1.4rem;
        }
        .tools-cat-title {
          font-size: clamp(1.3rem, 3vw, 1.8rem);
          font-weight: 300;
          color: #f0ede8;
          margin: 0;
        }
        /* Tool card */
        .tool-card {
          border: 1px solid rgba(240,237,232,0.08);
          border-radius: 4px;
          padding: 28px;
          margin-bottom: 16px;
          transition: border-color 0.2s;
        }
        .tool-card:hover {
          border-color: rgba(240,237,232,0.18);
        }
        .tool-card.top-pick {
          border-color: rgba(240,237,232,0.2);
          background: rgba(240,237,232,0.03);
        }
        .tool-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .tool-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .tool-name {
          font-size: 1.2rem;
          font-weight: 300;
          color: #f0ede8;
          margin: 0;
        }
        .tool-badge {
          font-family: var(--inter);
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 2px;
          background: rgba(240,237,232,0.1);
          color: #c8c4bb;
        }
        .tool-badge.top {
          background: rgba(240,237,232,0.15);
          color: #f0ede8;
        }
        .tool-price {
          font-family: var(--inter);
          font-size: 0.8rem;
          font-weight: 400;
          color: #8a8780;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .tool-best-for {
          font-family: var(--inter);
          font-size: 0.75rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #8a8780;
          margin-bottom: 10px;
        }
        .tool-summary {
          font-family: var(--inter);
          font-size: 0.875rem;
          font-weight: 300;
          color: #c8c4bb;
          line-height: 1.7;
          margin-bottom: 14px;
        }
        .tool-verdict {
          font-family: var(--inter);
          font-size: 0.8rem;
          font-weight: 400;
          color: #f0ede8;
          padding-top: 12px;
          border-top: 1px solid rgba(240,237,232,0.07);
        }
        .tool-verdict::before {
          content: "→ ";
          color: #8a8780;
        }
        /* Photo gallery */
        .tools-gallery {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin: 32px 0;
        }
        .tools-gallery-img {
          aspect-ratio: 3/4;
          overflow: hidden;
          border-radius: 2px;
        }
        .tools-gallery-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }
        /* My stack */
        .tools-stack {
          background: rgba(240,237,232,0.04);
          border: 1px solid rgba(240,237,232,0.1);
          border-radius: 4px;
          padding: 32px;
          margin: 32px 0;
        }
        .tools-stack-title {
          font-size: 1.4rem;
          font-weight: 300;
          color: #f0ede8;
          margin: 0 0 20px;
        }
        .tools-stack-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 14px 0;
          border-bottom: 1px solid rgba(240,237,232,0.06);
        }
        .tools-stack-item:last-child {
          border-bottom: none;
        }
        .tools-stack-num {
          font-family: var(--inter);
          font-size: 0.75rem;
          font-weight: 500;
          color: #8a8780;
          padding-top: 2px;
          flex-shrink: 0;
          width: 20px;
        }
        .tools-stack-info {}
        .tools-stack-name {
          font-family: var(--inter);
          font-size: 0.875rem;
          font-weight: 500;
          color: #f0ede8;
          margin-bottom: 3px;
        }
        .tools-stack-use {
          font-family: var(--inter);
          font-size: 0.8rem;
          font-weight: 300;
          color: #8a8780;
          line-height: 1.5;
        }
        /* Sandra note */
        .tools-note {
          border-left: 2px solid rgba(240,237,232,0.2);
          padding: 24px 28px;
          margin: 40px 0;
        }
        .tools-note-author {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .tools-note-avatar {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }
        .tools-note-name {
          font-family: var(--inter);
          font-size: 0.8rem;
          font-weight: 500;
          color: #f0ede8;
          letter-spacing: 0.04em;
        }
        .tools-note-title {
          font-family: var(--inter);
          font-size: 0.75rem;
          color: #8a8780;
          margin-top: 2px;
        }
        .tools-note-text {
          font-family: var(--inter);
          font-size: 0.9rem;
          font-weight: 300;
          color: #c8c4bb;
          line-height: 1.75;
          font-style: italic;
        }
        /* FAQ */
        .tools-faq {
          margin: 16px 0;
        }
        .tools-faq details {
          border-bottom: 1px solid rgba(240,237,232,0.08);
          padding: 20px 0;
        }
        .tools-faq summary {
          font-family: var(--inter);
          font-size: 0.95rem;
          font-weight: 400;
          color: #f0ede8;
          cursor: pointer;
          list-style: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
        }
        .tools-faq summary::-webkit-details-marker { display: none; }
        .tools-faq summary::after {
          content: "+";
          font-size: 1.2rem;
          color: #8a8780;
          flex-shrink: 0;
          transition: transform 0.2s;
        }
        .tools-faq details[open] summary::after {
          transform: rotate(45deg);
        }
        .tools-faq-answer {
          font-family: var(--inter);
          font-size: 0.875rem;
          font-weight: 300;
          color: #c8c4bb;
          line-height: 1.75;
          margin-top: 16px;
          padding-right: 32px;
        }
        /* CTA */
        .tools-cta {
          background: rgba(240,237,232,0.04);
          border: 1px solid rgba(240,237,232,0.1);
          border-radius: 4px;
          padding: 48px 40px;
          text-align: center;
        }
        .tools-cta-h {
          font-size: clamp(1.5rem, 3vw, 2rem);
          font-weight: 300;
          color: #f0ede8;
          margin: 0 0 12px;
        }
        .tools-cta-sub {
          font-family: var(--inter);
          font-size: 0.9rem;
          font-weight: 300;
          color: #8a8780;
          margin: 0 0 32px;
          line-height: 1.65;
        }
        .tools-btn-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .tools-btn-primary {
          display: inline-block;
          padding: 14px 28px;
          background: #f0ede8;
          color: #0d0c0b;
          font-family: var(--inter);
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 2px;
          transition: opacity 0.2s;
        }
        .tools-btn-primary:hover { opacity: 0.88; }
        .tools-btn-secondary {
          display: inline-block;
          padding: 14px 28px;
          border: 1px solid rgba(240,237,232,0.25);
          color: #c8c4bb;
          font-family: var(--inter);
          font-size: 0.8rem;
          font-weight: 400;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 2px;
          transition: border-color 0.2s, color 0.2s;
        }
        .tools-btn-secondary:hover {
          border-color: rgba(240,237,232,0.5);
          color: #f0ede8;
        }
        @media (max-width: 600px) {
          .tools-gallery { grid-template-columns: repeat(2, 1fr); }
          .tools-gallery-img:nth-child(n+3) { display: none; }
          .tools-cta { padding: 36px 24px; }
          .tool-card-header { flex-direction: column; gap: 8px; }
        }
      ` }} />

      <main className="tools-page" style={{ fontFamily: cormorant.style.fontFamily }}>
        {/* — Hero — */}
        <section className="tools-hero">
          <Image
            src={IMAGES.hero}
            alt="Sandra — professional AI brand photo, SSELFIE Studio"
            fill
            priority
            className="tools-hero-img"
            style={{ position: "absolute" }}
          />
          <div className="tools-hero-overlay" />
          <div className="tools-hero-content">
            <p className="tools-label" style={{ fontFamily: inter.style.fontFamily }}>
              Resource Guide · 2026
            </p>
            <h1 className="tools-h1">
              Best AI tools
              <br />
              for personal branding
              <br />
              — what actually works
            </h1>
            <p className="tools-hero-sub" style={{ fontFamily: inter.style.fontFamily }}>
              I&apos;ve tested most of them. Here&apos;s the honest breakdown — what&apos;s worth
              your money, what&apos;s overhyped, and what a real personal brand stack looks like.
            </p>
          </div>
        </section>

        {/* — Intro — */}
        <section className="tools-section">
          <p className="tools-body">
            There are a lot of AI tools claiming to help with personal branding right now. Most of
            them are fine. A few are genuinely useful. A couple will actually change how much time
            you spend on content.
          </p>
          <p className="tools-body">
            I&apos;ve been building SSELFIE for a year. Before that, I was a regular creator
            spending €500 per photographer shoot and hours every week writing captions. I&apos;ve
            tested most of the AI tools in this space — some as competitors, some as tools I
            actually use alongside SSELFIE.
          </p>
          <p className="tools-body">
            This isn&apos;t a paid comparison. It&apos;s what I actually think.
          </p>

          <div className="tools-toc">
            <p className="tools-toc-title" style={{ fontFamily: inter.style.fontFamily }}>
              What we cover
            </p>
            <ol>
              <li>
                <a href="#photos">AI Brand Photos</a>
              </li>
              <li>
                <a href="#captions">AI Captions & Copy</a>
              </li>
              <li>
                <a href="#video">AI Video & Content</a>
              </li>
              <li>
                <a href="#design">AI Design & Graphics</a>
              </li>
              <li>
                <a href="#my-stack">My personal stack</a>
              </li>
            </ol>
          </div>
        </section>

        {/* — Photo gallery — */}
        <section className="tools-section" style={{ paddingTop: 0 }}>
          <div className="tools-gallery">
            <div className="tools-gallery-img">
              <Image
                src={IMAGES.photo1}
                alt="SSELFIE AI brand photo example 1"
                width={300}
                height={400}
              />
            </div>
            <div className="tools-gallery-img">
              <Image
                src={IMAGES.photo2}
                alt="SSELFIE AI brand photo example 2"
                width={300}
                height={400}
              />
            </div>
            <div className="tools-gallery-img">
              <Image
                src={IMAGES.photo3}
                alt="SSELFIE AI brand photo example 3"
                width={300}
                height={400}
              />
            </div>
            <div className="tools-gallery-img">
              <Image
                src={IMAGES.photo4}
                alt="SSELFIE AI brand photo example 4"
                width={300}
                height={400}
              />
            </div>
          </div>
          <p
            className="tools-label"
            style={{ fontFamily: inter.style.fontFamily, textAlign: "center", marginTop: 4 }}
          >
            All generated with SSELFIE — same person, four different scenes
          </p>
        </section>

        {/* — Tool sections — */}
        {TOOLS.map((category) => (
          <section
            key={category.category}
            id={category.category.toLowerCase().replace(/[^a-z]/g, "-").replace(/-+/g, "-")}
            className="tools-section"
            style={{ paddingTop: 0 }}
          >
            <div className="tools-cat-header">
              <span className="tools-cat-emoji" role="img" aria-hidden>
                {category.emoji}
              </span>
              <h2 className="tools-cat-title">{category.category}</h2>
            </div>

            {category.tools.map((tool) => (
              <div
                key={tool.name}
                className={`tool-card${tool.verdictType === "top" ? " top-pick" : ""}`}
              >
                <div className="tool-card-header">
                  <div className="tool-name-row">
                    <h3 className="tool-name">{tool.name}</h3>
                    {tool.verdictType === "top" && (
                      <span
                        className="tool-badge top"
                        style={{ fontFamily: inter.style.fontFamily }}
                      >
                        Top Pick
                      </span>
                    )}
                  </div>
                  <span className="tool-price" style={{ fontFamily: inter.style.fontFamily }}>
                    {tool.price}
                  </span>
                </div>
                <p className="tool-best-for" style={{ fontFamily: inter.style.fontFamily }}>
                  Best for: {tool.bestFor}
                </p>
                <p className="tool-summary" style={{ fontFamily: inter.style.fontFamily }}>
                  {tool.summary}
                </p>
                <p className="tool-verdict" style={{ fontFamily: inter.style.fontFamily }}>
                  {tool.verdict}
                </p>
              </div>
            ))}
          </section>
        ))}

        {/* — My stack — */}
        <section id="my-stack" className="tools-section" style={{ paddingTop: 0 }}>
          <h2 className="tools-h2">My actual stack</h2>
          <p className="tools-body">
            Here&apos;s what I use every week for SSELFIE&apos;s own personal brand. I keep it
            small — every extra tool adds friction, not value.
          </p>
          <div className="tools-stack">
            <p
              className="tools-stack-title"
              style={{ fontFamily: cormorant.style.fontFamily }}
            >
              Sandra&apos;s personal brand stack
            </p>
            {[
              {
                name: "SSELFIE Studio",
                use: "All brand photos. Maya writes my captions, plans my feed, and generates my photos. This is 80% of my content creation.",
              },
              {
                name: "CapCut",
                use: "Reels and TikTok editing. Auto-captions are essential. I spend maybe 20 minutes on a Reel with CapCut.",
              },
              {
                name: "Canva Pro",
                use: "Story templates, carousel posts, email headers. I don't use it for photos — just graphics and layouts.",
              },
              {
                name: "Claude",
                use: "Email drafts, long-form content, refining my brand voice in writing. Not for captions — Maya handles those.",
              },
            ].map((item, i) => (
              <div key={item.name} className="tools-stack-item">
                <span className="tools-stack-num" style={{ fontFamily: inter.style.fontFamily }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="tools-stack-info">
                  <p className="tools-stack-name" style={{ fontFamily: inter.style.fontFamily }}>
                    {item.name}
                  </p>
                  <p className="tools-stack-use" style={{ fontFamily: inter.style.fontFamily }}>
                    {item.use}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* — Sandra's note — */}
        <section className="tools-section" style={{ paddingTop: 0 }}>
          <div className="tools-note">
            <div className="tools-note-author">
              <div className="tools-note-avatar">
                <Image
                  src={IMAGES.sandra}
                  alt="Sandra — founder of SSELFIE"
                  width={44}
                  height={44}
                  style={{ objectFit: "cover", objectPosition: "center top" }}
                />
              </div>
              <div>
                <p className="tools-note-name" style={{ fontFamily: inter.style.fontFamily }}>
                  SANDRA
                </p>
                <p className="tools-note-title" style={{ fontFamily: inter.style.fontFamily }}>
                  Founder, SSELFIE · 180K Instagram followers
                </p>
              </div>
            </div>
            <p className="tools-note-text" style={{ fontFamily: inter.style.fontFamily }}>
              &ldquo;The mistake I see most personal brand builders make is adding too many tools.
              They sign up for 10 different AI subscriptions, spend more time managing tools than
              creating content, and still feel behind. Pick the bottleneck that&apos;s costing you
              the most — for most creators, that&apos;s photos. Fix that first. Everything else
              follows.&rdquo;
            </p>
          </div>
        </section>

        {/* — FAQ — */}
        <section className="tools-section" style={{ paddingTop: 0 }}>
          <h2 className="tools-h2">Questions people ask</h2>
          <div className="tools-faq">
            <details>
              <summary style={{ fontFamily: inter.style.fontFamily }}>
                What is the best AI tool for personal branding overall?
              </summary>
              <p className="tools-faq-answer" style={{ fontFamily: inter.style.fontFamily }}>
                For most personal brand builders, the best single investment is an AI photo tool —
                because photos are the biggest bottleneck. You need them for every post, every
                launch, every platform profile. SSELFIE is the only AI photo tool that trains on
                your specific face AND knows your brand voice, which makes it the best fit for
                ongoing content creation. If you only need one-time headshots, Aragon is simpler
                and cheaper.
              </p>
            </details>
            <details>
              <summary style={{ fontFamily: inter.style.fontFamily }}>
                Can AI replace a photographer for personal branding?
              </summary>
              <p className="tools-faq-answer" style={{ fontFamily: inter.style.fontFamily }}>
                For most weekly content — Instagram posts, website banners, email headers, launch
                graphics — yes. AI tools like SSELFIE generate professional-quality photos in any
                style without scheduling a shoot. Where photographers still win: events, video,
                and highly styled editorial shoots. But if you&apos;re booking a photographer
                every few months just to have enough photos for Instagram, that problem is now
                solvable with AI.
              </p>
            </details>
            <details>
              <summary style={{ fontFamily: inter.style.fontFamily }}>
                How much should I spend on AI tools for my personal brand?
              </summary>
              <p className="tools-faq-answer" style={{ fontFamily: inter.style.fontFamily }}>
                A solid AI personal brand stack — SSELFIE Studio ($97/mo), Canva Pro ($13/mo),
                CapCut (free) — runs about $110/month. Compare that to a photographer shoot at
                €500–1,500 every few months. Most creators who switch to AI save money even in the
                first month. Start with the tool that solves your biggest problem, and add others
                only if you actually hit the next bottleneck.
              </p>
            </details>
            <details>
              <summary style={{ fontFamily: inter.style.fontFamily }}>
                Do I need technical skills to use AI for personal branding?
              </summary>
              <p className="tools-faq-answer" style={{ fontFamily: inter.style.fontFamily }}>
                No. The tools on this list are designed for creators, not developers. SSELFIE has
                Maya who walks you through everything in chat. Canva is drag-and-drop. CapCut is
                just editing on your phone. You don&apos;t need to write prompts or understand how
                AI works — you just need to show up and talk to the tool.
              </p>
            </details>
          </div>
        </section>

        {/* — CTA — */}
        <section className="tools-section" style={{ paddingTop: 0 }}>
          <div className="tools-cta">
            <h2 className="tools-cta-h">Start with the photos.</h2>
            <p className="tools-cta-sub" style={{ fontFamily: inter.style.fontFamily }}>
              The Selfie Guide teaches you how to take the selfies that train a great AI model.
              $17 one-time. Then you&apos;ll have everything you need to generate unlimited brand
              photos with SSELFIE Studio.
            </p>
            <div className="tools-btn-row">
              <Link href="/selfie-guide" className="tools-btn-primary" style={{ fontFamily: inter.style.fontFamily }}>
                Get the Selfie Guide — $17
              </Link>
              <Link href="/checkout/membership" className="tools-btn-secondary" style={{ fontFamily: inter.style.fontFamily }}>
                Join Studio — $97/mo
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
