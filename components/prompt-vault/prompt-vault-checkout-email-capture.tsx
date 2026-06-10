import { Cormorant_Garamond, Inter } from "next/font/google"
import {
  buildCheckoutEmailCaptureHiddenParams,
  buildSkipCheckoutEmailCaptureHref,
  type CheckoutEmailCaptureParams,
} from "@/lib/revenue-engine/anonymous-checkout-capture"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600"] })

export function PromptVaultCheckoutEmailCapture({
  params,
  actionPath = "/checkout/prompt-vault",
  eyebrow = "AI PHOTO PROMPT VAULT",
  title = "Where should I send your Vault access?",
  copy = "Add your email before checkout so your access link and receipt go to the right place. If anything pauses, I can also help you find your purchase faster.",
  inputId = "prompt-vault-checkout-email",
  buttonLabel = "Continue to checkout",
}: {
  params: CheckoutEmailCaptureParams
  actionPath?: string
  eyebrow?: string
  title?: string
  copy?: string
  inputId?: string
  buttonLabel?: string
}) {
  const hiddenParams = buildCheckoutEmailCaptureHiddenParams(params)
  const skipHref = buildSkipCheckoutEmailCaptureHref(actionPath, params)

  return (
    <main className={inter.className}>
      <section className="pv-email-capture">
        <div className="pv-email-card">
          <p className="pv-eyebrow">{eyebrow}</p>
          <h1 className={`${cormorant.className} pv-title`}>
            {title}
          </h1>
          <p className="pv-copy">
            {copy}
          </p>

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
            <button type="submit" className="pv-button">
              {buttonLabel}
            </button>
          </form>

          <a href={skipHref} className="pv-skip">
            Continue without email
          </a>
        </div>
      </section>

      <style>{`
        body {
          background: #F8FAFA;
        }

        .pv-email-capture {
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 28px;
          background:
            linear-gradient(180deg, rgba(248,250,250,0.94), rgba(248,250,250,1)),
            #F8FAFA;
          color: #0D0E10;
        }

        .pv-email-card {
          width: min(100%, 520px);
          border: 1px solid rgba(197,198,200,0.55);
          background: #FFFFFF;
          padding: clamp(30px, 7vw, 54px);
          box-shadow: 0 24px 80px rgba(13,14,16,0.08);
        }

        .pv-eyebrow {
          margin: 0 0 18px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: #818283;
        }

        .pv-title {
          margin: 0 0 18px;
          font-size: clamp(42px, 10vw, 64px);
          font-weight: 300;
          line-height: 0.98;
          letter-spacing: -0.02em;
        }

        .pv-copy {
          margin: 0 0 30px;
          color: #4F5052;
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
          color: #4F5052;
        }

        .pv-input {
          min-height: 50px;
          border: 1px solid rgba(129,130,131,0.35);
          background: #F8FAFA;
          color: #0D0E10;
          padding: 0 15px;
          font-size: 16px;
          outline: none;
        }

        .pv-input:focus {
          border-color: #0D0E10;
          background: #FFFFFF;
        }

        .pv-button {
          min-height: 52px;
          border: 0;
          background: #0D0E10;
          color: #FFFFFF;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .pv-skip {
          display: inline-block;
          margin-top: 20px;
          color: #818283;
          font-size: 13px;
          text-decoration: underline;
          text-underline-offset: 4px;
        }
      `}</style>
    </main>
  )
}
