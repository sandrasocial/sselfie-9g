import type { MayaLandingRenderInput, MayaLandingRenderResult } from "@/lib/maya/page-generation/types"
import { sanitizePreview, sanitizeUserFacingText } from "@/lib/maya/page-generation/sanitizers"

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function renderMayaLandingHtml(input: MayaLandingRenderInput): MayaLandingRenderResult {
  const title = sanitizeUserFacingText(input.title || "Landing Page", 88)
  const previewText = sanitizePreview(input.previewText)

  const hook = sanitizeUserFacingText(input.blueprint.hook, 96)
  const truth = sanitizeUserFacingText(input.blueprint.truth, 340)
  const proofBullets = input.blueprint.proofBullets.map((bullet) => sanitizeUserFacingText(bullet, 140)).filter(Boolean)
  const ctaLabel = sanitizeUserFacingText(input.blueprint.ctaLabel, 44)
  const ctaHref = String(input.blueprint.ctaHref || "").trim()
  const heroImage = String(input.blueprint.heroImageUrl || "").trim()
  const supportImages = input.blueprint.supportImageUrls
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .slice(0, 2)

  const safeAssetId = escapeHtml(input.assetId)
  const safeTitle = escapeHtml(title)
  const safePreview = escapeHtml(previewText)
  const safeHook = escapeHtml(hook)
  const safeTruth = escapeHtml(truth)
  const safeCtaLabel = escapeHtml(ctaLabel || "Join Studio")
  const safeCtaHref = escapeHtml(ctaHref || input.checkoutUrl)
  const safeCheckoutUrl = escapeHtml(input.checkoutUrl)

  const proofHtml = proofBullets
    .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
    .join("")

  const supportHtml =
    supportImages.length > 0
      ? supportImages
          .map(
            (url) => `
        <figure class=\"support-image\">
          <img src=\"${escapeHtml(url)}\" alt=\"Brand visual\" loading=\"lazy\" />
        </figure>`,
          )
          .join("")
      : ""

  const html = `<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>${safeTitle}</title>
    <link href=\"https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@200;300&family=Inter:wght@300;500&display=swap\" rel=\"stylesheet\">
    <style>
      :root {
        --obsidian: #0a0a0a;
        --porcelain: #ffffff;
        --pearl: #f5f5f5;
        --smoke: #666666;
        --whisper: #e5e5e5;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: var(--obsidian);
        color: var(--porcelain);
        font-family: Inter, sans-serif;
      }
      .wrap {
        max-width: 1160px;
        margin: 0 auto;
        padding: 32px 20px 56px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
        border: 1px solid var(--whisper);
        background: rgba(255, 255, 255, 0.04);
        min-height: 420px;
      }
      .hero-copy {
        padding: 32px 28px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .kicker {
        margin: 0;
        font-size: 11px;
        letter-spacing: 0.28em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.75);
        font-weight: 500;
      }
      h1 {
        margin: 16px 0 14px;
        font-family: "Cormorant Garamond", serif;
        text-transform: uppercase;
        letter-spacing: -0.01em;
        font-weight: 300;
        line-height: 1.06;
        font-size: clamp(34px, 6vw, 64px);
      }
      .truth {
        margin: 0;
        font-size: 16px;
        line-height: 1.8;
        color: rgba(255,255,255,0.78);
        font-weight: 300;
      }
      .hero-actions {
        margin-top: 24px;
      }
      .cta {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--porcelain);
        background: var(--porcelain);
        color: var(--obsidian);
        text-decoration: none;
        padding: 12px 18px;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        font-size: 10px;
        font-weight: 500;
      }
      .hero-media {
        border-left: 1px solid var(--whisper);
        min-height: 420px;
        background: rgba(255, 255, 255, 0.06);
      }
      .hero-media img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .hero-placeholder {
        height: 100%;
        display: grid;
        place-items: center;
        color: rgba(255,255,255,0.6);
        font-size: 14px;
        padding: 20px;
        text-align: center;
      }
      .proof {
        margin-top: 18px;
        border: 1px solid var(--whisper);
        background: rgba(255,255,255,0.03);
        padding: 20px;
      }
      .proof-title {
        margin: 0 0 10px;
        font-size: 11px;
        letter-spacing: 0.26em;
        text-transform: uppercase;
        font-weight: 500;
        color: rgba(255,255,255,0.75);
      }
      .proof ul {
        margin: 0;
        padding-left: 18px;
      }
      .proof li {
        margin-bottom: 8px;
        color: rgba(255,255,255,0.82);
        line-height: 1.6;
        font-weight: 300;
      }
      .support-grid {
        margin-top: 18px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .support-image {
        margin: 0;
        border: 1px solid var(--whisper);
        min-height: 180px;
        background: rgba(255,255,255,0.05);
      }
      .support-image img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .cta-strip {
        margin-top: 24px;
        border: 1px solid var(--whisper);
        background: var(--pearl);
        color: var(--obsidian);
        padding: 22px;
      }
      .cta-strip h2 {
        margin: 0 0 8px;
        font-size: clamp(28px, 4.5vw, 44px);
        line-height: 1.05;
        font-family: "Cormorant Garamond", serif;
        font-weight: 300;
        text-transform: uppercase;
      }
      .cta-strip p {
        margin: 0;
        color: var(--smoke);
        font-size: 15px;
        line-height: 1.7;
        font-weight: 300;
      }
      .lead-grid {
        margin-top: 14px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
        gap: 10px;
      }
      .field {
        width: 100%;
        border: 1px solid var(--whisper);
        background: var(--porcelain);
        color: var(--obsidian);
        padding: 12px;
        font-size: 14px;
        font-family: Inter, sans-serif;
        font-weight: 300;
      }
      .lead-button {
        border: 1px solid var(--obsidian);
        background: var(--obsidian);
        color: var(--porcelain);
        padding: 12px 16px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        font-size: 10px;
        font-weight: 500;
        cursor: pointer;
      }
      .lead-status {
        margin-top: 8px;
        min-height: 18px;
        color: var(--smoke);
        font-size: 12px;
      }
      .meta {
        margin-top: 10px;
        font-size: 11px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
        color: rgba(255,255,255,0.45);
        font-weight: 500;
      }
      @media (max-width: 860px) {
        .hero {
          grid-template-columns: 1fr;
        }
        .hero-media {
          border-left: none;
          border-top: 1px solid var(--whisper);
          min-height: 300px;
        }
        .support-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 640px) {
        .wrap {
          padding: 22px 20px 40px;
        }
        .lead-grid {
          grid-template-columns: 1fr;
        }
        .cta {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <main class=\"wrap\">
      <section class=\"hero\">
        <article class=\"hero-copy\">
          <div>
            <p class=\"kicker\">Maya Landing Draft</p>
            <h1>${safeHook}</h1>
            <p class=\"truth\">${safeTruth}</p>
            <div class=\"meta\">${safePreview}</div>
          </div>
          <div class=\"hero-actions\">
            <a class=\"cta js-checkout-btn\" href=\"${safeCtaHref}\" target=\"_blank\" rel=\"noreferrer\">${safeCtaLabel}</a>
          </div>
        </article>
        <div class=\"hero-media\">
          ${
            heroImage
              ? `<img src=\"${escapeHtml(heroImage)}\" alt=\"Hero visual\" />`
              : `<div class=\"hero-placeholder\">Add at least one brand image in Maya to personalize this hero.</div>`
          }
        </div>
      </section>

      <section class=\"proof\">
        <p class=\"proof-title\">Proof</p>
        <ul>${proofHtml}</ul>
      </section>

      ${supportHtml ? `<section class=\"support-grid\">${supportHtml}</section>` : ""}

      <section class=\"cta-strip\" id=\"lead-form\">
        <h2>Ready To Launch?</h2>
        <p>Drop your email and continue directly to checkout.</p>
        <form id=\"maya-lead-form\" class=\"lead-grid\">
          <input class=\"field\" type=\"text\" name=\"name\" placeholder=\"First name\" maxlength=\"120\" />
          <input class=\"field\" type=\"email\" name=\"email\" placeholder=\"Email address\" required />
          <button class=\"lead-button\" type=\"submit\">${safeCtaLabel}</button>
        </form>
        <p class=\"lead-status\" id=\"maya-lead-status\"></p>
      </section>
    </main>

    <script>
      (function () {
        const pageId = ${JSON.stringify(safeAssetId)}
        const checkoutUrl = ${JSON.stringify(input.checkoutUrl)}
        const leadForm = document.getElementById("maya-lead-form")
        const leadStatus = document.getElementById("maya-lead-status")
        const checkoutButton = document.querySelector(".js-checkout-btn")

        const track = (event, properties) => {
          const payload = {
            event,
            path: window.location.pathname,
            properties: properties || {},
          }

          if (navigator.sendBeacon) {
            try {
              const blob = new Blob([JSON.stringify(payload)], { type: "application/json" })
              navigator.sendBeacon("/api/analytics/event", blob)
              return
            } catch {}
          }

          fetch("/api/analytics/event", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {})
        }

        track("maya_public_page_view", { pageId })

        if (checkoutButton) {
          checkoutButton.addEventListener("click", function () {
            track("maya_public_page_checkout_clicked", { pageId, placement: "hero" })
          })
        }

        if (!leadForm) return

        leadForm.addEventListener("submit", async function (event) {
          event.preventDefault()
          const formData = new FormData(leadForm)
          const payload = {
            pageId,
            name: formData.get("name"),
            email: formData.get("email"),
            source: "landing_page_form",
          }

          if (leadStatus) leadStatus.textContent = "Saving your details..."

          try {
            const response = await fetch("/api/maya/public/lead", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })

            if (!response.ok) {
              throw new Error("Could not save your details")
            }

            track("maya_public_page_lead_captured", { pageId, placement: "form" })
            if (leadStatus) leadStatus.textContent = "Perfect. Redirecting you to checkout..."
            window.setTimeout(() => {
              window.location.href = checkoutUrl
            }, 500)
          } catch (error) {
            if (leadStatus) leadStatus.textContent = "Please try again, or use the main CTA above."
          }
        })
      })()
    </script>
  </body>
</html>`

  return {
    html,
    title,
    previewText,
  }
}
