import "server-only"

import sharp from "sharp"

type CampaignSlideFormat = "carousel" | "story"

const DIMENSIONS: Record<CampaignSlideFormat, { width: number; height: number }> = {
  carousel: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
}

function wrapWords(value: string, maxCharacters: number, maxLines: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  for (const word of words) {
    const current = lines[lines.length - 1] || ""
    if (!current || `${current} ${word}`.length > maxCharacters) {
      if (lines.length >= maxLines) break
      lines.push(word)
    } else {
      lines[lines.length - 1] = `${current} ${word}`
    }
  }
  if (words.join(" ").length > lines.join(" ").length && lines.length > 0) {
    lines[lines.length - 1] = `${lines[lines.length - 1].replace(/[.,;:!?]+$/, "")}...`
  }
  return lines.map(escapeXml)
}

function textTspans(lines: string[], x: number, firstY: number, lineHeight: number): string {
  return lines
    .map(
      (line, index) =>
        `<tspan x="${x}" y="${firstY + index * lineHeight}">${line}</tspan>`
    )
    .join("")
}

export async function renderCampaignSlide(input: {
  background: Buffer
  format: CampaignSlideFormat
  eyebrow: string
  headline: string
  body: string
  sequenceLabel: string
}): Promise<Buffer> {
  const { width, height } = DIMENSIONS[input.format]
  const isStory = input.format === "story"
  const padding = isStory ? 86 : 72
  const headlineSize = isStory ? 82 : 70
  const headlineLineHeight = Math.round(headlineSize * 1.08)
  const headlineLines = wrapWords(input.headline, isStory ? 24 : 27, isStory ? 4 : 3)
  const headlineY = isStory ? Math.round(height * 0.58) : Math.round(height * 0.57)
  const bodySize = isStory ? 35 : 30
  const bodyLineHeight = Math.round(bodySize * 1.35)
  const bodyY = headlineY + headlineLines.length * headlineLineHeight + 50
  const bodyLines = wrapWords(input.body, isStory ? 42 : 48, isStory ? 4 : 3)

  const overlay = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#0A0A0A" stop-opacity="0.12"/>
          <stop offset="38%" stop-color="#0A0A0A" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="#0A0A0A" stop-opacity="0.92"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#shade)"/>
      <text x="${padding}" y="${isStory ? 105 : 82}" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="22" letter-spacing="5">${escapeXml(input.eyebrow.toUpperCase())}</text>
      <text x="${width - padding}" y="${isStory ? 105 : 82}" text-anchor="end" fill="#FFFFFF" fill-opacity="0.72" font-family="Arial, sans-serif" font-size="18" letter-spacing="3">${escapeXml(input.sequenceLabel.toUpperCase())}</text>
      <text fill="#FFFFFF" font-family="Georgia, serif" font-size="${headlineSize}" font-weight="500">${textTspans(headlineLines, padding, headlineY, headlineLineHeight)}</text>
      <line x1="${padding}" x2="${padding + 110}" y1="${bodyY - 24}" y2="${bodyY - 24}" stroke="#FFFFFF" stroke-opacity="0.7" stroke-width="2"/>
      <text fill="#FFFFFF" fill-opacity="0.9" font-family="Arial, sans-serif" font-size="${bodySize}" font-weight="400">${textTspans(bodyLines, padding, bodyY + 30, bodyLineHeight)}</text>
      <text x="${padding}" y="${height - (isStory ? 72 : 52)}" fill="#FFFFFF" fill-opacity="0.7" font-family="Arial, sans-serif" font-size="18" letter-spacing="4">SSELFIE</text>
    </svg>
  `)

  return sharp(input.background)
    .rotate()
    .resize(width, height, { fit: "cover", position: "attention" })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png({ compressionLevel: 8 })
    .toBuffer()
}
