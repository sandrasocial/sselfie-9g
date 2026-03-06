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
    <div className="bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl overflow-hidden hover:border-[rgba(195,190,182,0.40)] hover:bg-[rgba(175,170,162,0.18)] transition-all group">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-[#1c1b19] overflow-hidden">
        {resource.thumbnail_url ? (
          <img
            src={resource.thumbnail_url || "/placeholder.svg"}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-[#8a8780] text-sm tracking-wider uppercase font-['Inter']">No Preview</div>
          </div>
        )}
        {resource.month && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-[rgba(168,164,156,0.20)] border border-[rgba(195,190,182,0.25)] text-[#a8a49c] font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium rounded-full">
            {resource.month}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780]">
              {getResourceTypeLabel(resource.resource_type)}
            </span>
            {resource.category && (
              <>
                <span className="text-[#8a8780]">•</span>
                <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780]">{resource.category}</span>
              </>
            )}
          </div>
          <h3 className="font-['Cormorant_Garamond'] font-light text-xl text-[#f0ede8]">{resource.title}</h3>
          {resource.description && (
            <p className="text-sm text-[#8a8780] leading-relaxed line-clamp-2">{resource.description}</p>
          )}
        </div>

        <button
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 bg-[#c8c4bb] text-[#0d0c0b] py-3 rounded-full font-['Inter'] font-medium text-xs tracking-[0.15em] uppercase hover:bg-[#f0ede8] transition-all active:scale-95"
          style={{ touchAction: "manipulation" }}
        >
          <span className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#0d0c0b]">File</span>
          {isExternalLink ? "Open" : "Download"}
        </button>

        <div className="font-['Inter'] text-[10px] tracking-[0.5em] uppercase font-medium text-[#8a8780] text-center">
          {resource.download_count} downloads
        </div>
      </div>
    </div>
  )
}
