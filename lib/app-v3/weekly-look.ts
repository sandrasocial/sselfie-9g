// SSELFIE Studio 3.0 - weekly look matching.
// The Monday habit email rotates through WEEKLY_DROP_LOOKS (lib/email/templates/
// suite-habit-emails.ts). This maps that same look onto the Create view's aesthetic
// tiles so the app and the email always point at the same "this week's look".
// Pure matching only; the aesthetics API route does the server-side lookup.

import type { Aesthetic } from "@/components/app-v3/types"
import type { WeeklyDropLook } from "@/lib/email/templates/suite-habit-emails"

/** Accent-insensitive slug so "Dark Feminine Café" matches "dark-feminine-cafe-coffee-run". */
export function toLookSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Find the aesthetic tile for a weekly drop look. Email look names are shorter than the
 * vault collection names ("Denim Street" lives inside "Soft Blazer + Light Denim Street"),
 * so match on hyphen-bounded slug containment in either direction.
 */
export function matchWeeklyLookAesthetic(
  look: WeeklyDropLook,
  aesthetics: Aesthetic[],
): Aesthetic | null {
  const lookSlug = toLookSlug(look.name)
  if (!lookSlug) return null
  for (const aesthetic of aesthetics) {
    const aestheticSlug = toLookSlug(aesthetic.name)
    if (!aestheticSlug) continue
    if (
      `-${aestheticSlug}-`.includes(`-${lookSlug}-`) ||
      `-${lookSlug}-`.includes(`-${aestheticSlug}-`)
    ) {
      return aesthetic
    }
  }
  return null
}
