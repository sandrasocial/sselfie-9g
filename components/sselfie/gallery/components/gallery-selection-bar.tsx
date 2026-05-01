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
      <div className="max-w-screen-xl mx-auto rounded-[16px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.82)] px-4 py-3 shadow-[0_18px_50px_rgba(61,56,48,0.12)] backdrop-blur-[20px]">
        <div className="flex flex-col items-stretch justify-between gap-3">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="min-h-[40px] px-2 text-xs font-medium tracking-[0.16em] uppercase text-[color:var(--app-text-secondary)] transition-colors hover:text-[color:var(--app-text-primary)] disabled:opacity-50"
            >
              Cancel
            </button>
            <span className="text-xs font-medium tracking-[0.16em] uppercase text-[color:var(--app-text-primary)]">{selectedCount} selected</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-2">
            {selectedCount < totalCount && (
              <button
                onClick={onSelectAll}
                disabled={isProcessing}
                className="min-h-[40px] rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)] transition-all hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)] disabled:opacity-50"
              >
                Select All
              </button>
            )}
            {selectedCount === totalCount && (
              <button
                onClick={onDeselectAll}
                disabled={isProcessing}
                className="min-h-[40px] rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)] transition-all hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)] disabled:opacity-50"
              >
                Deselect
              </button>
            )}
            {selectedCount > 0 && (
              <button
                onClick={onSave}
                disabled={isProcessing}
                className="min-h-[40px] rounded-[6px] border border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-btn-primary-text)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                Save
              </button>
            )}
            <button
              onClick={() => setShowMoreActions((state) => !state)}
              disabled={isProcessing || selectedCount === 0}
              className="min-h-[40px] rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)] transition-all hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)] disabled:opacity-50"
            >
              More
            </button>
          </div>

          {showMoreActions && selectedCount > 0 && (
            <div className="grid grid-cols-3 gap-2 border-t border-[color:var(--app-glass-border)] pt-2">
              <button
                onClick={onDownload}
                disabled={isProcessing}
                className="min-h-[38px] rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)] transition-all hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)] disabled:opacity-50"
              >
                Download
              </button>
              <button
                onClick={onFavorite}
                disabled={isProcessing}
                className="min-h-[38px] rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-secondary)] transition-all hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)] disabled:opacity-50"
              >
                Save to fav
              </button>
              <button
                onClick={onDelete}
                disabled={isProcessing}
                className="min-h-[38px] rounded-[6px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-medium uppercase tracking-[0.16em] text-red-700 transition-all hover:bg-red-500/15 disabled:opacity-50"
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
