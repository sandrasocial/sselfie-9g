"use client"

import { useState } from "react"

interface GallerySelectionBarProps {
  selectedCount: number
  totalCount: number
  onCancel: () => void
  onSelectAll: () => void
  onDeselectAll: () => void
  onSave: () => void
  onDownload: () => void
  onFavorite: () => void
  onDelete: () => void
  isProcessing?: boolean
}

export function GallerySelectionBar({
  selectedCount,
  totalCount,
  onCancel,
  onSelectAll,
  onDeselectAll,
  onSave,
  onDownload,
  onFavorite,
  onDelete,
  isProcessing = false,
}: GallerySelectionBarProps) {
  const [showMoreActions, setShowMoreActions] = useState(false)

  return (
    <div className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
      <div className="max-w-screen-xl mx-auto bg-[rgba(175,170,162,0.18)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl px-4 py-3">
        <div className="flex flex-col items-stretch justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="min-h-[40px] px-2 text-xs font-light tracking-[0.16em] uppercase text-[#a8a49c] transition-colors hover:text-[#f0ede8] disabled:opacity-50"
            >
              Cancel
            </button>
            <span className="text-xs font-light tracking-[0.16em] uppercase text-[#f0ede8]">{selectedCount} selected</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            {selectedCount < totalCount && (
              <button
                onClick={onSelectAll}
                disabled={isProcessing}
                className="min-h-[40px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-[11px] font-light uppercase tracking-[0.16em] text-[#a8a49c] transition-all hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] disabled:opacity-50"
              >
                Select All
              </button>
            )}
            {selectedCount === totalCount && (
              <button
                onClick={onDeselectAll}
                disabled={isProcessing}
                className="min-h-[40px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-[11px] font-light uppercase tracking-[0.16em] text-[#a8a49c] transition-all hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] disabled:opacity-50"
              >
                Deselect
              </button>
            )}
            {selectedCount > 0 && (
              <button
                onClick={onSave}
                disabled={isProcessing}
                className="min-h-[40px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[#c8c4bb] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[#0d0c0b] transition-all hover:bg-[#f0ede8] disabled:opacity-50"
              >
                Save
              </button>
            )}
            <button
              onClick={() => setShowMoreActions((state) => !state)}
              disabled={isProcessing || selectedCount === 0}
              className="min-h-[40px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-[11px] font-light uppercase tracking-[0.16em] text-[#a8a49c] transition-all hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] disabled:opacity-50"
            >
              More
            </button>
          </div>

          {showMoreActions && selectedCount > 0 && (
            <div className="grid grid-cols-3 gap-2 border-t border-[rgba(195,190,182,0.15)] pt-2">
              <button
                onClick={onDownload}
                disabled={isProcessing}
                className="min-h-[38px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-[10px] font-light uppercase tracking-[0.16em] text-[#a8a49c] transition-all hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] disabled:opacity-50"
              >
                Download
              </button>
              <button
                onClick={onFavorite}
                disabled={isProcessing}
                className="min-h-[38px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-[10px] font-light uppercase tracking-[0.16em] text-[#a8a49c] transition-all hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] disabled:opacity-50"
              >
                Save to fav
              </button>
              <button
                onClick={onDelete}
                disabled={isProcessing}
                className="min-h-[38px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-[10px] font-light uppercase tracking-[0.16em] text-[#f0ede8] transition-all hover:bg-[rgba(175,170,162,0.18)] disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
