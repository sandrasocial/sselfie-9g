import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Cormorant_Garamond, Inter } from "next/font/google"

import { SinglePromptGate } from "@/components/ai-prompts/single-prompt-gate"
import {
  buildPromptPageUrl,
  buildPromptPageVaultCheckoutHref,
  getCurrentFreePrompt,
  getLiveVaultPromptCount,
  getPromptByNumber,
} from "@/lib/ai-prompts/prompt-lookup"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export const dynamic = "force-dynamic"

type PromptPageProps = {
  params: Promise<{ number: string }>
}

async function resolvePromptPageValue(value: string) {
  return value.trim().toLowerCase() === "latest"
    ? getCurrentFreePrompt()
    : getPromptByNumber(value)
}

export async function generateMetadata({ params }: PromptPageProps): Promise<Metadata> {
  const { number } = await params
  const prompt = await resolvePromptPageValue(number)

  if (!prompt) {
    return {
      title: "Prompt coming soon · SSELFIE",
      description: "This SSELFIE prompt is not published yet. See the full Prompt Vault.",
    }
  }

  return {
    title: `Prompt #${prompt.number}: ${prompt.card.title} · SSELFIE`,
    description: prompt.card.whenToUse,
  }
}

export default async function NumberedPromptPage({ params }: PromptPageProps) {
  const { number } = await params
  const [prompt, vaultCount] = await Promise.all([
    resolvePromptPageValue(number),
    getLiveVaultPromptCount(),
  ])

  if (!prompt) {
    return (
      <main className={inter.className}>
        <section className="missing-shell">
          <p className="missing-eyebrow">SSELFIE PROMPTS</p>
          <h1 className={cormorant.className}>That one is coming.</h1>
          <p>
            I do not have that prompt published yet. The full Vault is ready if you want every
            shoot world in one place.
          </p>
          <Link href="/prompt-vault?source=prompt_page_missing&utm_source=instagram&utm_medium=manychat&utm_campaign=numbered_prompt_fallback">
            See the Vault
          </Link>
        </section>
        <style>{`
          html, body { background:#F8FAFA; }
          main { min-height:100svh; display:grid; place-items:center; background:#F8FAFA; color:#0D0E10; padding:24px; }
          .missing-shell { max-width:560px; border:1px solid #DAD7D1; background:#FFFFFF; padding:34px; text-align:center; }
          .missing-eyebrow { margin:0 0 16px; font-size:10px; letter-spacing:.32em; color:#8B8882; }
          h1 { margin:0 0 16px; font-size:clamp(3.2rem, 12vw, 6rem); line-height:.9; font-weight:300; letter-spacing:0; }
          p { margin:0 auto 24px; color:#5E5B55; line-height:1.7; max-width:420px; }
          a { display:inline-flex; min-height:48px; align-items:center; justify-content:center; background:#0D0E10; color:#fff; padding:0 22px; text-decoration:none; font-size:12px; letter-spacing:.18em; text-transform:uppercase; }
        `}</style>
      </main>
    )
  }

  const checkoutHref = buildPromptPageVaultCheckoutHref({
    promptNumber: prompt.number,
    promptId: prompt.card.id,
    promptTitle: prompt.card.title,
  })

  return (
    <main className={inter.className}>
      <div className="sp-page-bg" aria-hidden="true">
        {prompt.card.exampleImage ? (
          <Image src={prompt.card.exampleImage} alt="" fill priority className="sp-bg-img" />
        ) : null}
      </div>
      <SinglePromptGate
        promptNumber={prompt.number}
        promptId={prompt.card.id}
        promptTitle={prompt.card.title}
        promptMood={prompt.card.mood}
        whenToUse={prompt.card.whenToUse}
        promptText={prompt.card.prompt}
        exampleImage={prompt.card.exampleImage}
        promptPageUrl={buildPromptPageUrl(prompt.number)}
        checkoutHref={checkoutHref}
        vaultCount={vaultCount}
      />

      <style>{`
        html,
        body {
          background: #F8FAFA;
        }

        main {
          position: relative;
          min-height: 100svh;
          overflow-x: clip;
          background: #F8FAFA;
          color: #0D0E10;
          padding: 28px;
        }

        .sp-page-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.08;
          filter: blur(18px) saturate(0.86);
          transform: scale(1.04);
        }

        .sp-bg-img {
          object-fit: cover;
        }

        .sp-shell {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 0.82fr) minmax(420px, 0.62fr);
          gap: 22px;
          width: min(1160px, 100%);
          margin: 0 auto;
          min-height: calc(100svh - 56px);
        }

        .sp-media,
        .sp-panel {
          border: 1px solid rgba(197, 198, 200, 0.72);
          background: rgba(248, 250, 250, 0.92);
        }

        .sp-media {
          position: relative;
          min-height: 640px;
          overflow: hidden;
        }

        .sp-image {
          object-fit: cover;
          object-position: 50% 25%;
          filter: saturate(0.94) contrast(1.04);
          transition: filter 220ms ease, transform 220ms ease;
        }

        .sp-image-locked {
          filter: saturate(0.82) contrast(0.98) blur(2px);
          transform: scale(1.012);
        }

        .sp-image-fallback {
          position: absolute;
          inset: 0;
          background: #EDE9E3;
        }

        .sp-panel {
          padding: clamp(22px, 4vw, 42px);
          align-self: stretch;
          display: flex;
          flex-direction: column;
        }

        .sp-eyebrow,
        .sp-vault-eyebrow {
          margin: 0 0 16px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.36em;
          color: #8B8882;
        }

        .sp-panel h1 {
          margin: 0 0 14px;
          font-family: ${cormorant.style.fontFamily};
          font-size: clamp(3.2rem, 8vw, 6rem);
          line-height: 0.9;
          font-weight: 300;
          letter-spacing: 0;
        }

        .sp-intro {
          margin: 0 0 26px;
          color: #5E5B55;
          line-height: 1.72;
          font-size: 15px;
        }

        .sp-form,
        .sp-reveal {
          border-top: 1px solid #DAD7D1;
          border-bottom: 1px solid #DAD7D1;
          padding: 24px 0;
        }

        .sp-form p,
        .sp-reveal p,
        .sp-vault p {
          margin: 0 0 16px;
          color: #4B4843;
          line-height: 1.7;
          font-size: 14px;
        }

        .sp-form label {
          display: block;
          margin: 0 0 8px;
          font-size: 10px;
          letter-spacing: 0.24em;
          color: #77736D;
          text-transform: uppercase;
        }

        .sp-form-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 8px;
        }

        .sp-form input {
          min-width: 0;
          height: 48px;
          border: 1px solid #C5C6C8;
          background: #FFFFFF;
          padding: 0 13px;
          color: #0D0E10;
          font-size: 15px;
        }

        .sp-form button,
        .sp-copy,
        .sp-vault a {
          min-height: 48px;
          border: 1px solid #0D0E10;
          background: #0D0E10;
          color: #FFFFFF;
          padding: 0 18px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          text-decoration: none;
          cursor: pointer;
        }

        .sp-error {
          margin-top: 10px !important;
          color: #8E3F32 !important;
        }

        .sp-tiny,
        .sp-tip,
        .sp-heart {
          color: #8B8882 !important;
          font-size: 12px !important;
        }

        .sp-reveal-title {
          color: #0D0E10 !important;
          font-weight: 600;
        }

        .sp-reveal pre {
          max-height: 340px;
          overflow: auto;
          white-space: pre-wrap;
          border: 1px solid #DAD7D1;
          background: #FFFFFF;
          padding: 18px;
          color: #242321;
          font-family: inherit;
          font-size: 13px;
          line-height: 1.68;
        }

        .sp-copy {
          width: 100%;
          margin: 14px 0 12px;
        }

        .sp-vault {
          margin-top: 24px;
          padding: 24px;
          background: #211F1D;
          color: #FFFFFF;
        }

        .sp-vault h2 {
          margin: 0 0 12px;
          font-family: ${cormorant.style.fontFamily};
          font-size: clamp(2.8rem, 6vw, 4.8rem);
          line-height: 0.92;
          font-weight: 300;
          letter-spacing: 0;
          color: #FFFFFF;
        }

        .sp-vault p,
        .sp-vault .sp-vault-eyebrow {
          color: rgba(255, 255, 255, 0.76);
        }

        .sp-vault a {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          border-color: #FFFFFF;
          background: #FFFFFF;
          color: #0D0E10;
          margin: 18px 0 12px;
        }

        @media (max-width: 900px) {
          main {
            padding: 14px;
          }

          .sp-shell {
            grid-template-columns: minmax(0, 1fr);
            min-height: auto;
          }

          .sp-media {
            min-height: 58svh;
          }

          .sp-form-row {
            grid-template-columns: minmax(0, 1fr);
          }

          .sp-form button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  )
}
