"use client"

import { useState, useRef } from 'react'
import { ImageIcon, Send, Sliders } from 'lucide-react'
import LoadingSpinner from '../loading-spinner'
import { Typography, Colors, BorderRadius, ButtonLabels } from '@/lib/maya/pro/design-system'

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
  
  // Pro Mode features
  showLibraryButton?: boolean
  onManageLibrary?: () => void
  
  // Navigation buttons (replaces Open Library, consistent in both modes)
  onNewProject?: () => void
  onHistory?: () => void
  
  // Styling
  proMode?: boolean
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
  proMode = false,
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
        textareaRef.current.style.height = proMode ? '44px' : '48px'
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
    e.target.style.height = `${Math.min(e.target.scrollHeight, proMode ? 200 : 80)}px`
  }

  // Use Pro Mode design system styling when in Pro Mode, Classic styling otherwise
  // Subtle background for contrast - light enough to not block bottom nav
  const inputContainerClass = proMode
    ? "w-full"
    : "w-full"
    
  const inputContainerStyle = proMode
    ? {
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        backdropFilter: 'blur(8px)',
        paddingTop: 'clamp(12px, 3vw, 16px)',
        paddingBottom: 'clamp(12px, 3vw, 16px)',
        paddingLeft: 'clamp(12px, 3vw, 24px)',
        paddingRight: 'clamp(12px, 3vw, 24px)',
      }
    : {}

  const inputWrapperClass = proMode
    ? "max-w-[1200px] mx-auto"
    : "w-full"

  const textareaClass = proMode
    ? "focus:outline-none touch-manipulation"
    : "w-full pl-12 pr-12 py-3 bg-white border border-stone-200 rounded-xl text-stone-950 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-950/50 focus:bg-white font-medium text-[16px] min-h-[48px] max-h-[80px] shadow-lg shadow-stone-950/10 transition-all duration-300 resize-none overflow-y-auto leading-relaxed touch-manipulation"

  const textareaStyle = proMode
    ? {
        fontFamily: Typography.body.fontFamily,
        fontSize: 'clamp(15px, 4vw, 16px)',
        fontWeight: Typography.body.weights.regular,
        color: Colors.textPrimary,
        backgroundColor: Colors.surface,
        border: `1px solid ${Colors.border}`,
        borderRadius: BorderRadius.input,
        padding: 'clamp(10px, 3vw, 12px) clamp(12px, 3vw, 14px)',
        width: '100%',
        minHeight: '44px',
        maxHeight: '200px',
        resize: 'none' as const,
        lineHeight: Typography.body.lineHeight,
        letterSpacing: Typography.body.letterSpacing,
        transition: 'border-color 0.2s ease',
      }
    : {}

  const imageButtonClass = proMode
    ? "touch-manipulation active:scale-95 shrink-0"
    : "touch-manipulation active:scale-95 shrink-0 flex items-center justify-center w-11 h-11 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"

  const imageButtonStyle = proMode
    ? {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'clamp(40px, 10vw, 44px)',
        height: 'clamp(40px, 10vw, 44px)',
        minWidth: '44px',
        minHeight: '44px',
        borderRadius: BorderRadius.button,
        border: `1px solid ${Colors.border}`,
        backgroundColor: 'transparent',
        color: Colors.textSecondary,
        cursor: isLoading || disabled || isUploadingImage ? 'not-allowed' : 'pointer',
        opacity: isLoading || disabled || isUploadingImage ? 0.5 : 1,
        transition: 'all 0.2s ease',
      }
    : {}

  const sendButtonClass = proMode
    ? "touch-manipulation active:scale-95 shrink-0"
    : "absolute right-2 bottom-2.5 w-9 h-9 flex items-center justify-center text-stone-600 hover:text-stone-950 transition-colors disabled:opacity-50 touch-manipulation active:scale-95 z-10 pointer-events-auto"

  const sendButtonStyle = proMode
    ? {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'clamp(40px, 10vw, 44px)',
        height: 'clamp(40px, 10vw, 44px)',
        minWidth: '44px',
        minHeight: '44px',
        borderRadius: BorderRadius.button,
        border: 'none',
        backgroundColor:
          (!inputValue.trim() && !uploadedImage) || isLoading || disabled
            ? Colors.border
            : Colors.primary,
        color: Colors.surface,
        cursor:
          (!inputValue.trim() && !uploadedImage) || isLoading || disabled
            ? 'not-allowed'
            : 'pointer',
        opacity:
          (!inputValue.trim() && !uploadedImage) || isLoading || disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
      }
    : {}

  return (
    <div
      className={inputContainerClass}
      style={inputContainerStyle}
    >
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

        <div className={`flex ${proMode ? 'items-end gap-2 sm:gap-3' : 'gap-2 items-end'}`}>
          {/* Image upload button */}
          <button
            type="button"
            onClick={handleImageClick}
            disabled={isLoading || disabled || isUploadingImage}
            className={imageButtonClass}
            style={imageButtonStyle}
            onMouseEnter={proMode ? (e) => {
              if (!isLoading && !disabled && !isUploadingImage) {
                e.currentTarget.style.backgroundColor = Colors.hover
                e.currentTarget.style.borderColor = Colors.primary
              }
            } : undefined}
            onMouseLeave={proMode ? (e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.borderColor = Colors.border
            } : undefined}
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
              <ImageIcon size={18} strokeWidth={2} />
            )}
          </button>

          {/* Text input */}
          <div className="flex-1 relative">
            {/* Settings Menu Button - Classic mode only */}
            {showSettingsButton && onSettingsClick && (
              <button
                onClick={onSettingsClick}
                disabled={isLoading || disabled}
                className="absolute left-2 bottom-2.5 w-9 h-9 flex items-center justify-center text-stone-600 hover:text-stone-950 transition-colors disabled:opacity-50 touch-manipulation active:scale-95 z-10 pointer-events-auto"
                aria-label="Settings menu"
                type="button"
              >
                <Sliders size={20} strokeWidth={2} />
              </button>
            )}

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
              style={textareaStyle}
              onFocus={proMode ? (e) => {
                e.currentTarget.style.borderColor = Colors.primary
              } : undefined}
              onBlur={proMode ? (e) => {
                e.currentTarget.style.borderColor = Colors.border
              } : undefined}
              aria-label="Message input"
              rows={1}
              inputMode="text"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck="true"
              autoComplete="off"
              enterKeyHint="send"
            />

            {/* Send button - Classic Mode: absolute positioned, Pro Mode: in flex */}
            {!proMode && (
              <button
                onClick={handleSubmit}
                className={sendButtonClass}
                disabled={isLoading || (!inputValue.trim() && !uploadedImage) || isUploadingImage || disabled}
                aria-label="Send message"
                type="button"
              >
                <Send size={20} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Send button - Pro Mode only (in flex layout) */}
          {proMode && (
            <button
              type="submit"
              disabled={(!inputValue.trim() && !uploadedImage) || isLoading || disabled}
              className={sendButtonClass}
              style={sendButtonStyle}
              onMouseEnter={(e) => {
                if (
                  (inputValue.trim() || uploadedImage) &&
                  !isLoading &&
                  !disabled
                ) {
                  e.currentTarget.style.backgroundColor = Colors.accent
                }
              }}
              onMouseLeave={(e) => {
                if (
                  (inputValue.trim() || uploadedImage) &&
                  !isLoading &&
                  !disabled
                ) {
                  e.currentTarget.style.backgroundColor = Colors.primary
                }
              }}
              title="Send message"
            >
              {isLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send size={18} />
              )}
            </button>
          )}
        </div>

        {/* Navigation buttons - New Project and History (replaces Open Library, consistent in both modes) */}
        {/* Text-only buttons with no background, positioned to avoid bottom nav overlap */}
        {/* Added extra padding-bottom on desktop to prevent overlap with bottom navigation (bottom nav is ~80px) */}
        {(onNewProject || onHistory) && (
          <div 
            className="mt-2 flex items-center justify-start gap-4"
            style={{
              paddingBottom: 'max(8px, calc(env(safe-area-inset-bottom, 0px) + 12px))',
              marginBottom: '8px',
            }}
          >
            {onNewProject && (
              <button
                type="button"
                onClick={onNewProject}
                className="touch-manipulation active:scale-95 text-xs font-serif font-extralight tracking-[0.2em] uppercase text-stone-500 hover:text-stone-700 transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  margin: '0',
                }}
                aria-label="Start a new project"
                title="Start a new project"
              >
                New Project
              </button>
            )}
            {onHistory && (
              <button
                type="button"
                onClick={onHistory}
                className="touch-manipulation active:scale-95 text-xs font-serif font-extralight tracking-[0.2em] uppercase text-stone-500 hover:text-stone-700 transition-colors"
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0',
                  margin: '0',
                }}
                aria-label="View chat history"
                title="View chat history"
              >
                History
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}

