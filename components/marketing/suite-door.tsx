"use client"

// The SUITE door - the membership invitation placed where the warmest audiences already are
// (the free AI-prompts access page and the Vault buyer access page). Self-contained on purpose:
// it carries its own styles so it drops into any page without touching that page's CSS, fires a
// view event once when it actually scrolls into sight (IntersectionObserver, mirrors
// prompt-view-tracker), and a click event on the CTA. Copy comes in via props so each page can
// speak to its own moment.

import { useEffect, useRef } from "react"
import Link from "next/link"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

export interface SuiteDoorProps {
  eyebrow: string
  title: string
  body: string
  bullets?: string[]
  ctaLabel: string
  href: string
  footnote?: string
  /** Where this door lives, e.g. "free_prompts_access" | "vault_access" (event property). */
  placement: string
  /** Serif font className from the host page (Cormorant), so typography matches. */
  serifClassName?: string
  /** Analytics destination. Defaults to the existing cold membership door. */
  destination?: string
}

export function SuiteDoor({
  eyebrow,
  title,
  body,
  bullets,
  ctaLabel,
  href,
  footnote,
  placement,
  serifClassName,
  destination = "join-studio",
}: SuiteDoorProps) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    let tracked = false
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || tracked) return
        tracked = true
        observer.disconnect()
        try {
          trackAnalyticsEvent({
            event: "studio_membership_door_view",
            properties: { source: placement, placement, destination },
          })
        } catch {
          // fire-and-forget
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [destination, placement])

  function handleClick() {
    try {
      trackAnalyticsEvent({
        event: "studio_membership_door_click",
        properties: { source: placement, placement, destination },
      })
    } catch {
      // never block navigation
    }
  }

  return (
    <section ref={ref} className="suite-door">
      <div className="suite-door-inner">
        <p className="suite-door-eyebrow">{eyebrow}</p>
        <h2 className={`suite-door-title ${serifClassName ?? ""}`}>{title}</h2>
        <p className="suite-door-body">{body}</p>
        {bullets && bullets.length > 0 && (
          <ul className="suite-door-list">
            {bullets.map(b => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        )}
        <Link href={href} className="suite-door-cta" onClick={handleClick}>
          {ctaLabel}
        </Link>
        {footnote && <p className="suite-door-footnote">{footnote}</p>}
      </div>
      {/* Plain global style tag (namespaced classes) - matches the host pages' convention;
          the app has no styled-jsx registry, so <style jsx> would not SSR. */}
      <style>{`
        .suite-door {
          background: #0d0e10;
          color: #f8fafa;
          padding: 72px 24px;
        }
        .suite-door-inner {
          max-width: 620px;
          margin: 0 auto;
          text-align: center;
        }
        .suite-door-eyebrow {
          margin: 0 0 14px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(248, 250, 250, 0.55);
        }
        .suite-door-title {
          margin: 0 0 18px;
          font-size: 34px;
          font-weight: 300;
          line-height: 1.15;
          color: #f8fafa;
        }
        .suite-door-body {
          margin: 0 auto 22px;
          max-width: 540px;
          font-size: 15px;
          font-weight: 300;
          line-height: 1.75;
          color: rgba(248, 250, 250, 0.78);
        }
        .suite-door-list {
          margin: 0 auto 26px;
          padding: 0;
          max-width: 460px;
          list-style: none;
          text-align: left;
        }
        .suite-door-list li {
          position: relative;
          padding: 6px 0 6px 22px;
          font-size: 14px;
          font-weight: 300;
          line-height: 1.6;
          color: rgba(248, 250, 250, 0.85);
        }
        .suite-door-list li::before {
          content: "";
          position: absolute;
          left: 0;
          top: 16px;
          width: 10px;
          height: 1px;
          background: rgba(248, 250, 250, 0.45);
        }
        .suite-door-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
          padding: 14px 34px;
          background: #f8fafa;
          color: #0d0e10;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          text-decoration: none;
        }
        .suite-door-cta:hover {
          background: #e5e5e5;
        }
        .suite-door-footnote {
          margin: 16px 0 0;
          font-size: 11.5px;
          font-weight: 300;
          line-height: 1.6;
          color: rgba(248, 250, 250, 0.5);
        }
        @media (max-width: 640px) {
          .suite-door {
            padding: 56px 20px;
          }
          .suite-door-title {
            font-size: 28px;
          }
        }
      `}</style>
    </section>
  )
}
