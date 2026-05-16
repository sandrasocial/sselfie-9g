import fs from "node:fs"
import path from "node:path"
import Image from "next/image"
import Link from "next/link"
import type { Metadata } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { sql } from "@/lib/db/client"
import { CopyButton } from "@/components/ai-prompts/copy-button"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

const HERO_IMAGE = path.join(process.cwd(), "public", "images", "ai-prompts", "ai-prompts-hero.jpg")

export const metadata: Metadata = {
  title: "Your ChatGPT Selfie Prompts · SSELFIE",
  description: "12 copy-paste prompts for turning one selfie into editorial, beauty, mirror, car, and content-ready visuals.",
  robots: { index: false, follow: false },
}

// ---------------------------------------------------------------------------
// Prompt data
// ---------------------------------------------------------------------------

const REUSABLE_STARTER =
  "Use my uploaded selfie as the reference image. Keep my facial identity, age, skin tone, facial structure, eye shape, nose, lips, hair, freckles, and natural details as close as possible. Do not beautify me into a different person. Only improve the lighting, crop, styling, camera quality, background, and mood."

type PromptCard = {
  number: string
  title: string
  id: string
  whenToUse: string
  mood: string
  prompt: string
}

const MAIN_LOOKS: PromptCard[] = [
  {
    number: "01",
    id: "clean-editorial",
    title: "Clean Editorial Selfie",
    whenToUse: "Your selfie is good but looks casual. You want it to feel polished and shareable.",
    mood: "editorial · soft light · porcelain · iPhone quality",
    prompt:
      "Use my uploaded selfie as the reference image. Keep my face, age, skin tone, facial features, hair length, jewelry, and expression exactly as they are. Turn this into a clean editorial portrait with soft window light, natural skin texture, minimal background in neutral tones, shallow depth of field, and subtle film grain. The result should look like a real iPhone photo, not AI art.",
  },
  {
    number: "02",
    id: "bw-supermodel",
    title: "90s Black and White Supermodel",
    whenToUse: "You want something dramatic for a black and white post. Strong and fashion-editorial.",
    mood: "contrast · 90s · fashion · monochrome",
    prompt:
      "Use my uploaded selfie as the reference image. Keep my face, age, skin tone, freckles, nose, lips, eyes, hairline, and expression exactly as they are. Recreate this as a high-contrast black and white portrait in the style of a 90s fashion editorial. Strong cheekbone shadows, soft flash reflection in the eyes, natural skin texture, subtle film grain. Studio-gray background. Make it look photographic, not illustrated.",
  },
  {
    number: "03",
    id: "car-mirror-noir",
    title: "Car Mirror Lipstick Noir",
    whenToUse: "You want something cinematic and unexpected. One of the most distinctive looks in the pack.",
    mood: "cinematic · noir · editorial · shadow",
    prompt:
      "Use my uploaded selfie as the reference image. Create a black and white portrait seen through a car side mirror. The mirror reflection shows my eyes, nose, lips, and one hand near the face. Keep my face, hair, jewelry, nails, and expression as close to the original as possible. Soft side light, deep shadows, rim light on the hair. Blurred car interior and mirror frame in the background. Fine film grain. This should look like an editorial photo, not an AI image.",
  },
  {
    number: "04",
    id: "narrow-light",
    title: "Narrow Light Portrait",
    whenToUse: "You want a moody, high-contrast look. Works well for quotes and single-image posts.",
    mood: "dramatic · shadow · moody · sharp",
    prompt:
      "Use my uploaded selfie as the reference image. Keep my face, skin, hair, and natural features exactly as they are. Create a close-up portrait where most of my face is in deep shadow, with one narrow band of light crossing my eyes and the bridge of my nose. Plain muted gray-blue background. High-contrast, cinematic lighting. Sharp focus on the eyes. Realistic photography with soft grain. Do not alter my face or skin.",
  },
  {
    number: "05",
    id: "mirror-selfie-upgrade",
    title: "Expensive Mirror Selfie Upgrade",
    whenToUse:
      "You took a mirror selfie but the lighting or background isn't working. You want the same moment, elevated.",
    mood: "clean · elevated · natural · editorial",
    prompt:
      "Use my uploaded mirror selfie as the reference image. Keep my face, body, hair, outfit, phone, and pose as close to the original as possible. Improve the lighting so it is soft and even, straighten the composition, clean up the background so it is minimal and neutral, and sharpen the iPhone detail. Keep the skin texture realistic. The final image should look like a polished editorial mirror selfie, not a heavily filtered one.",
  },
]

const BONUS_LOOKS: PromptCard[] = [
  {
    number: "06",
    id: "y2k-selfie",
    title: "Compact Camera Y2K Selfie",
    whenToUse: "You want something fun and nostalgic. A lighter post, a throwback feel.",
    mood: "Y2K · flash · nostalgic · candid",
    prompt:
      "Use my uploaded selfie as the reference image. Keep my face, age, facial features, hair, and body shape exactly as they are. Recreate this as an early-2000s compact digital camera selfie. Direct flash, glossy skin highlights, soft grain, warm indoor light, and a candid, casual feel. Keep the image photorealistic. Do not change my face, skin tone, or expression.",
  },
  {
    number: "07",
    id: "window-light-brand",
    title: "Window Light Brand Portrait",
    whenToUse: "You need a personal brand photo that looks natural, not corporate. Good for bios, press, and website use.",
    mood: "natural · personal brand · morning light · approachable",
    prompt:
      "Use my uploaded selfie as the reference image. Keep my face, age, skin tone, hair, and expression exactly as they are. Create a personal brand portrait with soft morning window light, a clean neutral background, and a relaxed, confident expression. Realistic skin texture. The result should feel like a high-quality iPhone portrait with professional editing, not a corporate headshot or studio shot.",
  },
  {
    number: "08",
    id: "bathroom-magazine",
    title: "Bathroom Selfie to Magazine Shot",
    whenToUse:
      "You have a bathroom selfie you like but it isn't quite there yet. Keep the moment, improve everything around it.",
    mood: "editorial · clean · elevated · influencer quality",
    prompt:
      "Use my uploaded bathroom selfie as the reference image. Keep my face, hair, outfit, phone, pose, and body shape as close to the original as possible. Improve the lighting so it is soft and even, straighten the lines, reduce background clutter, and give the photo clean neutral tones. The result should feel like a high-end editorial bathroom mirror photo. Do not change my face, body, or outfit.",
  },
]

const WORKFLOW_PROMPTS: PromptCard[] = [
  {
    number: "09",
    id: "selfie-audit",
    title: "Selfie Audit",
    whenToUse: "You know something is off but you can't identify what. Use this before you try any of the visual prompts.",
    mood: "This prompt does not change your photo. It gives you a written critique.",
    prompt:
      "Analyze this selfie like an iPhone photography coach. Tell me exactly what is working and what is making it look less polished. Give me 5 simple fixes for lighting, angle, pose, crop, and editing. Keep the advice beginner-friendly and specific to iPhone selfies. Give me the fastest way to make this photo look better before I post it.",
  },
  {
    number: "10",
    id: "edit-bridge",
    title: "Prompt-to-Edit Bridge",
    whenToUse: "You love an AI result and want to recreate that same mood in Lightroom or iPhone editing without AI.",
    mood: "This prompt does not change your photo. It gives you manual editing steps.",
    prompt:
      "Look at this AI-edited version of my selfie. Help me recreate the same mood manually in iPhone editing or Lightroom. Break the look into simple steps: exposure, contrast, highlights, shadows, warmth, colour, sharpness, crop, and grain. Keep the steps beginner-friendly. The goal is a natural, realistic result, not an over-edited one.",
  },
  {
    number: "11",
    id: "content-caption",
    title: "Content Caption From My Selfie",
    whenToUse: "You have a photo but don't know what to write. Use this to turn a selfie into an Instagram caption.",
    mood: "This prompt does not change your photo. It generates caption copy.",
    prompt:
      "Use this selfie as the starting point for an Instagram caption. Write a warm, honest caption about showing up online before you feel fully ready. Write it as a real woman speaking to another woman, not as a brand. Keep it short and direct. Include one practical line about using your phone, your face, and everyday life to start building online. End with a soft CTA to comment SELFIE for the free guide.",
  },
  {
    number: "12",
    id: "studio-workflow",
    title: "SSELFIE Studio Workflow",
    whenToUse: "You want a full content plan from one photo. Hook, caption, edit direction, reel idea, and CTA.",
    mood: "This prompt does not change your photo. It generates a content plan.",
    prompt:
      "Act like my personal content assistant. I am uploading one selfie. Give me: 1. what this photo says about me right now, 2. the strongest Instagram hook for this image, 3. one caption idea, 4. one simple edit direction, 5. one carousel or reel idea, 6. the best CTA to use: SELFIE, KIT, or Studio. Keep the advice short, confident, and made for a woman building her brand from her phone.",
  },
]

// ---------------------------------------------------------------------------
// Token validation
// ---------------------------------------------------------------------------

async function validateToken(token: string): Promise<boolean> {
  try {
    const rows = await sql`
      SELECT id
      FROM freebie_subscribers
      WHERE access_token = ${token}
        AND (
          source = 'ai-prompts'
          OR 'ai-prompts-subscriber' = ANY(email_tags)
        )
      LIMIT 1
    `
    return rows.length > 0
  } catch (error) {
    console.error("[ai-prompts/access] DB error during token validation:", error)
    return false
  }
}

// ---------------------------------------------------------------------------
// Prompt card component (server — CopyButton is the only client leaf)
// ---------------------------------------------------------------------------

function PromptCardEl({ card, isWorkflow }: { card: PromptCard; isWorkflow?: boolean }) {
  return (
    <article id={card.id} className={`pc ${isWorkflow ? "pc-workflow" : ""}`}>
      <div className="pc-header">
        <span className="pc-number">{card.number}</span>
        <h3 className={`pc-title ${cormorant.className}`}>{card.title}</h3>
      </div>
      <p className="pc-when-label">When to use it</p>
      <p className="pc-when">{card.whenToUse}</p>
      <p className="pc-mood">{card.mood}</p>
      <div className="pc-prompt-wrap">
        <p className="pc-prompt-text">{card.prompt}</p>
        <div className="pc-copy-row">
          <CopyButton text={card.prompt} />
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AiPromptsAccessPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const hasHeroImage = fs.existsSync(HERO_IMAGE)
  const isValid = await validateToken(token)

  if (!isValid) {
    return (
      <main className={`ap-page ${inter.className}`}>
        <div className="ap-invalid">
          <p className="ap-invalid-eyebrow">SSELFIE</p>
          <h1 className={`ap-invalid-headline ${cormorant.className}`}>
            This link doesn&apos;t look right.
          </h1>
          <p className="ap-invalid-body">
            The access link may be expired or incorrect. Sign up to get a fresh one.
          </p>
          <Link href="/ai-prompts" className="ap-invalid-cta">
            Get the prompt pack
          </Link>
        </div>
        <style>{`
          .ap-page {
            background: #0a0a0a;
            color: #f5f5f5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 48px 24px;
          }
          .ap-invalid {
            max-width: 480px;
            text-align: center;
          }
          .ap-invalid-eyebrow {
            margin: 0 0 24px;
            font-size: 9px;
            font-weight: 600;
            letter-spacing: 0.42em;
            color: rgba(245, 245, 245, 0.32);
          }
          .ap-invalid-headline {
            margin: 0 0 16px;
            font-size: clamp(2rem, 7vw, 3rem);
            font-weight: 300;
            line-height: 1.1;
            color: #f5f5f5;
          }
          .ap-invalid-body {
            margin: 0 0 36px;
            font-size: 15px;
            line-height: 1.8;
            color: rgba(245, 245, 245, 0.54);
          }
          .ap-invalid-cta {
            display: inline-block;
            padding: 14px 28px;
            background: #f5f5f5;
            color: #0a0a0a;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.24em;
            text-transform: uppercase;
            text-decoration: none;
            transition: opacity 0.15s ease;
          }
          .ap-invalid-cta:hover { opacity: 0.88; }
        `}</style>
      </main>
    )
  }

  return (
    <main className={`ap-page ${inter.className}`}>
      {/* 1. Hero */}
      <section className="ap-hero">
        {hasHeroImage && (
          <div className="ap-hero-image-wrap" aria-hidden="true">
            <Image
              src="/images/ai-prompts/ai-prompts-hero.jpg"
              alt=""
              fill
              className="ap-hero-image"
              priority
            />
            <div className="ap-hero-image-overlay" />
          </div>
        )}
        <div className="ap-hero-content">
          <p className="ap-hero-eyebrow">SSELFIE · CHATGPT SELFIE PROMPT PACK</p>
          <h1 className={`ap-hero-title ${cormorant.className}`}>
            The ChatGPT Selfie Prompt Pack.
          </h1>
          <p className="ap-hero-sub">
            12 copy-paste prompts for turning one selfie into editorial, beauty, mirror,
            car, and content-ready visuals.
          </p>
          <div className="ap-hero-actions">
            <a href="#clean-editorial" className="ap-hero-cta">
              Start with the Clean Editorial prompt
            </a>
          </div>
          <p className="ap-hero-safety">
            Use your own photo or a photo you have permission to edit. AI can still change
            small facial details, so check the result before you post.
          </p>
        </div>
      </section>

      {/* 2. Before you start */}
      <section className="ap-section ap-before">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">BEFORE YOU START</p>
          <ul className="ap-before-list">
            <li>Use your own photo or a photo you have permission to edit.</li>
            <li>
              Choose a clear selfie with your face visible. Sunglasses and heavy shadows
              give AI less to work with.
            </li>
            <li>
              Better light in the original means a better result. A blurry photo produces
              a blurry AI version.
            </li>
            <li>Copy one prompt at a time. Run it. Check the result before posting.</li>
            <li>
              If the AI changes your face too much, start your next attempt with the
              Reusable Starter Line below.
            </li>
          </ul>
        </div>
      </section>

      {/* 3. Reusable starter line */}
      <section className="ap-section ap-starter">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">PASTE THIS FIRST</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>Your anchor prompt.</h2>
          <p className="ap-starter-note">
            Add this before any other prompt if the AI is drifting too far from your face.
            You can also use it on its own.
          </p>
          <div className="ap-starter-card">
            <p className="ap-starter-text">{REUSABLE_STARTER}</p>
            <div className="pc-copy-row">
              <CopyButton text={REUSABLE_STARTER} />
            </div>
          </div>
        </div>
      </section>

      {/* 4. The main looks */}
      <section className="ap-section">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">THE LOOKS</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>
            Five prompts. Five different versions of you.
          </h2>
          <div className="ap-cards ap-main-grid">
            {MAIN_LOOKS.map((card) => (
              <PromptCardEl key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Bonus looks */}
      <section className="ap-section">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">BONUS LOOKS</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>
            Three more. For specific moments.
          </h2>
          <div className="ap-cards">
            {BONUS_LOOKS.map((card) => (
              <PromptCardEl key={card.id} card={card} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. Workflow prompts */}
      <section className="ap-section ap-workflow-section">
        <div className="ap-section-inner">
          <p className="ap-eyebrow">SSELFIE WORKFLOW</p>
          <h2 className={`ap-section-title ${cormorant.className}`}>
            Use these when you want the photo to become content, not just a pretty image.
          </h2>
          <p className="ap-workflow-note">
            These prompts do not change how you look. They help you understand your photo,
            edit it, caption it, and turn it into a content plan.
          </p>
          <div className="ap-cards">
            {WORKFLOW_PROMPTS.map((card) => (
              <PromptCardEl key={card.id} card={card} isWorkflow />
            ))}
          </div>
        </div>
      </section>

      {/* 7. Bridge to Free Selfie Guide */}
      <section className="ap-section ap-bridge">
        <div className="ap-section-inner ap-bridge-inner">
          <h2 className={`ap-bridge-title ${cormorant.className}`}>
            The better the original selfie, the better the AI result.
          </h2>
          <p className="ap-bridge-body">
            If your photo is dark, blurry, or awkward, AI has less to work with. The Free
            Selfie Guide shows you the light, angles, and simple setup that make every
            prompt work better. It is free.
          </p>
          <Link
            href="/selfie-guide?utm_source=ai_prompts&utm_medium=prompt_pack&utm_campaign=ai_prompts_to_selfie_guide"
            className="ap-bridge-cta ap-bridge-cta-primary"
          >
            Get the Free Selfie Guide
          </Link>
        </div>
      </section>

      {/* 8. Soft product bridge */}
      <section className="ap-section ap-kit-bridge">
        <div className="ap-section-inner">
          <p className="ap-kit-question">Want the edit to look good before AI touches it?</p>
          <p className="ap-kit-body">
            The Starter Kit includes the Lightroom presets, setup guide, posing guide,
            caption templates, and 7-day content starter.
          </p>
          <Link
            href="/starter-kit?utm_source=ai_prompts&utm_medium=prompt_pack&utm_campaign=ai_prompts_to_starter_kit"
            className="ap-bridge-cta ap-bridge-cta-secondary"
          >
            See the Starter Kit
          </Link>
        </div>
      </section>

      <style>{`
        .ap-page {
          background: #0a0a0a;
          color: #f5f5f5;
          min-height: 100vh;
        }

        .ap-hero {
          position: relative;
          min-height: 92vh;
          display: flex;
          align-items: flex-end;
          padding: 0 24px 64px;
          overflow: hidden;
          background: #0a0a0a;
        }

        .ap-hero-image-wrap {
          position: absolute;
          inset: 0;
        }

        .ap-hero-image {
          object-fit: cover;
          object-position: center top;
        }

        .ap-hero-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(10, 10, 10, 0.28) 0%,
            rgba(10, 10, 10, 0.82) 100%
          );
        }

        .ap-hero-content {
          position: relative;
          z-index: 1;
          max-width: 680px;
          width: 100%;
        }

        .ap-hero-eyebrow {
          margin: 0 0 20px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.38em;
          color: rgba(245, 245, 245, 0.48);
        }

        .ap-hero-title {
          margin: 0 0 18px;
          font-size: clamp(2.8rem, 9vw, 5.5rem);
          font-weight: 300;
          line-height: 0.96;
          letter-spacing: -0.02em;
          color: #f5f5f5;
        }

        .ap-hero-sub {
          margin: 0 0 32px;
          font-size: clamp(0.95rem, 2.5vw, 1.05rem);
          line-height: 1.8;
          color: rgba(245, 245, 245, 0.7);
          max-width: 520px;
        }

        .ap-hero-actions {
          margin-bottom: 28px;
        }

        .ap-hero-cta {
          display: inline-block;
          padding: 14px 24px;
          background: #f5f5f5;
          color: #0a0a0a;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          text-decoration: none;
          transition: opacity 0.15s ease;
        }

        .ap-hero-cta:hover { opacity: 0.88; }

        .ap-hero-safety {
          margin: 0;
          font-size: 12px;
          line-height: 1.7;
          color: rgba(245, 245, 245, 0.36);
          max-width: 460px;
        }

        .ap-section {
          padding: 72px 24px;
          border-top: 1px solid rgba(245, 245, 245, 0.06);
        }

        .ap-section-inner {
          max-width: 800px;
          margin: 0 auto;
        }

        .ap-eyebrow {
          margin: 0 0 14px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.4em;
          color: rgba(245, 245, 245, 0.36);
        }

        .ap-section-title {
          margin: 0 0 40px;
          font-size: clamp(1.8rem, 5vw, 2.8rem);
          font-weight: 300;
          line-height: 1.08;
          color: #f5f5f5;
        }

        .ap-before-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .ap-before-list li {
          padding: 16px 0;
          font-size: 15px;
          line-height: 1.75;
          color: rgba(245, 245, 245, 0.66);
          border-bottom: 1px solid rgba(245, 245, 245, 0.06);
        }

        .ap-before-list li:first-child { padding-top: 0; }
        .ap-before-list li:last-child { border-bottom: none; }

        .ap-starter-note {
          margin: 0 0 24px;
          font-size: 15px;
          line-height: 1.75;
          color: rgba(245, 245, 245, 0.54);
        }

        .ap-starter-card {
          border: 1px solid rgba(245, 245, 245, 0.12);
          border-radius: 16px;
          padding: 28px 28px 20px;
          background: rgba(245, 245, 245, 0.03);
        }

        .ap-starter-text {
          margin: 0 0 20px;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(245, 245, 245, 0.78);
        }

        .ap-cards {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .pc {
          border: 1px solid rgba(245, 245, 245, 0.09);
          border-radius: 18px;
          padding: 32px 28px 24px;
          background: rgba(245, 245, 245, 0.025);
        }

        .pc-workflow {
          background: rgba(245, 245, 245, 0.04);
          border-color: rgba(245, 245, 245, 0.11);
        }

        .pc-header {
          display: flex;
          align-items: baseline;
          gap: 14px;
          margin-bottom: 20px;
        }

        .pc-number {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: rgba(245, 245, 245, 0.28);
          flex-shrink: 0;
        }

        .pc-title {
          margin: 0;
          font-size: clamp(1.45rem, 4vw, 1.9rem);
          font-weight: 300;
          line-height: 1.05;
          color: #f5f5f5;
        }

        .pc-when-label {
          margin: 0 0 6px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: rgba(245, 245, 245, 0.3);
        }

        .pc-when {
          margin: 0 0 16px;
          font-size: 14px;
          line-height: 1.7;
          color: rgba(245, 245, 245, 0.6);
        }

        .pc-mood {
          margin: 0 0 24px;
          font-size: 11px;
          line-height: 1.6;
          color: rgba(245, 245, 245, 0.32);
          letter-spacing: 0.04em;
        }

        .pc-prompt-wrap {
          border: 1px solid rgba(245, 245, 245, 0.08);
          border-radius: 10px;
          padding: 20px 20px 14px;
          background: rgba(0, 0, 0, 0.25);
        }

        .pc-prompt-text {
          margin: 0 0 16px;
          font-size: 14px;
          line-height: 1.85;
          color: rgba(245, 245, 245, 0.72);
          white-space: normal;
          word-break: break-word;
        }

        .pc-copy-row {
          display: flex;
          justify-content: flex-end;
        }

        .copy-btn {
          padding: 8px 18px;
          background: transparent;
          border: 1px solid rgba(245, 245, 245, 0.18);
          border-radius: 999px;
          color: rgba(245, 245, 245, 0.56);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.15s ease, color 0.15s ease;
        }

        .copy-btn:hover {
          border-color: rgba(245, 245, 245, 0.38);
          color: rgba(245, 245, 245, 0.88);
        }

        .ap-workflow-note {
          margin: -24px 0 36px;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(245, 245, 245, 0.48);
        }

        .ap-bridge {
          background: #141414;
          border-top: 1px solid rgba(245, 245, 245, 0.06);
        }

        .ap-bridge-inner {
          text-align: center;
          padding: 24px 0;
        }

        .ap-bridge-title {
          margin: 0 0 20px;
          font-size: clamp(2rem, 6vw, 3.2rem);
          font-weight: 300;
          line-height: 1.1;
          color: #f5f5f5;
        }

        .ap-bridge-body {
          margin: 0 0 36px;
          font-size: 15px;
          line-height: 1.85;
          color: rgba(245, 245, 245, 0.56);
          max-width: 540px;
          margin-left: auto;
          margin-right: auto;
        }

        .ap-bridge-cta {
          display: inline-block;
          text-decoration: none;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          transition: opacity 0.15s ease;
        }

        .ap-bridge-cta:hover { opacity: 0.82; }

        .ap-bridge-cta-primary {
          padding: 16px 32px;
          background: #f5f5f5;
          color: #0a0a0a;
        }

        .ap-bridge-cta-secondary {
          padding: 14px 28px;
          border: 1px solid rgba(245, 245, 245, 0.2);
          color: rgba(245, 245, 245, 0.62);
        }

        .ap-kit-bridge {
          border-top: 1px solid rgba(245, 245, 245, 0.05);
        }

        .ap-kit-question {
          margin: 0 0 10px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(245, 245, 245, 0.44);
        }

        .ap-kit-body {
          margin: 0 0 28px;
          font-size: 15px;
          line-height: 1.78;
          color: rgba(245, 245, 245, 0.52);
          max-width: 520px;
        }

        @media (min-width: 640px) {
          .ap-hero {
            padding: 0 48px 80px;
            min-height: 88vh;
          }
          .ap-section {
            padding: 88px 48px;
          }
          .ap-bridge {
            padding: 88px 48px;
          }
          .ap-kit-bridge {
            padding: 72px 48px;
          }
          .ap-bridge-inner {
            text-align: left;
          }
          .ap-bridge-body {
            margin-left: 0;
            margin-right: 0;
          }
        }

        @media (min-width: 900px) {
          .ap-hero {
            padding: 0 72px 96px;
          }
          .ap-section {
            padding: 96px 72px;
          }
          .ap-bridge {
            padding: 96px 72px;
          }
          .ap-kit-bridge {
            padding: 80px 72px;
          }
          .ap-cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .ap-cards.ap-main-grid > .pc:last-child {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </main>
  )
}
