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
    <div className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-white/15 bg-black/80 p-3 text-white backdrop-blur-2xl sm:p-4">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center justify-between gap-3 sm:justify-start">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="min-h-[44px] px-2 text-sm font-light tracking-[0.16em] uppercase text-white/75 transition-colors hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
            <span className="text-sm font-light tracking-[0.16em] uppercase text-white/85">{selectedCount} selected</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap">
            {selectedCount < totalCount && (
              <button
                onClick={onSelectAll}
                disabled={isProcessing}
                className="min-h-[44px] rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs font-light uppercase tracking-[0.2em] transition-all hover:bg-white/10 disabled:opacity-50"
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
                    className="min-h-[44px] rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs font-light uppercase tracking-[0.2em] transition-all hover:bg-white/10 disabled:opacity-50"
                  >
                    Deselect
                  </button>
                )}
                <button
                  onClick={onSave}
                  disabled={isProcessing}
                  className="min-h-[44px] rounded-full border border-white/30 bg-white/10 px-3 py-2 text-xs font-light uppercase tracking-[0.2em] transition-all hover:bg-white/15 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={onDownload}
                  disabled={isProcessing}
                  className="min-h-[44px] rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs font-light uppercase tracking-[0.2em] transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  Download
                </button>
                <button
                  onClick={onFavorite}
                  disabled={isProcessing}
                  className="min-h-[44px] rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs font-light uppercase tracking-[0.2em] transition-all hover:bg-white/10 disabled:opacity-50"
                >
                  Favourite
                </button>
                <button
                  onClick={onDelete}
                  disabled={isProcessing}
                  className="col-span-2 min-h-[44px] rounded-full border border-white/30 bg-white/15 px-3 py-2 text-xs font-light uppercase tracking-[0.2em] text-white transition-all hover:bg-white/20 disabled:opacity-50 sm:col-span-1"
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
