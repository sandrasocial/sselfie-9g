import Image from "next/image"

import type { VaultLockedShotPreview } from "@/lib/ai-prompts/prompt-data"

export function ShootPreviewStrip({
  collectionName,
  firstImage,
  firstImageAlt,
  lockedShots,
  shotCount,
}: {
  collectionName: string
  firstImage?: string
  firstImageAlt: string
  lockedShots: VaultLockedShotPreview[]
  shotCount: number
}) {
  const visibleLockedShots = lockedShots
    .filter(shot => Boolean(shot.exampleImage))
    .slice(0, 3)

  if (!firstImage || visibleLockedShots.length === 0 || shotCount <= 1) return null

  return (
    <div className="shoot-preview" aria-label={`Preview of the ${collectionName} complete shoot`}>
      <div className="shoot-preview-meta">
        <span>{collectionName}</span>
        <span>1 OF {shotCount} UNLOCKED</span>
      </div>
      <div className="shoot-preview-frames">
        <div className="shoot-preview-frame shoot-preview-frame-open">
          <Image
            src={firstImage}
            alt={firstImageAlt}
            fill
            sizes="(max-width: 640px) 24vw, 120px"
          />
          <span>YOUR PROMPT</span>
        </div>
        {visibleLockedShots.map((shot, index) => (
          <div className="shoot-preview-frame shoot-preview-frame-locked" key={`${shot.title}-${index}`}>
            <Image
              src={shot.exampleImage!}
              alt={`Another photo from ${collectionName}`}
              fill
              sizes="(max-width: 640px) 24vw, 120px"
            />
            <span>IN THE VAULT</span>
          </div>
        ))}
      </div>
    </div>
  )
}
