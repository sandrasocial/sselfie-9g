"use client"

import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import LoadingSpinner from '../loading-spinner'
import { Typography, Colors, BorderRadius } from '@/lib/maya/pro/design-system'

/**
 * Maya Unified Input Component
 * 
 * Unified chat input component that works for both Classic and Pro modes.
 * Uses progressive enhancement: Pro features appear when enabled, but base UI structure is the same.
 * 
 * **Progressive Enhancement Pattern:**
 * - Base input structure (textarea, send button, image upload) is identical
 * - Pro features conditionally appear when proMode is enabled
 * - No layout shifts when switching modes
 * - Consistent user experience
 * 
 * **Classic Mode Features:**
 * - Text input with image upload
 * - Settings button (opens settings panel)
 * - Send button
 * 
 * **Pro Mode Features (when enabled):**
 * - All Classic features, plus:
 * - "Manage Library" button (opens image library)
 * - Enhanced styling with Pro design system
 * - Library-based image selection
 * 
 * Design principles:
 * - Same structure for both modes
 * - Conditional features (settings icon, library management)
 * - Consistent styling with design system
 */

interface MayaUnifiedInputProps {
  // Core functionality
  onSend?: (message: string, imageUrl?: string) => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
  
  // Image upload
  onImageUpload?: () => void
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  fileInputRef?: React.RefObject<HTMLInputElement>
  uploadedImage?: string | null
  isUploadingImage?: boolean
  onRemoveImage?: () => void
  
  // Classic Mode features
  showSettingsButton?: boolean
  onSettingsClick?: () => void
  showChatMenu?: boolean // Pass menu state from parent
  
  // Pro Mode features
  showLibraryButton?: boolean
  onManageLibrary?: () => void
  
  // Navigation buttons (replaces Open Library, consistent in both modes)
  onNewProject?: () => void
  onHistory?: () => void
  
  // Styling
  proMode?: boolean
  imageCount?: number
}

export default function MayaUnifiedInput({
  onSend,
  onImageUpload,
  onFileChange,
  fileInputRef: externalFileInputRef,
  uploadedImage,
  isUploadingImage = false,
  onRemoveImage,
  isLoading = false,
  disabled = false,
  placeholder = "Message Maya...",
  showSettingsButton = false,
  onSettingsClick,
  showChatMenu = false,
  showLibraryButton = false,
  onManageLibrary,
  onNewProject,
  onHistory,
  proMode = false,
  imageCount = 0,
}: MayaUnifiedInputProps) {
  const [inputValue, setInputValue] = useState('')
  const internalFileInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = externalFileInputRef || internalFileInputRef
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!inputValue.trim() && !uploadedImage) return
    if (isLoading || disabled) return

    if (onSend) {
      const message = inputValue.trim()
      const imageUrl = uploadedImage || undefined
      onSend(message, imageUrl)
      setInputValue('')
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "48px"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
      // Reset height after sending
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = '48px'
        }
      }, 0)
    }
  }

  const handleImageClick = () => {
    if (onImageUpload) {
      // Pro Mode: Trigger upload flow modal
      onImageUpload()
    } else {
      // Classic Mode: Trigger file input
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onFileChange) {
      // Classic Mode: Parent handles the upload
      onFileChange(e)
    } else if (onImageUpload) {
      // Pro Mode: Trigger upload flow (file input should be disabled/hidden in Pro Mode)
      onImageUpload()
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const inputContainerClass =
    "w-full overflow-hidden rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(12,12,12,0.55)] backdrop-blur-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.28)] p-3 sm:p-4"
  const inputContainerStyle = {
    borderTop: "1px solid rgba(255,255,255,0.12)",
  }
  const inputWrapperClass = "w-full"

  const textareaClass =
    "w-full px-4 py-3 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-lg text-[#ffffff] placeholder-[rgba(255,255,255,0.5)] focus:outline-none focus:ring-1 focus:ring-[rgba(255,255,255,0.12)] focus:border-[rgba(255,255,255,0.12)] focus:bg-[rgba(255,255,255,0.08)] font-light text-[16px] min-h-[48px] max-h-[120px] transition-all duration-300 resize-none overflow-y-auto leading-relaxed touch-manipulation"

  const textareaStyle = {
    fontFamily: Typography.body.fontFamily,
    fontSize: "16px",
    fontWeight: Typography.body.weights.regular,
    lineHeight: Typography.body.lineHeight,
    letterSpacing: Typography.body.letterSpacing,
  }

  const imageButtonClass =
    "touch-manipulation active:scale-95 shrink-0 flex items-center justify-center min-w-[72px] sm:min-w-[92px] h-11 rounded-lg border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-[#ffffff] transition-all disabled:opacity-50 disabled:cursor-not-allowed px-2.5 sm:px-3"

  const imageButtonStyle = {
    borderRadius: BorderRadius.button,
  }

  const sendButtonClass =
    "touch-manipulation active:scale-95 shrink-0 flex items-center justify-center min-w-[72px] sm:min-w-[96px] h-11 rounded-md border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-[#ffffff] transition-all disabled:opacity-50 disabled:cursor-not-allowed px-3 sm:px-4"

  const sendButtonStyle = {
    borderRadius: BorderRadius.button,
    backgroundColor:
      (!inputValue.trim() && !uploadedImage) || isLoading || disabled
        ? "rgba(255,255,255,0.06)"
        : "rgba(255,255,255,0.14)",
    color: Colors.textSecondary,
  }

  return (
    <div
    className={inputContainerClass}
    style={{ ...inputContainerStyle, position: 'relative' }}
  >
      {/* Chat Menu Dropdown - Rendered via portal to avoid positioning issues (Classic Mode only) */}
      {showSettingsButton && showChatMenu && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed bg-[rgba(14,14,14,0.94)] backdrop-blur-3xl border border-[rgba(255,255,255,0.14)] rounded-2xl overflow-hidden shadow-xl shadow-stone-950/30 animate-in slide-in-from-bottom-2 duration-300 z-[70]"
          style={{
            bottom: "calc(var(--sselfie-bottom-nav-height, 96px) + var(--input-bar-height, 168px) - 8px)",
            left: '12px',
            right: '12px',
            maxWidth: 'calc(100vw - 24px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              if (onSettingsClick) {
                onSettingsClick() // This will close the menu and open settings (handled by parent)
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm text-white/85 hover:bg-[rgba(255,255,255,0.08)] transition-colors touch-manipulation"
          >
            <span className="font-medium uppercase tracking-[0.2em] text-[11px]">Generation Settings</span>
          </button>
        </div>,
        document.body
      )}
      
      {/* Click outside to close menu */}
      {showSettingsButton && showChatMenu && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[60]"
          onClick={() => {
            if (onSettingsClick) {
              onSettingsClick() // Close menu when clicking outside
            }
          }}
        />,
        document.body
      )}
      
      <form onSubmit={handleSubmit} className={inputWrapperClass}>
        {/* Uploaded image preview */}
        {uploadedImage && (
          <div className={`mb-3 flex items-center gap-2 ${proMode ? '' : 'mx-3'}`}>
            <div className="relative">
              <img
                src={uploadedImage}
                alt="Uploaded"
                className={`${proMode ? 'w-16 h-16' : 'w-20 h-20 sm:w-16 sm:h-16'} object-cover rounded-lg overflow-hidden border border-white/60 shadow-lg`}
                style={proMode ? {
                  borderRadius: BorderRadius.image,
                  border: `1px solid ${Colors.border}`,
                } : {}}
              />
              {onRemoveImage && (
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className={`absolute -top-1 -right-1 w-6 h-6 bg-stone-950 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform ${
                    proMode ? '' : 'text-xs'
                  }`}
                  style={proMode ? {
                    fontSize: '10px',
                  } : {}}
                >
                  <span className={proMode ? 'text-xs' : ''}>×</span>
                </button>
              )}
            </div>
            {proMode ? (
              <span
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.xs,
                  color: Colors.textTertiary,
                }}
              >
                Image attached
              </span>
            ) : (
              <p className="text-xs text-stone-600 mt-1 tracking-wide">Inspiration Image</p>
            )}
          </div>
        )}

        <div className={`flex min-w-0 ${proMode ? 'items-end gap-2 sm:gap-3' : 'items-end gap-2'}`}>
          {/* Image upload button */}
          <button
            type="button"
            onClick={handleImageClick}
            disabled={isLoading || disabled || isUploadingImage}
            className={imageButtonClass}
            style={imageButtonStyle}
            title="Upload image"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading || disabled || isUploadingImage}
            />
            {isUploadingImage ? (
              proMode ? (
                <LoadingSpinner size="sm" />
              ) : (
                <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
              )
            ) : (
              <span className="text-[10px] uppercase tracking-[0.12em] sm:tracking-[0.16em] font-medium">Add Image</span>
            )}
          </button>

          {/* Text input */}
          <div className="flex-1 min-w-0">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              onClick={(e) => {
                e.currentTarget.focus()
              }}
              onTouchEnd={(e) => {
                e.currentTarget.focus()
              }}
              placeholder={uploadedImage ? "Describe the style..." : placeholder}
              disabled={isLoading || disabled || isUploadingImage}
              className={textareaClass}
              style={{
                ...textareaStyle,
                position: 'relative',
                zIndex: 1,
              }}
              aria-label="Message input"
              rows={1}
              inputMode="text"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck="true"
              autoComplete="off"
              enterKeyHint="send"
            />
          </div>

          {/* Send button - Classic Mode */}
          {!proMode && (
            <button
              onClick={handleSubmit}
              className={sendButtonClass}
              disabled={isLoading || (!inputValue.trim() && !uploadedImage) || isUploadingImage || disabled}
              aria-label="Send message"
              type="button"
            >
              <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Send</span>
            </button>
          )}

          {/* Send button - Pro Mode only (in flex layout) */}
          {proMode && (
            <button
              type="submit"
              disabled={(!inputValue.trim() && !uploadedImage) || isLoading || disabled}
              className={sendButtonClass}
              style={sendButtonStyle}
              title="Send message"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <span className="text-[10px] uppercase tracking-[0.2em] font-medium">Send</span>
              )}
            </button>
          )}
        </div>

        {/* New Project / History moved to header ··· menu */}
      </form>
    </div>
  )
}
