/**
 * Applies the approved SSELFIE Noir Glass email-safe palette to outbound HTML.
 *
 * Most active templates already render through shared shells. This final,
 * idempotent pass also catches older lifecycle and transactional templates
 * that still carry retired neutral or beige values. Copy, links, tracking,
 * and send behavior are left untouched.
 */
const COLOR_REPLACEMENTS = [
  ["#F8FAFA", "#FAFAF9"],
  ["#f8fafa", "#FAFAF9"],
  ["#fbfbfa", "#FAFAF9"],
  ["#FBFBFA", "#FAFAF9"],
  ["#f7f3ee", "#FAFAF9"],
  ["#F7F3EE", "#FAFAF9"],
  ["#f5f5f5", "#F0F0F2"],
  ["#F5F5F5", "#F0F0F2"],
  ["#f3eee7", "#FAFAF9"],
  ["#F3EEE7", "#FAFAF9"],
  ["#fbf8f4", "#FAFAF9"],
  ["#FBF8F4", "#FAFAF9"],
  ["#0c0a09", "#09090B"],
  ["#0C0A09", "#09090B"],
  ["#0D0E10", "#09090B"],
  ["#1c1917", "#09090B"],
  ["#1C1917", "#09090B"],
  ["#292524", "#18181B"],
  ["#282728", "#18181B"],
  ["#342A24", "#09090B"],
  ["#3A3632", "#18181B"],
  ["#57534e", "#5E5E66"],
  ["#57534E", "#5E5E66"],
  ["#666666", "#5E5E66"],
  ["#818283", "#5E5E66"],
  ["#8a8780", "#5E5E66"],
  ["#8A8780", "#5E5E66"],
  ["#9B9189", "#5E5E66"],
  ["#74695F", "#5E5E66"],
  ["#d6d3d1", "#E7E7EA"],
  ["#D6D3D1", "#E7E7EA"],
  ["#e7e5e4", "#E7E7EA"],
  ["#E7E5E4", "#E7E7EA"],
  ["#E9EAEB", "#E7E7EA"],
  ["#EEEEEC", "#F0F0F2"],
  ["#D8D9DA", "#F3E6CF"],
  ["#D7B67E", "#F3E6CF"],
] as const

export function applyApprovedEmailPalette(html: string): string {
  let branded = html
    .replace(/border-left:\s*3px\s+solid\s+(?:#0D0E10|#1c1917)/gi, "border-left:3px solid #F3E6CF")
    .replace(/border-radius:\s*(?:12|8)px/gi, "border-radius:12px")

  for (const [from, to] of COLOR_REPLACEMENTS) {
    branded = branded.replaceAll(from, to)
  }

  return branded
}
