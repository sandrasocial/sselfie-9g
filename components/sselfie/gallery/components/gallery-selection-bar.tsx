"use client"

import { Save, Download, Heart, Trash2 } from "lucide-react"

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
    <div className="fixed bottom-0 left-0 right-0 bg-stone-950 text-white p-3 sm:p-4 shadow-2xl z-50 border-t border-stone-800 safe-area-inset-bottom">
      <div className="max-w-screen-xl mx-auto">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="text-sm font-light tracking-wide hover:text-stone-300 transition-colors min-h-[44px] px-2 touch-manipulation disabled:opacity-50"
            >
              Cancel
            </button>
            <span className="text-sm font-light">{selectedCount} selected</span>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
            {selectedCount < totalCount && (
              <button
                onClick={onSelectAll}
                disabled={isProcessing}
                className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-800 rounded-lg hover:bg-stone-700 transition-all min-h-[44px] touch-manipulation disabled:opacity-50"
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
                    className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-800 rounded-lg hover:bg-stone-700 transition-all min-h-[44px] touch-manipulation disabled:opacity-50"
                  >
                    Deselect
                  </button>
                )}
                <button
                  onClick={onSave}
                  disabled={isProcessing}
                  className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-900 rounded-lg hover:bg-stone-800 transition-all flex items-center justify-center gap-2 min-h-[44px] touch-manipulation disabled:opacity-50"
                >
                  <Save size={14} />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={onDownload}
                  disabled={isProcessing}
                  className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-800 rounded-lg hover:bg-stone-700 transition-all flex items-center justify-center gap-2 min-h-[44px] touch-manipulation disabled:opacity-50"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={onFavorite}
                  disabled={isProcessing}
                  className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-stone-800 rounded-lg hover:bg-stone-700 transition-all flex items-center justify-center gap-2 min-h-[44px] touch-manipulation disabled:opacity-50"
                >
                  <Heart size={14} />
                  <span className="hidden sm:inline">Favorite</span>
                </button>
                <button
                  onClick={onDelete}
                  disabled={isProcessing}
                  className="px-3 sm:px-4 py-2 text-xs tracking-[0.15em] uppercase font-light bg-red-600 rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 min-h-[44px] col-span-2 sm:col-span-1 touch-manipulation disabled:opacity-50"
                >
                  <Trash2 size={14} />
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

