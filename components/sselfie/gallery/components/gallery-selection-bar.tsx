"use client"

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
  return (
    <div className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4">
      <div className="max-w-screen-xl mx-auto bg-[rgba(175,170,162,0.15)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl px-4 py-3">
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center justify-between gap-3 sm:justify-start">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="min-h-[44px] px-2 text-sm font-light tracking-[0.16em] uppercase text-[#a8a49c] transition-colors hover:text-[#f0ede8] disabled:opacity-50"
            >
              Cancel
            </button>
            <span className="text-sm font-light tracking-[0.16em] uppercase text-[#f0ede8]">{selectedCount} selected</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
            {selectedCount < totalCount && (
              <button
                onClick={onSelectAll}
                disabled={isProcessing}
                className="min-h-[44px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-xs font-light uppercase tracking-[0.2em] text-[#a8a49c] transition-all hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] disabled:opacity-50"
              >
                Select All
              </button>
            )}
            {selectedCount > 0 && (
              <>
                {selectedCount === totalCount && (
                  <button
                    onClick={onDeselectAll}
                    disabled={isProcessing}
                    className="min-h-[44px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-xs font-light uppercase tracking-[0.2em] text-[#a8a49c] transition-all hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] disabled:opacity-50"
                  >
                    Deselect
                  </button>
                )}
                <button
                  onClick={onSave}
                  disabled={isProcessing}
                  className="min-h-[44px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-xs font-light uppercase tracking-[0.2em] text-[#a8a49c] transition-all hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={onDownload}
                  disabled={isProcessing}
                  className="min-h-[44px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-xs font-light uppercase tracking-[0.2em] text-[#a8a49c] transition-all hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] disabled:opacity-50"
                >
                  Download
                </button>
                <button
                  onClick={onFavorite}
                  disabled={isProcessing}
                  className="min-h-[44px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-xs font-light uppercase tracking-[0.2em] text-[#a8a49c] transition-all hover:bg-[rgba(175,170,162,0.18)] hover:text-[#f0ede8] disabled:opacity-50"
                >
                  Favourite
                </button>
                <button
                  onClick={onDelete}
                  disabled={isProcessing}
                  className="col-span-2 min-h-[44px] rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-3 py-2 text-xs font-light uppercase tracking-[0.2em] text-[#f0ede8] transition-all hover:bg-[rgba(175,170,162,0.18)] disabled:opacity-50 sm:col-span-1"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
