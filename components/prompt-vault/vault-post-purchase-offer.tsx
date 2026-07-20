"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"

import { trackAnalyticsEvent } from "@/lib/analytics/client"
import {
  buildPromptVaultPresetsDownsellHref,
  buildPromptVaultSuiteOfferHref,
} from "@/lib/revenue-engine/prompt-vault-commercial-path"

export function VaultPostPurchaseOffer({
  vaultToken,
  serifClassName,
}: {
  vaultToken: string
  serifClassName?: string
}) {
  const sectionRef = useRef<HTMLElement | null>(null)
  const suiteHref = buildPromptVaultSuiteOfferHref(vaultToken)
  const presetsHref = buildPromptVaultPresetsDownsellHref()
  const analyticsEnvironment = () =>
    ["sselfie.ai", "www.sselfie.ai"].includes(window.location.hostname)
      ? "production"
      : "non_production"

  useEffect(() => {
    const node = sectionRef.current
    if (!node) return

    let tracked = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || tracked) return
        tracked = true
        observer.disconnect()
        void trackAnalyticsEvent({
          event: "prompt_vault_suite_offer_viewed",
          properties: {
            source: "prompt_vault_post_purchase",
            offer: "first_month_49_then_97",
            placement: "after_first_result",
            environment: analyticsEnvironment(),
          },
        })
      },
      { threshold: 0.35 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function trackSuiteClick() {
    void trackAnalyticsEvent({
      event: "prompt_vault_suite_offer_clicked",
      properties: {
        source: "prompt_vault_post_purchase",
        offer: "first_month_49_then_97",
        destination: "membership_checkout",
        environment: analyticsEnvironment(),
      },
    })
  }

  function trackPresetsClick() {
    const properties = {
      source: "prompt_vault_post_purchase",
      offer: "first_month_49_then_97",
      destination: "presets_bundle_checkout",
      environment: analyticsEnvironment(),
    }
    void trackAnalyticsEvent({ event: "prompt_vault_suite_offer_declined", properties })
    void trackAnalyticsEvent({ event: "prompt_vault_presets_downsell_clicked", properties })
  }

  return (
    <section ref={sectionRef} className="vault-commercial-offer" aria-labelledby="vault-commercial-title">
      <div className="vault-commercial-inner">
        <p className="vault-commercial-eyebrow">A private offer for Vault buyers</p>
        <h2 id="vault-commercial-title" className={`vault-commercial-title ${serifClassName ?? ""}`}>
          Want Maya to do the next part with you?
        </h2>
        <p className="vault-commercial-body">
          You already have the prompts. Inside SSELFIE SUITE, Maya helps you turn one selfie into
          brand images, captions, and a clear plan for what to post next.
        </p>
        <ul className="vault-commercial-list">
          <li>Your first month is €49</li>
          <li>Then €97/month</li>
          <li>Cancel anytime from your account</li>
          <li>Your Vault access is yours either way</li>
        </ul>
        <Link href={suiteHref} className="vault-commercial-primary" onClick={trackSuiteClick}>
          Start my first month · €49
        </Link>
        <Link href={presetsHref} className="vault-commercial-secondary" onClick={trackPresetsClick}>
          Not now. Show me the presets
        </Link>
        <p className="vault-commercial-footnote">
          This is a separate monthly membership. It does not change your Vault purchase.
        </p>
      </div>
      <style>{`
        .vault-commercial-offer {
          background: #0d0e10;
          color: #f8fafa;
          padding: clamp(56px, 8vw, 84px) 20px;
        }
        .vault-commercial-inner {
          max-width: 660px;
          margin: 0 auto;
          text-align: center;
        }
        .vault-commercial-eyebrow {
          margin: 0 0 16px;
          color: rgba(248, 250, 250, 0.56);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.32em;
          text-transform: uppercase;
        }
        .vault-commercial-title {
          margin: 0 auto 18px;
          max-width: 580px;
          color: #f8fafa;
          font-size: clamp(2.1rem, 6vw, 3.6rem);
          font-weight: 300;
          line-height: 1.02;
        }
        .vault-commercial-body {
          max-width: 560px;
          margin: 0 auto 24px;
          color: rgba(248, 250, 250, 0.78);
          font-size: 15px;
          font-weight: 300;
          line-height: 1.75;
        }
        .vault-commercial-list {
          display: grid;
          gap: 8px;
          max-width: 430px;
          margin: 0 auto 28px;
          padding: 0;
          list-style: none;
          text-align: left;
        }
        .vault-commercial-list li {
          position: relative;
          padding-left: 20px;
          color: rgba(248, 250, 250, 0.88);
          font-size: 14px;
          font-weight: 300;
          line-height: 1.55;
        }
        .vault-commercial-list li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0.72em;
          width: 9px;
          height: 1px;
          background: rgba(248, 250, 250, 0.5);
        }
        .vault-commercial-primary,
        .vault-commercial-secondary {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 50px;
          max-width: 430px;
          margin-inline: auto;
          padding: 14px 24px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-align: center;
          text-decoration: none;
          text-transform: uppercase;
        }
        .vault-commercial-primary {
          background: #f8fafa;
          color: #0d0e10;
        }
        .vault-commercial-secondary {
          margin-top: 10px;
          border: 1px solid rgba(248, 250, 250, 0.28);
          color: #f8fafa;
        }
        .vault-commercial-primary:hover { background: #e5e5e5; }
        .vault-commercial-secondary:hover { border-color: rgba(248, 250, 250, 0.6); }
        .vault-commercial-footnote {
          margin: 18px auto 0;
          color: rgba(248, 250, 250, 0.5);
          font-size: 11px;
          font-weight: 300;
          line-height: 1.6;
        }
      `}</style>
    </section>
  )
}
