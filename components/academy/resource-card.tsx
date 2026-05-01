"use client"

import { sanitizeExternalUrl } from "@/lib/security/url-validator"

interface ResourceCardProps {
  resource: {
    id: string
    title: string
    description: string | null
    thumbnail_url: string | null
    resource_type: string
    resource_url: string
    category: string | null
    download_count: number
    month?: string
  }
  onDownload: (id: string, url: string) => void
}

export default function ResourceCard({ resource, onDownload }: ResourceCardProps) {
  const getResourceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      canva: "Canva Template",
      pdf: "PDF Download",
      drive: "Google Drive",
      link: "External Link",
      other: "Resource",
    }
    return labels[type] || "Resource"
  }

  console.log("[v0] ResourceCard rendering with resource:", {
    id: resource.id,
    title: resource.title,
    thumbnail_url: resource.thumbnail_url,
    has_thumbnail: !!resource.thumbnail_url,
  })

  const isExternalLink =
    resource.resource_type === "canva" ||
    resource.resource_type === "drive" ||
    resource.resource_type === "link" ||
    resource.resource_url.includes("canva.com") ||
    resource.resource_url.includes("drive.google.com") ||
    resource.resource_url.includes("docs.google.com")

  const handleClick = () => {
    console.log("[v0] ResourceCard button clicked:", {
      id: resource.id,
      title: resource.title,
      url: resource.resource_url,
      isExternalLink,
    })

    if (isExternalLink) {
      const safeUrl = sanitizeExternalUrl(resource.resource_url)

      if (safeUrl) {
        window.open(safeUrl, "_blank", "noopener,noreferrer")
        onDownload(resource.id, resource.resource_url)
      } else {
        console.error("[Security] Blocked invalid resource URL:", resource.resource_url)
        alert("This resource link is invalid or unsafe. Please contact support.")
      }
    } else {
      onDownload(resource.id, resource.resource_url)
    }
  }

  return (
    <div className="stone-panel group overflow-hidden rounded-[16px] transition-all hover:border-[color:var(--app-border)] hover:bg-[color:var(--app-glass-bg)]">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[color:var(--app-btn-secondary-bg)]">
        {resource.thumbnail_url ? (
          <img
            src={resource.thumbnail_url || "/placeholder.svg"}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-[color:var(--app-text-muted)] text-sm tracking-wider uppercase font-['Inter']">No Preview</div>
          </div>
        )}
        {resource.month && (
          <div className="stone-chip absolute left-3 top-3 rounded-[4px] px-3 py-1 font-['Inter'] text-[10px] font-medium uppercase tracking-[0.5em] text-[color:var(--app-text-secondary)]">
            {resource.month}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[color:var(--app-text-secondary)]">
              {getResourceTypeLabel(resource.resource_type)}
            </span>
            {resource.category && (
              <>
                <span className="text-[color:var(--app-text-secondary)]">•</span>
                <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[color:var(--app-text-secondary)]">{resource.category}</span>
              </>
            )}
          </div>
          <h3 className="font-['Cormorant_Garamond'] font-light text-xl text-[color:var(--app-text-primary)]">{resource.title}</h3>
          {resource.description && (
            <p className="text-sm text-[color:var(--app-text-secondary)] leading-relaxed line-clamp-2">{resource.description}</p>
          )}
        </div>

        <button
          onClick={handleClick}
          className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[color:var(--app-btn-primary-bg)] py-3 font-['Inter'] text-xs font-medium uppercase tracking-[0.15em] text-[color:var(--app-btn-primary-text)] transition-all active:scale-95 hover:opacity-90"
          style={{ touchAction: "manipulation" }}
        >
          <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[color:var(--app-btn-primary-text)]">File</span>
          {isExternalLink ? "Open" : "Download"}
        </button>

        <div className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[color:var(--app-text-secondary)] text-center">
          {resource.download_count} downloads
        </div>
      </div>
    </div>
  )
}
