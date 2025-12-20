"use client"

import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Typography, Colors, BorderRadius, Spacing, UILabels, ButtonLabels } from '@/lib/maya/pro/design-system'
import { ChevronDown } from 'lucide-react'

/**
 * ProModeHeader Component
 * 
 * Top navigation header for Studio Pro Mode.
 * Displays title, library count, manage dropdown, and credits.
 * 
 * Design principles:
 * - NO emojis in UI elements
 * - Professional typography (Hatton, Inter)
 * - Stone palette colors
 * - Minimal, editorial design
 */

interface ProModeHeaderProps {
  libraryCount?: number
  credits?: number
  onManageLibrary?: () => void
  onAddImages?: () => void
  onStartFresh?: () => void
  onEditIntent?: () => void
}

export default function ProModeHeader({
  libraryCount = 0,
  credits,
  onManageLibrary,
  onAddImages,
  onStartFresh,
  onEditIntent,
}: ProModeHeaderProps) {
  const [isManageOpen, setIsManageOpen] = useState(false)

  return (
    <div
      className="flex items-center justify-between w-full px-6 py-4 border-b"
      style={{
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
      }}
    >
      {/* Left side: Title and Library count */}
      <div className="flex items-center gap-6">
        {/* Studio Pro title */}
        <h1
          style={{
            fontFamily: Typography.subheaders.fontFamily,
            fontSize: Typography.subheaders.sizes.md,
            fontWeight: Typography.subheaders.weights.regular,
            color: Colors.textPrimary,
            lineHeight: Typography.subheaders.lineHeight,
            letterSpacing: Typography.subheaders.letterSpacing,
          }}
        >
          Studio Pro
        </h1>

        {/* Library count */}
        {libraryCount > 0 && (
          <p
            style={{
              fontFamily: Typography.ui.fontFamily,
              fontSize: '13px',
              fontWeight: Typography.ui.weights.regular,
              color: Colors.textSecondary,
              lineHeight: 1.5,
            }}
          >
            {UILabels.library(libraryCount)}
          </p>
        )}
      </div>

      {/* Right side: Manage dropdown and Credits */}
      <div className="flex items-center gap-4">
        {/* Manage dropdown */}
        {libraryCount > 0 && (
          <DropdownMenu open={isManageOpen} onOpenChange={setIsManageOpen}>
            <DropdownMenuTrigger asChild>
              <button
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  fontWeight: Typography.ui.weights.medium,
                  color: Colors.primary,
                  backgroundColor: 'transparent',
                  border: `1px solid ${Colors.border}`,
                  padding: '6px 12px',
                  borderRadius: BorderRadius.buttonSm,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = Colors.hover
                  e.currentTarget.style.borderColor = Colors.primary
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.borderColor = Colors.border
                }}
                className="hover:opacity-90"
              >
                {ButtonLabels.manage}
                <ChevronDown
                  size={14}
                  style={{
                    color: Colors.primary,
                    transition: 'transform 0.2s ease',
                    transform: isManageOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              style={{
                backgroundColor: Colors.surface,
                borderColor: Colors.border,
                borderRadius: BorderRadius.cardSm,
                minWidth: '180px',
                padding: '4px',
              }}
            >
              <DropdownMenuItem
                onClick={() => {
                  if (onManageLibrary) {
                    onManageLibrary()
                  }
                  setIsManageOpen(false)
                }}
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  color: Colors.textPrimary,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                className="hover:bg-stone-100"
              >
                {ButtonLabels.openLibrary}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (onAddImages) {
                    onAddImages()
                  }
                  setIsManageOpen(false)
                }}
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  color: Colors.textPrimary,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                className="hover:bg-stone-100"
              >
                {ButtonLabels.addImages}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (onEditIntent) {
                    onEditIntent()
                  }
                  setIsManageOpen(false)
                }}
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  color: Colors.textPrimary,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                className="hover:bg-stone-100"
              >
                {ButtonLabels.editIntent}
              </DropdownMenuItem>
              <DropdownMenuSeparator
                style={{
                  backgroundColor: Colors.border,
                  margin: '4px 0',
                }}
              />
              <DropdownMenuItem
                onClick={() => {
                  if (onStartFresh) {
                    onStartFresh()
                  }
                  setIsManageOpen(false)
                }}
                style={{
                  fontFamily: Typography.ui.fontFamily,
                  fontSize: Typography.ui.sizes.sm,
                  color: Colors.textSecondary,
                  padding: '8px 12px',
                  cursor: 'pointer',
                }}
                className="hover:bg-stone-100"
              >
                {ButtonLabels.startFresh}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Credits display */}
        {credits !== undefined && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded"
            style={{
              backgroundColor: Colors.backgroundAlt,
              border: `1px solid ${Colors.border}`,
            }}
          >
            <span
              style={{
                fontFamily: Typography.ui.fontFamily,
                fontSize: Typography.ui.sizes.sm,
                fontWeight: Typography.ui.weights.regular,
                color: Colors.textSecondary,
              }}
            >
              Credits
            </span>
            <span
              style={{
                fontFamily: Typography.data.fontFamily,
                fontSize: Typography.data.sizes.sm,
                fontWeight: Typography.data.weights.semibold,
                color: Colors.textPrimary,
              }}
            >
              {credits}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
