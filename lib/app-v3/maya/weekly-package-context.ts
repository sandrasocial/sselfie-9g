type WeeklyPackageCalendarCopyInput = {
  weeklyPackage: boolean
  conceptTitle: unknown
  captionContext: unknown
  slotContentPillar: string | null
  slotCaption: string | null
}

function clean(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : ""
}

/** A weekly package owns the post idea end to end. An empty Calendar slot may already contain
 * planning copy for a different post, so that copy must not leak into Maya's chosen result. */
export function resolveWeeklyPackageCalendarCopy({
  weeklyPackage,
  conceptTitle,
  captionContext,
  slotContentPillar,
  slotCaption,
}: WeeklyPackageCalendarCopyInput): {
  contentPillar: string | null
  caption: string | null
} {
  if (!weeklyPackage) {
    return { contentPillar: slotContentPillar, caption: slotCaption }
  }

  const title = clean(conceptTitle, 160)
  const context = clean(captionContext, 840)
  const contentPillar = [title, context && context !== title ? context : ""]
    .filter(Boolean)
    .join(". ")

  return {
    contentPillar: contentPillar || slotContentPillar,
    caption: null,
  }
}
