import { Cormorant_Garamond, Inter } from "next/font/google"
import Image from "next/image"
import {
  buildCheckoutEmailCaptureHiddenParams,
  buildSkipCheckoutEmailCaptureHref,
  type CheckoutEmailCaptureParams,
} from "@/lib/revenue-engine/anonymous-checkout-capture"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

type CheckoutEmailCaptureVisual = {
  src: string
  alt: string
}

const DEFAULT_VISUALS: CheckoutEmailCaptureVisual[] = [
  {
    src: "/images/email/prompt-pack-hero.jpg",
    alt: "Editorial AI photoshoot portrait from the Prompt Vault",
  },
  {
    src: "/images/ai-prompts/quiet-luxury-london-shot-1.jpg",
    alt: "Quiet luxury brand portrait example",
  },
  {
    src: "/images/ai-prompts/clean-girl-morning-shot-1.jpg",
    alt: "Clean morning editorial portrait example",
  },
]

export function PromptVaultCheckoutEmailCapture({
  params,
  actionPath = "/checkout/prompt-vault",
  eyebrow = "AI PHOTO PROMPT VAULT",
  title = "Where should I send your Vault access?",
  copy = "Add your email before checkout so your access link and receipt go to the right place. If anything pauses, I can also help you find your purchase faster.",
  inputId = "prompt-vault-checkout-email",
  buttonLabel = "Continue to checkout",
  skipLabel = "Continue without email",
  productName = "Prompt Vault",
  productMeta = "Full editorial prompt collections",
  productPrice = "$27 one-time",
  reassurance = "Your receipt and access link go to this inbox.",
  visuals = DEFAULT_VISUALS,
}: {
  params: CheckoutEmailCaptureParams
  actionPath?: string
  eyebrow?: string
  title?: string
  copy?: string
  inputId?: string
  buttonLabel?: string
  skipLabel?: string
  productName?: string
  productMeta?: string
  productPrice?: string
  reassurance?: string
  visuals?: CheckoutEmailCaptureVisual[]
}) {
  const hiddenParams = buildCheckoutEmailCaptureHiddenParams(params)
  const skipHref = buildSkipCheckoutEmailCaptureHref(actionPath, params)
  const heroVisual = visuals[0] || DEFAULT_VISUALS[0]
  const supportingVisuals = (visuals.length > 1 ? visuals.slice(1, 3) : DEFAULT_VISUALS.slice(1, 3))

  return (
    <main className={inter.className}>
      <section className="pv-email-capture">
        <div className="pv-email-shell">
          <aside className="pv-visual-panel" aria-label={`${productName} preview`}>
            <div className="pv-hero-visual">
              <Image src={heroVisual.src} alt={heroVisual.alt} fill priority sizes="(min-width: 900px) 44vw, 100vw" />
            </div>
            <div className="pv-mini-row" aria-label="SSELFIE visual examples">
              {supportingVisuals.map((visual) => (
                <div className="pv-mini-visual" key={visual.src}>
                  <Image src={visual.src} alt={visual.alt} fill sizes="120px" />
                </div>
              ))}
            </div>
          </aside>

          <div className="pv-email-card">
            <div className="pv-progress" aria-label="Checkout progress">
              <span>Email</span>
              <span>Secure payment</span>
            </div>

            <div className="pv-order">
              <div>
                <p className="pv-order-label">You are joining</p>
                <p className="pv-order-name">{productName}</p>
                <p className="pv-order-meta">{productMeta}</p>
              </div>
              <p className="pv-order-price">{productPrice}</p>
            </div>

            <p className="pv-eyebrow">{eyebrow}</p>
            <h1 className={`${cormorant.className} pv-title`}>{title}</h1>
            <p className="pv-copy">{copy}</p>

            <form action={actionPath} method="get" className="pv-form">
              {hiddenParams.map((item) => (
                <input key={item.name} type="hidden" name={item.name} value={item.value} />
              ))}
              <label htmlFor={inputId} className="pv-label">
                Email address
              </label>
              <input
                id={inputId}
                name="checkout_email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                placeholder="you@example.com"
                className="pv-input"
              />
              <p className="pv-helper">{reassurance}</p>
              <button type="submit" className="pv-button">
                {buttonLabel}
              </button>
            </form>

            <a href={skipHref} className="pv-skip">
              {skipLabel}
            </a>
          </div>
        </div>
      </section>

      <style>{`
        body {
          background: rgb(248, 250, 250);
        }

        .pv-email-capture {
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(18px, 4vw, 44px);
          background:
            linear-gradient(135deg, rgba(248,250,250,0.96), rgba(255,255,255,0.72) 48%, rgba(248,250,250,1)),
            rgb(248, 250, 250);
          color: rgb(13, 14, 16);
        }

        .pv-email-shell {
          width: min(100%, 1120px);
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(420px, 0.88fr);
          align-items: stretch;
          border: 1px solid rgba(197,198,200,0.48);
          background: rgba(255,255,255,0.72);
          box-shadow: 0 30px 90px rgba(13,14,16,0.09);
        }

        .pv-visual-panel {
          position: relative;
          min-height: 620px;
          display: grid;
          grid-template-rows: 1fr auto;
          gap: 10px;
          padding: 10px;
          background: rgb(255, 255, 255);
          border-right: 1px solid rgba(197,198,200,0.42);
        }

        .pv-hero-visual,
        .pv-mini-visual {
          position: relative;
          overflow: hidden;
          background: rgb(237, 238, 238);
        }

        .pv-hero-visual {
          min-height: 0;
        }

        .pv-hero-visual img,
        .pv-mini-visual img {
          object-fit: cover;
          object-position: center;
        }

        .pv-mini-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .pv-mini-visual {
          aspect-ratio: 1 / 1;
        }

        .pv-email-card {
          width: 100%;
          background: rgb(255, 255, 255);
          padding: clamp(30px, 5vw, 58px);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .pv-progress {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-bottom: 24px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgb(129, 130, 131);
        }

        .pv-progress span {
          border-top: 1px solid rgba(129,130,131,0.26);
          padding-top: 10px;
        }

        .pv-progress span:first-child {
          color: rgb(13, 14, 16);
          border-top-color: rgb(13, 14, 16);
        }

        .pv-order {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 30px;
          padding-bottom: 22px;
          border-bottom: 1px solid rgba(197,198,200,0.5);
        }

        .pv-order-label {
          margin: 0 0 8px;
          color: rgb(129, 130, 131);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .pv-order-name {
          margin: 0;
          color: rgb(13, 14, 16);
          font-size: 17px;
          font-weight: 600;
          letter-spacing: 0.01em;
        }

        .pv-order-meta {
          margin: 6px 0 0;
          color: rgb(79, 80, 82);
          font-size: 13px;
          line-height: 1.5;
        }

        .pv-order-price {
          margin: 0;
          flex: 0 0 auto;
          color: rgb(13, 14, 16);
          font-size: 14px;
          font-weight: 600;
          text-align: right;
          white-space: nowrap;
        }

        .pv-eyebrow {
          margin: 0 0 18px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: rgb(129, 130, 131);
        }

        .pv-title {
          margin: 0 0 18px;
          font-size: clamp(40px, 6vw, 62px);
          font-weight: 300;
          line-height: 0.98;
          letter-spacing: 0;
        }

        .pv-copy {
          margin: 0 0 30px;
          color: rgb(79, 80, 82);
          font-size: 15px;
          line-height: 1.8;
        }

        .pv-form {
          display: grid;
          gap: 12px;
        }

        .pv-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgb(79, 80, 82);
        }

        .pv-input {
          min-height: 50px;
          border: 1px solid rgba(129,130,131,0.35);
          background: rgb(248, 250, 250);
          color: rgb(13, 14, 16);
          padding: 0 15px;
          font-size: 16px;
          outline: none;
        }

        .pv-helper {
          margin: -4px 0 2px;
          color: rgb(129, 130, 131);
          font-size: 12px;
          line-height: 1.6;
        }

        .pv-input:focus {
          border-color: rgb(13, 14, 16);
          background: rgb(255, 255, 255);
        }

        .pv-button {
          min-height: 52px;
          border: 0;
          background: rgb(13, 14, 16);
          color: rgb(255, 255, 255);
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          transition: transform 180ms ease, background 180ms ease;
        }

        .pv-button:active {
          transform: translateY(1px);
        }

        .pv-skip {
          display: inline-block;
          margin-top: 20px;
          color: rgb(129, 130, 131);
          font-size: 13px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }

        @media (max-width: 899px) {
          .pv-email-capture {
            align-items: flex-start;
            padding: 14px;
          }

          .pv-email-shell {
            grid-template-columns: 1fr;
          }

          .pv-visual-panel {
            min-height: auto;
            grid-template-columns: 1fr;
            border-right: 0;
            border-bottom: 1px solid rgba(197,198,200,0.42);
          }

          .pv-hero-visual {
            height: 184px;
          }

          .pv-mini-row {
            display: none;
          }

          .pv-email-card {
            padding: 28px 20px 30px;
          }

          .pv-progress {
            margin-bottom: 18px;
          }

          .pv-order {
            align-items: flex-start;
            margin-bottom: 24px;
          }

          .pv-title {
            font-size: clamp(38px, 12vw, 52px);
          }
        }
      `}</style>
    </main>
  )
}
