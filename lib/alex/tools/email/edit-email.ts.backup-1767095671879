/**
 * Edit Email Tool
 * Makes simple edits to existing email HTML without regenerating from scratch
 */

import type { Tool, ToolResult } from '../../types'
import { stripHtml } from '../../shared/dependencies'

interface EditEmailInput {
  previousEmailHtml: string
  editType: 'change_link' | 'change_text' | 'remove_element' | 'add_element' | 'fix_typo'
  findText?: string
  replaceWith?: string
  elementSelector?: string
}

export const editEmailTool: Tool<EditEmailInput> = {
  name: "edit_email",
  description: `Make simple edits to an existing email without regenerating it from scratch.

Use this for quick changes like:
- Change a link URL
- Update a phone number or email address
- Remove/add emojis
- Fix typos
- Change button text
- Update pricing/dates

This preserves the existing email and makes ONLY the requested changes.`,

  input_schema: {
    type: "object",
    properties: {
      previousEmailHtml: {
        type: "string",
        description: "The full HTML of the email to edit (extract from previous message or email preview)"
      },
      editType: {
        type: "string",
        enum: ["change_link", "change_text", "remove_element", "add_element", "fix_typo"],
        description: "Type of edit to make"
      },
      findText: {
        type: "string",
        description: "Text/pattern to find (for replacements or removals)"
      },
      replaceWith: {
        type: "string",
        description: "What to replace it with (leave empty to remove)"
      },
      elementSelector: {
        type: "string",
        description: "CSS selector or description of element to modify (e.g., 'CTA button', 'first link')"
      }
    },
    required: ["previousEmailHtml", "editType"]
  },

  async execute({
    previousEmailHtml,
    editType,
    findText,
    replaceWith = "",
    elementSelector
  }: EditEmailInput): Promise<ToolResult> {
    try {
      console.log('[Alex] ✏️ Editing email:', { editType, findText: findText?.substring(0, 50) })

      let updatedHtml = previousEmailHtml

      switch (editType) {
        case "change_link":
          // Find and replace specific link
          if (findText && replaceWith) {
            // Replace exact href match
            updatedHtml = previousEmailHtml.replace(
              new RegExp(`href="${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
              `href="${replaceWith}"`
            )
            // Also try partial match if exact didn't work
            if (updatedHtml === previousEmailHtml) {
              updatedHtml = previousEmailHtml.replace(
                new RegExp(`href="[^"]*${findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"]*"`, 'g'),
                `href="${replaceWith}"`
              )
            }
          }
          break

        case "change_text":
          // Replace text content
          if (findText && replaceWith !== undefined) {
            updatedHtml = previousEmailHtml.replace(
              new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
              replaceWith
            )
          }
          break

        case "remove_element":
          // Remove specific text/elements
          if (findText) {
            updatedHtml = previousEmailHtml.replace(
              new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
              ''
            )
          }
          break

        case "fix_typo":
          // Direct text replacement
          if (findText && replaceWith !== undefined) {
            updatedHtml = previousEmailHtml.replace(findText, replaceWith)
          }
          break
      }

      // Verify something changed
      if (updatedHtml === previousEmailHtml) {
        console.log('[Alex] ⚠️ No changes made - check findText matches')
        return {
          success: false,
          error: `Could not find "${findText?.substring(0, 50)}..." in email HTML. Please check the text to find.`,
          suggestion: "Try copying the exact text from the email preview"
        }
      }

      console.log('[Alex] ✅ Email edited successfully')

      // Generate preview text
      const bodyText = stripHtml(updatedHtml)
      const preview = bodyText.substring(0, 200).trim() + (bodyText.length > 200 ? '...' : '')

      // Extract subject line if present (from email structure or generate simple one)
      const subjectMatch = updatedHtml.match(/<title>(.*?)<\/title>/i)
      const subjectLine = subjectMatch?.[1] || "Updated Email"

      return {
        success: true,
        html: updatedHtml,
        subjectLine,
        preview,
        changes: `${editType}: "${findText?.substring(0, 30)}..." → "${replaceWith?.substring(0, 30)}..."`,
        message: "Email edited successfully"
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error editing email:', error)
      return {
        success: false,
        error: error.message || 'Failed to edit email'
      }
    }
  }
}

