import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

/**
 * Formats content for easy pasting to clipboard
 */
export function formatForClipboard(content: {
  caption?: string
  hashtags?: string[]
  overlayText?: string[]
}): string {
  let output = ''

  if (content.caption) {
    output += content.caption + '\n\n'
  }

  if (content.overlayText) {
    output += 'OVERLAY TEXT:\n'
    content.overlayText.forEach((text, i) => {
      output += `Slide ${i + 1}: ${text}\n`
    })
    output += '\n'
  }

  if (content.hashtags) {
    output += content.hashtags.map(tag => `#${tag}`).join(' ')
  }

  return output.trim()
}

/**
 * Creates formatted calendar suggestion block
 */
export function generateCalendarBlock(
  pillar: string,
  date: Date,
  contentType: string
): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayName = days[date.getDay()]

  return `📅 Suggested Schedule:
${dayName}, ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
Content Pillar: ${pillar}
Type: ${contentType}

Add to your content calendar`
}

/**
 * Async clipboard copy with error handling
 * Returns true if successful, false otherwise
 * Note: Caller should handle toast notifications
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    // Show toast notification - handled by caller
    return true
  } catch (err) {
    console.error('Failed to copy:', err)
    return false
  }
}

/**
 * Validates slug format and uniqueness
 * Returns validation result with optional suggestion
 */
export async function validateSlug(slug: string): Promise<{
  valid: boolean
  suggestion?: string
  error?: string
}> {
  // Check format - must be URL-safe
  const urlSafe = /^[a-z0-9-]+$/
  if (!urlSafe.test(slug)) {
    const suggestion = slugify(slug)
    return {
      valid: false,
      suggestion,
      error: 'Slug contains invalid characters. Use only lowercase letters, numbers, and hyphens.'
    }
  }

  // Check uniqueness
  try {
    const existing = await sql`
      SELECT id FROM prompt_pages WHERE slug = ${slug} LIMIT 1
    `

    if (existing.length > 0) {
      const suggestion = `${slug}-${Date.now()}`
      return {
        valid: false,
        suggestion,
        error: 'Slug already exists. Please choose a different one.'
      }
    }

    return { valid: true }
  } catch (error: any) {
    console.error('[v0] Error validating slug:', error)
    return {
      valid: false,
      error: 'Failed to validate slug. Please try again.'
    }
  }
}

/**
 * Converts text to URL-safe slug
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
