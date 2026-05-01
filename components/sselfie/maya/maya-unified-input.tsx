"use client"

import { useState, useRef } from "react"
import { SlidersHorizontal } from "lucide-react"
import LoadingSpinner from "../loading-spinner"
import MayaModeToggle from "./maya-mode-toggle"
import { Typography, Colors, BorderRadius } from "@/lib/maya/pro/design-system"

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
 * - Photo generation button (opens generation settings panel)
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
  
  /** When true, shows a visible "Photo generation" control (Photos tab — opens generation settings). */
  showSettingsButton?: boolean
  onSettingsClick?: () => void

  // Pro Mode features
  showLibraryButton?: boolean
  onManageLibrary?: () => void
  
  // Navigation buttons (replaces Open Library, consistent in both modes)
  onNewProject?: () => void
  onHistory?: () => void

  /** Photos tab — My Model / Selfie toggle (same as former header control). */
  showModeToggle?: boolean
  onModeSwitch?: (enablePro: boolean) => void | Promise<void>
  onSwitchToClassic?: () => void | Promise<void>
  
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
  showLibraryButton = false,
  onManageLibrary,
  onNewProject,
  onHistory,
  showModeToggle = false,
  onModeSwitch,
  onSwitchToClassic,
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
    "w-full overflow-hidden rounded-[12px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-glass-bg)] backdrop-blur-[20px] shadow-[var(--app-shadow-soft)] p-2.5 sm:p-4"
  const inputContainerStyle = {
    borderTop: "1px solid var(--app-glass-border)",
  }
  const inputWrapperClass = "w-full"

  const textareaClass =
    "w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-transparent border border-transparent rounded-[8px] text-[color:var(--app-text-primary)] placeholder:text-[color:var(--app-text-muted)] focus:outline-none focus:ring-1 focus:ring-[color:var(--app-focus-ring)] focus:border-[color:var(--app-focus-ring)] focus:bg-[color:var(--app-input-bg)] font-light text-[15px] sm:text-[16px] min-h-[44px] sm:min-h-[48px] max-h-[120px] transition-all duration-300 resize-none overflow-y-auto leading-relaxed touch-manipulation"

  const textareaStyle = {
    fontFamily: Typography.body.fontFamily,
    fontSize: "clamp(15px, 3.8vw, 16px)",
    fontWeight: Typography.body.weights.regular,
    lineHeight: "1.45",
    letterSpacing: Typography.body.letterSpacing,
  }

  const secondaryToolbarButtonClass =
    "touch-manipulation active:scale-95 flex items-center justify-center gap-1.5 h-9 px-3 rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] hover:bg-[color:var(--app-btn-secondary-hover)] text-[color:var(--app-text-secondary)] hover:text-[color:var(--app-text-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"

  const imageButtonStyle = {
    borderRadius: BorderRadius.button,
  }

  const sendButtonClass =
    "touch-manipulation active:scale-95 shrink-0 flex items-center justify-center min-w-[56px] sm:min-w-[96px] h-10 sm:h-11 rounded-[6px] border border-[color:var(--app-btn-primary-bg)] bg-[color:var(--app-btn-primary-bg)] hover:opacity-90 text-[color:var(--app-btn-primary-text)] transition-all disabled:opacity-50 disabled:cursor-not-allowed px-2.5 sm:px-4"

  const sendButtonStyle = {
    borderRadius: BorderRadius.button,
    backgroundColor:
      (!inputValue.trim() && !uploadedImage) || isLoading || disabled
        ? "var(--app-btn-secondary-bg)"
        : "var(--app-btn-primary-bg)",
    color:
      (!inputValue.trim() && !uploadedImage) || isLoading || disabled
        ? "var(--app-text-secondary)"
        : "var(--app-btn-primary-text)",
  }

  return (
    <div
    className={inputContainerClass}
    style={{ ...inputContainerStyle, position: 'relative' }}
  >
      <form onSubmit={handleSubmit} className={inputWrapperClass}>
        {/* Uploaded image preview */}
        {uploadedImage && (
          <div className={`mb-3 flex items-center gap-2 ${proMode ? '' : 'mx-3'}`}>
            <div className="relative">
              <img
                src={uploadedImage}
                alt="Uploaded"
                className={`${proMode ? 'w-16 h-16' : 'w-20 h-20 sm:w-16 sm:h-16'} object-cover rounded-lg overflow-hidden border border-[rgba(195,190,182,0.25)] shadow-lg`}
                style={proMode ? {
                  borderRadius: BorderRadius.image,
                  border: `1px solid ${Colors.border}`,
                } : {}}
              />
              {onRemoveImage && (
                <button
                  type="button"
                  onClick={onRemoveImage}
                  className={`absolute -top-1 -right-1 w-6 h-6 bg-[#0d0c0b] text-[#f0ede8] rounded-full flex items-center justify-center hover:scale-110 transition-transform ${
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
              <p className="text-xs text-[#8a8780] mt-1 tracking-wide">Inspiration Image</p>
            )}
          </div>
        )}

        <div className={`flex min-w-0 ${proMode ? "items-end gap-2 sm:gap-3" : "items-end gap-2"}`}>
          {/* Text input — full width on the main row for a calmer bar */}
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
                position: "relative",
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
              <span className="sm:hidden">Go</span>
              <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] font-medium">Send</span>
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
                <>
                  <span className="sm:hidden">Go</span>
                  <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] font-medium">Send</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Image, Adjust, mode toggle, New chat — single toolbar row under the composer */}
        <div
          className="mt-2 flex w-full min-w-0 items-center gap-2 overflow-x-auto scrollbar-hide border-t border-[rgba(195,190,182,0.12)] pt-2"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <button
            type="button"
            onClick={handleImageClick}
            disabled={isLoading || disabled || isUploadingImage}
            className={secondaryToolbarButtonClass}
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
                <div className="w-4 h-4 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
              )
            ) : (
              <span className="relative text-[10px] uppercase tracking-[0.14em] font-medium">
                Image
                {proMode && (
                  imageCount > 0 ? (
                    <span className="absolute -right-4 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0d0c0b] px-1 text-[9px] leading-none text-[#f0ede8]">
                      {imageCount}
                    </span>
                  ) : (
                    <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-orange-500" />
                  )
                )}
              </span>
            )}
          </button>

          {showSettingsButton && onSettingsClick && (
            <button
              type="button"
              onClick={() => onSettingsClick()}
              disabled={isLoading || disabled}
              className={secondaryToolbarButtonClass}
              style={imageButtonStyle}
              aria-label="Photo generation: style strength, guidance, aspect ratio, realism"
              title="Style strength, guidance (Flux), aspect ratio, realism boost"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0 opacity-90" aria-hidden />
              <span className="text-[10px] uppercase tracking-[0.12em] font-medium">Adjust</span>
            </button>
          )}

          {/* Push toggle + New to the right without a second banner row */}
          <div className="min-w-[4px] flex-1 shrink basis-0" aria-hidden />

          <div className="flex shrink-0 items-center gap-2 [&_.inline-flex]:max-w-none">
            {showModeToggle &&
              (proMode && onSwitchToClassic ? (
                <MayaModeToggle
                  currentMode="pro"
                  onToggle={() => {
                    void onSwitchToClassic()
                  }}
                  variant="compact"
                  showModeHint={false}
                  className="shrink-0"
                />
              ) : !proMode && onModeSwitch ? (
                <MayaModeToggle
                  currentMode="classic"
                  onToggle={() => {
                    void onModeSwitch(true)
                  }}
                  variant="compact"
                  showModeHint={false}
                  className="shrink-0"
                />
              ) : null)}
            {onNewProject && (
              <button
                type="button"
                onClick={onNewProject}
                className="touch-manipulation active:scale-95 shrink-0 rounded-md border border-[rgba(195,190,182,0.28)] bg-[rgba(175,170,162,0.14)] px-2 py-1.5 min-h-[32px] sm:min-h-[34px] sm:px-2.5 hover:bg-[rgba(175,170,162,0.22)] transition-colors"
                style={{
                  fontFamily: "var(--font-body, Inter)",
                  fontSize: "9px",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "#f0ede8",
                }}
                aria-label="Start a new chat"
              >
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">New chat</span>
              </button>
            )}
          </div>
        </div>

        {/* History remains in header ··· / ≡ menu */}
      </form>
    </div>
  )
}
