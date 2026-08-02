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

type CheckoutOrderBump = {
  baseTier: string
  upgradeTier: string
  label: string
  description: string
  upgradeName: string
  upgradeMeta: string
  upgradePrice: string
}

const DEFAULT_VISUALS: CheckoutEmailCaptureVisual[] = [
  {
    src: "/images/ai-prompts/mysterious-vogue-shot-2.png",
    alt: "Mysterious editorial portrait from the Prompt Vault",
  },
  {
    src: "/images/ai-prompts/quiet-luxury-london-shot-2.jpg",
    alt: "Quiet luxury brand portrait example",
  },
  {
    src: "/images/ai-prompts/clean-girl-morning-shot-3.jpg",
    alt: "Clean morning editorial portrait example",
  },
]

export function PromptVaultCheckoutEmailCapture({
  params,
  actionPath = "/checkout/prompt-vault",
  eyebrow = "AI PHOTO PROMPT VAULT",
  title = "Where should I send your Vault access?",
  copy = "Add your email before checkout so your private access link and receipt go to the right place. The Vault gives you complete photoshoots with matching prompts you can copy into ChatGPT.",
  proofQuote = "Best one so far. I love that it looks real, and me.",
  proofAuthor = "A SSELFIE member, 50 & fabulous",
  inputId = "prompt-vault-checkout-email",
  buttonLabel = "Continue to checkout",
  skipLabel = "Continue without email",
  productName = "Prompt Vault",
  productMeta = "31 photoshoots · 237 copy-and-paste prompts",
  productPrice = "$37 one-time",
  orderLabel = "You are joining",
  reassurance = "Your receipt and access link go to this inbox.",
  visuals = DEFAULT_VISUALS,
  prefillEmail = "",
  proceedOnSubmit = false,
  allowSkip = false,
  mobileFormFirst = false,
  showSupportingVisuals = true,
  orderBump,
}: {
  params: CheckoutEmailCaptureParams
  actionPath?: string
  eyebrow?: string
  title?: string
  copy?: string
  proofQuote?: string
  proofAuthor?: string
  inputId?: string
  buttonLabel?: string
  skipLabel?: string
  productName?: string
  productMeta?: string
  productPrice?: string
  orderLabel?: string
  reassurance?: string
  visuals?: CheckoutEmailCaptureVisual[]
  prefillEmail?: string
  proceedOnSubmit?: boolean
  allowSkip?: boolean
  mobileFormFirst?: boolean
  showSupportingVisuals?: boolean
  orderBump?: CheckoutOrderBump
}) {
  const hiddenParams = buildCheckoutEmailCaptureHiddenParams(params).filter((item) => {
    if (orderBump && item.name === "tier") return false
    if (proceedOnSubmit && item.name === "skip_email_capture") return false
    return true
  })
  const skipHref = allowSkip ? buildSkipCheckoutEmailCaptureHref(actionPath, params) : null
  const heroVisual = visuals[0] || DEFAULT_VISUALS[0]
  const supportingVisuals = showSupportingVisuals
    ? visuals.length > 1
      ? visuals.slice(1, 3)
      : DEFAULT_VISUALS.slice(1, 3)
    : []
  const tierInputId = `${inputId}-tier`
  const bumpInputId = `${inputId}-bump`
  const orderNameId = `${inputId}-order-name`
  const orderMetaId = `${inputId}-order-meta`
  const orderPriceId = `${inputId}-order-price`

  return (
    <main className={inter.className}>
      <section className="pv-email-capture">
        <div
          className={`pv-email-shell${mobileFormFirst ? " pv-mobile-form-first" : ""}${showSupportingVisuals ? "" : " pv-single-visual"}`}
        >
          <aside className="pv-visual-panel" aria-label={`${productName} preview`}>
            <div className="pv-hero-visual">
              <Image src={heroVisual.src} alt={heroVisual.alt} fill priority sizes="(min-width: 900px) 44vw, 100vw" />
            </div>
            {supportingVisuals.length > 0 ? (
              <div className="pv-mini-row" aria-label="SSELFIE visual examples">
                {supportingVisuals.map((visual) => (
                  <div className="pv-mini-visual" key={visual.src}>
                    <Image src={visual.src} alt={visual.alt} fill sizes="120px" />
                  </div>
                ))}
              </div>
            ) : null}
          </aside>

          <div className="pv-email-card">
            <div className="pv-progress" aria-label="Checkout progress">
              <span>Email</span>
              <span>Secure payment</span>
            </div>

            <div className="pv-order">
              <div>
                <p className="pv-order-label">{orderLabel}</p>
                <p className="pv-order-name" id={orderNameId}>{productName}</p>
                <p className="pv-order-meta" id={orderMetaId}>{productMeta}</p>
              </div>
              <p className="pv-order-price" id={orderPriceId}>{productPrice}</p>
            </div>

            <p className="pv-eyebrow">{eyebrow}</p>
            <h1 className={`${cormorant.className} pv-title`}>{title}</h1>
            {copy ? <p className="pv-copy">{copy}</p> : null}
            {proofQuote && (
              <p
                className="pv-copy"
                style={{ fontStyle: "italic", color: "rgb(79, 80, 82)", margin: "10px 0 0" }}
              >
                &ldquo;{proofQuote}&rdquo;{" "}
                <span
                  style={{
                    fontStyle: "normal",
                    fontSize: "12px",
                    letterSpacing: "0.04em",
                    color: "rgb(129, 130, 131)",
                  }}
                >
                  {proofAuthor}
                </span>
              </p>
            )}

            <form action={actionPath} method="get" className="pv-form">
              {hiddenParams.map((item) => (
                <input key={item.name} type="hidden" name={item.name} value={item.value} />
              ))}
              {orderBump ? (
                <input id={tierInputId} type="hidden" name="tier" defaultValue={orderBump.baseTier} />
              ) : null}
              {proceedOnSubmit ? (
                <input type="hidden" name="skip_email_capture" value="1" />
              ) : null}
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
                defaultValue={prefillEmail}
                placeholder="you@example.com"
                className="pv-input"
              />
              <p className="pv-helper">{reassurance}</p>
              {orderBump ? (
                <label className="pv-bump" htmlFor={bumpInputId}>
                  <input id={bumpInputId} type="checkbox" className="pv-bump-check" />
                  <span className="pv-bump-body">
                    <span className="pv-bump-head">
                      <span className="pv-bump-title">{orderBump.label}</span>
                      <span className="pv-bump-price">{orderBump.upgradePrice}</span>
                    </span>
                    <span className="pv-bump-copy">{orderBump.description}</span>
                  </span>
                </label>
              ) : null}
              <button type="submit" className="pv-button">
                {buttonLabel}
              </button>
            </form>

            {skipHref ? (
              <a href={skipHref} className="pv-skip">
                {skipLabel}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <style>{`
        body {
          background: rgb(248, 250, 250);
        }

        .pv-email-shell,
        .pv-email-shell * {
          box-sizing: border-box;
          min-width: 0;
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

        .pv-email-shell.pv-mobile-form-first .pv-hero-visual img {
          object-position: center 34%;
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

        @media (min-width: 900px) {
          .pv-email-shell.pv-single-visual .pv-email-card {
            padding: 34px clamp(34px, 4vw, 48px);
          }

          .pv-email-shell.pv-single-visual .pv-progress {
            margin-bottom: 16px;
          }

          .pv-email-shell.pv-single-visual .pv-order {
            margin-bottom: 22px;
            padding-bottom: 18px;
          }

          .pv-email-shell.pv-single-visual .pv-eyebrow {
            margin-bottom: 12px;
          }

          .pv-email-shell.pv-single-visual .pv-title {
            margin-bottom: 14px;
            font-size: clamp(40px, 4.4vw, 54px);
          }

          .pv-email-shell.pv-single-visual .pv-copy {
            margin-bottom: 22px;
          }
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
            flex-direction: column;
            gap: 12px;
            margin-bottom: 24px;
          }

          .pv-order-price {
            max-width: 100%;
            text-align: left;
            white-space: normal;
          }

          .pv-title {
            font-size: clamp(38px, 12vw, 52px);
          }

          .pv-email-shell.pv-mobile-form-first .pv-email-card {
            order: 1;
          }

          .pv-email-shell.pv-mobile-form-first .pv-visual-panel {
            order: 2;
            border-top: 1px solid rgba(197,198,200,0.42);
            border-bottom: 0;
          }

          .pv-email-shell.pv-mobile-form-first .pv-hero-visual img {
            object-position: center 28%;
          }

          .pv-email-shell.pv-mobile-form-first .pv-order {
            flex-direction: row;
            gap: 16px;
          }

          .pv-email-shell.pv-mobile-form-first .pv-order-price {
            text-align: right;
            white-space: nowrap;
          }
        }

        .pv-bump {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-top: 4px;
          padding: 16px;
          border: 1px solid rgba(13,14,16,0.18);
          background: rgb(248, 250, 250);
          cursor: pointer;
        }

        .pv-bump:hover {
          border-color: rgb(13, 14, 16);
        }

        .pv-bump-check {
          margin-top: 2px;
          width: 18px;
          height: 18px;
          flex: 0 0 auto;
          accent-color: rgb(13, 14, 16);
          cursor: pointer;
        }

        .pv-bump-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .pv-bump-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: baseline;
        }

        .pv-bump-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgb(13, 14, 16);
        }

        .pv-bump-price {
          font-size: 12px;
          font-weight: 600;
          color: rgb(13, 14, 16);
          white-space: nowrap;
        }

        .pv-bump-copy {
          font-size: 13px;
          line-height: 1.55;
          color: rgb(79, 80, 82);
        }
      `}</style>
      {orderBump ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var cb = document.getElementById(${JSON.stringify(bumpInputId)});
  var tierInput = document.getElementById(${JSON.stringify(tierInputId)});
  var nameEl = document.getElementById(${JSON.stringify(orderNameId)});
  var metaEl = document.getElementById(${JSON.stringify(orderMetaId)});
  var priceEl = document.getElementById(${JSON.stringify(orderPriceId)});
  if(!cb || !tierInput) return;
  var base = ${JSON.stringify({ tier: orderBump.baseTier, name: productName, meta: productMeta, price: productPrice })};
  var up = ${JSON.stringify({ tier: orderBump.upgradeTier, name: orderBump.upgradeName, meta: orderBump.upgradeMeta, price: orderBump.upgradePrice })};
  cb.addEventListener('change', function(){
    var v = cb.checked ? up : base;
    tierInput.value = v.tier;
    if(nameEl) nameEl.textContent = v.name;
    if(metaEl) metaEl.textContent = v.meta;
    if(priceEl) priceEl.textContent = v.price;
  });
})();`,
          }}
        />
      ) : null}
    </main>
  )
}
