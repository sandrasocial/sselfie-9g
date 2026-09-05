"use client"

import Image from "next/image"
import Link from "next/link"
import { startTransition, useState } from "react"
import { CopyButton } from "@/components/ai-prompts/copy-button"
import { PromptViewTracker } from "@/components/prompt-vault/prompt-view-tracker"
import { buildAppV3AestheticHref } from "@/lib/app-v3/navigation"
import type { PromptCard } from "@/lib/ai-prompts/prompt-data"

type Collection = {
  id: string
  eyebrow: string
  title: string
  note: string
  heroImage?: string
  cards: PromptCard[]
}

export function DeferredVaultCollection({
  collection,
  thumbnails,
  aestheticId,
  isActiveMember,
  serifClassName,
}: {
  collection: Collection
  thumbnails: string[]
  aestheticId: string
  isActiveMember: boolean
  serifClassName: string
}) {
  const [hasOpened, setHasOpened] = useState(false)

  return (
    <details
      id={collection.id}
      className="pva-details"
      onToggle={event => {
        if (!event.currentTarget.open || hasOpened) return
        requestAnimationFrame(() => startTransition(() => setHasOpened(true)))
      }}
    >
      <summary className="pva-summary">
        <div className="pva-summary-preview" aria-hidden>
          {(thumbnails.length > 0
            ? thumbnails.slice(0, 3)
            : collection.heroImage
              ? [collection.heroImage]
              : []
          ).map((src, index) => (
            <div key={`${src}-${index}`} className="pva-summary-thumb">
              <Image
                src={src}
                alt=""
                fill
                aria-hidden
                sizes="(max-width: 640px) 30vw, 12vw"
                style={{ objectFit: "cover", objectPosition: "center top" }}
              />
            </div>
          ))}
        </div>
        <div className="pva-summary-text">
          <span className="pva-series-eyebrow">
            {collection.eyebrow === "NEW PHOTOSHOOT" ? "NEW · " : ""}
            {collection.cards.length} prompts
          </span>
          <span className={`pva-series-title ${serifClassName}`}>
            {collection.title.replace(/\s*Editorial\s*$/i, "")}
          </span>
          <span className="pva-series-note">{collection.note}</span>
        </div>
        <span className="pva-open-label">
          <span className="pva-open-text">Open shoot</span>
          <span className="pva-close-text">Close shoot</span>
        </span>
      </summary>

      {hasOpened ? (
        <div className="pva-details-content">
          {thumbnails.length > 0 && (
            <div className="pva-thumb-strip">
              {thumbnails.map((src, index) => (
                <div key={`${src}-${index}`} className="pva-thumb-item">
                  <Image
                    src={src}
                    alt=""
                    fill
                    aria-hidden
                    sizes="(max-width: 640px) 16vw, 8vw"
                    style={{ objectFit: "cover", objectPosition: "center top" }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="pva-cards">
            {collection.cards.map(card => (
              <article key={card.id} id={card.id} className="pva-card">
                <PromptViewTracker
                  promptId={card.id}
                  promptTitle={card.title}
                  promptNumber={card.number}
                  mood={card.mood}
                />
                {card.exampleImage && (
                  <div className="pva-card-image-wrap">
                    <Image
                      src={card.exampleImage}
                      alt={`Example result for ${card.title}`}
                      width={600}
                      height={900}
                      className="pva-card-image"
                    />
                  </div>
                )}
                <div className="pva-card-body">
                  <div className="pva-card-header">
                    <span className="pva-card-number">{card.number}</span>
                    <h3 className={`pva-card-title ${serifClassName}`}>{card.title}</h3>
                  </div>
                  {card.whenToUse && (
                    <>
                      <p className="pva-when-label">When to use it</p>
                      <p className="pva-when">{card.whenToUse}</p>
                    </>
                  )}
                  <p className="pva-mood">{card.mood}</p>
                  <div className="pva-prompt-wrap">
                    <p className="pva-prompt-text">{card.prompt}</p>
                    <div className="pva-copy-row">
                      {isActiveMember ? (
                        <div className="pva-member-actions">
                          <Link href={buildAppV3AestheticHref(aestheticId)} className="pva-member-open-maya">
                            Open in Maya
                          </Link>
                          <div className="pva-member-copy">
                            <CopyButton
                              text={card.prompt}
                              promptTitle={card.title}
                              promptNumber={card.number}
                              trackEvent="prompt_vault_prompt_copied"
                              trackSource="prompt-vault"
                              label="Copy text"
                              ariaLabel="Copy prompt text to clipboard"
                            />
                          </div>
                        </div>
                      ) : (
                        <CopyButton
                          text={card.prompt}
                          promptTitle={card.title}
                          promptNumber={card.number}
                          trackEvent="prompt_vault_prompt_copied"
                          trackSource="prompt-vault"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </details>
  )
}
