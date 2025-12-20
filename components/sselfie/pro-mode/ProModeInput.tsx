"use client"

import { useState, useRef } from 'react'
import { ImageIcon, Send, Loader2 } from 'lucide-react'
import { Typography, Colors, BorderRadius, Spacing, ButtonLabels } from '@/lib/maya/pro/design-system'

/**
 * ProModeInput Component
 * 
 * Chat input component for Studio Pro Mode.
 * Clean, professional design with NO emoji placeholders.
 * 
 * Design principles:
 * - NO emojis in UI elements
 * - Professional typography (Inter)
 * - Stone palette colors
 * - Minimal, editorial design
 */

interface ProModeInputProps {
  onSend?: (message: string, imageUrl?: string) => void
  onImageUpload?: () => void
  onManageLibrary?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

export default function ProModeInput({
  onSend,
  onImageUpload,
  onManageLibrary,
  isLoading = false,
  disabled = false,
  placeholder = "What would you like to create?",
}: ProModeInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault()
    }

    if (!inputValue.trim() && !uploadedImage) return
    if (isLoading || disabled) return

    if (onSend) {
      onSend(inputValue.trim(), uploadedImage || undefined)
      setInputValue('')
      setUploadedImage(null)
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
    // Allow Enter for new lines (default behavior)
  }

  const handleImageClick = () => {
    if (onImageUpload) {
      onImageUpload()
    } else {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingImage(true)

    try {
      const file = files[0]
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      setUploadedImage(data.url)
    } catch (error) {
      console.error('Error uploading image:', error)
      // TODO: Show error toast
    } finally {
      setIsUploadingImage(false)
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
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
  }

  const removeImage = () => {
    setUploadedImage(null)
  }

  return (
    <div
      className="w-full border-t"
      style={{
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        padding: `${Spacing.card} ${Spacing.section}`,
      }}
    >
      <form onSubmit={handleSubmit} className="max-w-[1200px] mx-auto">
        {/* Uploaded image preview */}
        {uploadedImage && (
          <div className="mb-3 flex items-center gap-2">
            <div className="relative">
              <img
                src={uploadedImage}
                alt="Uploaded"
                className="w-16 h-16 object-cover rounded"
                style={{
                  borderRadius: BorderRadius.image,
                  border: `1px solid ${Colors.border}`,
                }}
              />
              <button
                type="button"
                onClick={removeImage}
                className="absolute -top-1 -right-1 w-5 h-5 bg-stone-900 text-white rounded-full flex items-center justify-center text-xs hover:bg-stone-800 transition-colors"
                style={{
                  fontSize: '10px',
                }}
              >
                ×
              </button>
            </div>
            <span
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.xs,
                color: Colors.textTertiary,
              }}
            >
              Image attached
            </span>
          </div>
        )}

        <div className="flex items-end gap-3">
          {/* Image upload button */}
          <button
            type="button"
            onClick={handleImageClick}
            disabled={isLoading || disabled || isUploadingImage}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: BorderRadius.button,
              border: `1px solid ${Colors.border}`,
              backgroundColor: 'transparent',
              color: Colors.textSecondary,
              cursor: isLoading || disabled || isUploadingImage ? 'not-allowed' : 'pointer',
              opacity: isLoading || disabled || isUploadingImage ? 0.5 : 1,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoading && !disabled && !isUploadingImage) {
                e.currentTarget.style.backgroundColor = Colors.hover
                e.currentTarget.style.borderColor = Colors.primary
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading && !disabled && !isUploadingImage) {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.borderColor = Colors.border
              }
            }}
            title="Upload image"
          >
            {isUploadingImage ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ImageIcon size={18} />
            )}
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={isLoading || disabled || isUploadingImage}
          />

          {/* Text input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading || disabled}
              rows={1}
              style={{
                fontFamily: Typography.body.fontFamily,
                fontSize: Typography.body.sizes.md,
                fontWeight: Typography.body.weights.regular,
                color: Colors.textPrimary,
                backgroundColor: Colors.surface,
                border: `1px solid ${Colors.border}`,
                borderRadius: BorderRadius.input,
                padding: '10px 14px',
                width: '100%',
                minHeight: '40px',
                maxHeight: '200px',
                resize: 'none',
                lineHeight: Typography.body.lineHeight,
                letterSpacing: Typography.body.letterSpacing,
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = Colors.primary
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = Colors.border
              }}
              className="focus:outline-none"
            />
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.xs,
                color: Colors.textTertiary,
                pointerEvents: 'none',
              }}
            >
              Cmd/Ctrl + Enter to send
            </div>
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={(!inputValue.trim() && !uploadedImage) || isLoading || disabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
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
            }}
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
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>

        {/* Manage Library button */}
        {onManageLibrary && (
          <div className="mt-3 flex justify-start">
            <button
              type="button"
              onClick={onManageLibrary}
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.sm,
                fontWeight: Typography.ui.weights.regular,
                color: Colors.textSecondary,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                transition: 'opacity 0.2s ease',
              }}
              className="hover:opacity-70"
            >
              {ButtonLabels.openLibrary}
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
