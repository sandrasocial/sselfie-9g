import { renderStoneButton, renderStoneShell } from "./stone-email"
import type { PresetCollection } from "@/lib/presets/published-collections"

function renderCollectionLinks(collections: PresetCollection[]) {
  const rows = collections
    .map(collection => {
      const links = [
        collection.mobileDngUrl ? `<a href="${collection.mobileDngUrl}" style="color:#f0ede8;">mobile .dng</a>` : null,
        collection.desktopXmpUrl ? `<a href="${collection.desktopXmpUrl}" style="color:#f0ede8;">desktop .xmp</a>` : null,
        collection.setupGuideUrl ? `<a href="${collection.setupGuideUrl}" style="color:#f0ede8;">setup guide</a>` : null,
      ].filter(Boolean)

      if (links.length === 0) return ""

      return `<li style="margin:0 0 12px;"><strong>${collection.name}</strong><br>${links.join(" &middot; ")}</li>`
    })
    .filter(Boolean)
    .join("")

  return rows ? `<ul style="margin:18px 0 0;padding-left:20px;font-size:14px;line-height:1.7;">${rows}</ul>` : ""
}

function renderCollectionTextLinks(collections: PresetCollection[]) {
  return collections
    .map(collection => {
      const links = [
        collection.mobileDngUrl ? `Mobile .dng: ${collection.mobileDngUrl}` : null,
        collection.desktopXmpUrl ? `Desktop .xmp: ${collection.desktopXmpUrl}` : null,
        collection.setupGuideUrl ? `Setup guide: ${collection.setupGuideUrl}` : null,
      ].filter(Boolean)

      return links.length > 0 ? `${collection.name}\n${links.join("\n")}` : ""
    })
    .filter(Boolean)
    .join("\n\n")
}

export function generatePresetsDeliveryEmail({
  firstName,
  accessUrl,
  tier,
  collections,
}: {
  firstName: string
  accessUrl: string
  tier: "single" | "bundle"
  collections: PresetCollection[]
}) {
  const collectionLinks = renderCollectionLinks(collections)
  const collectionTextLinks = renderCollectionTextLinks(collections)
  const title = tier === "bundle" ? "Your full preset collection is ready." : "Your preset collection is ready."
  const subtitle =
    tier === "bundle"
      ? "Every current collection is inside, and new ones will appear on your access page."
      : "Your mobile, desktop, and setup links are inside."

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your SSELFIE Presets are ready.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Open your access page first. It keeps your mobile files, desktop files, and setup guide in one place.</p>
    <div style="margin:20px 0;">${renderStoneButton("Open Your Presets", accessUrl, "outline")}</div>
    ${collectionLinks}
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#a8a49c;">Save this email. Your access page is here: <a href="${accessUrl}" style="color:#a8a49c;">${accessUrl}</a></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">Questions? Reply here or reach us at <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a></p>
  `

  return {
    subject: "your SSELFIE presets are here",
    html: renderStoneShell({
      eyebrow: "SSELFIE Presets",
      title,
      subtitle,
      bodyHtml,
      footerLead: "Same you. Better photo.",
      footerSignoff: "Sandra x",
    }),
    text: [
      `Hi ${firstName},`,
      "",
      "Your SSELFIE Presets are ready.",
      "",
      "Open your access page first. It keeps your mobile files, desktop files, and setup guide in one place.",
      "",
      `Open your presets: ${accessUrl}`,
      collectionTextLinks ? `\n${collectionTextLinks}` : "",
      "",
      "Need help? Reply here or email support@sselfie.ai",
      "",
      "Sandra x",
    ].join("\n"),
  }
}
