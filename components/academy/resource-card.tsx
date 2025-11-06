"use client"

import { Download } from "lucide-react"

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

  return (
    <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden hover:border-stone-300 transition-all group">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] bg-stone-100 overflow-hidden">
        {resource.thumbnail_url ? (
          <img
            src={resource.thumbnail_url || "/placeholder.svg"}
            alt={resource.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-stone-400 text-sm tracking-wider uppercase">No Preview</div>
          </div>
        )}
        {resource.month && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-stone-950 text-stone-50 text-[10px] tracking-wider uppercase rounded-full">
            {resource.month}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-wider uppercase text-stone-500">
              {getResourceTypeLabel(resource.resource_type)}
            </span>
            {resource.category && (
              <>
                <span className="text-stone-300">•</span>
                <span className="text-[10px] tracking-wider uppercase text-stone-500">{resource.category}</span>
              </>
            )}
          </div>
          <h3 className="font-serif text-xl tracking-wider text-stone-950">{resource.title}</h3>
          {resource.description && (
            <p className="text-sm text-stone-600 leading-relaxed line-clamp-2">{resource.description}</p>
          )}
        </div>

        <button
          onClick={() => onDownload(resource.id, resource.resource_url)}
          className="w-full flex items-center justify-center gap-2 bg-stone-950 text-stone-50 py-3 rounded-xl text-sm tracking-wider uppercase hover:bg-stone-800 transition-all"
        >
          <Download className="w-4 h-4" />
          Download
        </button>

        <div className="text-[10px] tracking-wider uppercase text-stone-400 text-center">
          {resource.download_count} downloads
        </div>
      </div>
    </div>
  )
}
