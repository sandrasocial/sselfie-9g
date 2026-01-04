/**
 * Simple validation for Nano Banana prompts
 * 
 * This ONLY checks if Maya's prompt has the required elements.
 * It does NOT rebuild or modify - just validates.
 */

export interface PromptValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  wordCount: number
}

export function validateNanoBananaPrompt(prompt: string): PromptValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Count words
  const wordCount = prompt.split(/\s+/).length
  
  // Required elements
  if (!prompt.includes('maintaining exactly the same physical characteristics')) {
    errors.push('Missing attachment reference format')
  }
  
  if (!prompt.includes('Lighting:') && !prompt.includes('lighting')) {
    warnings.push('No lighting description found')
  }
  
  if (!prompt.includes('Aesthetic') && !prompt.includes('aesthetic')) {
    warnings.push('No aesthetic/vibe description found')
  }
  
  // Length check
  if (wordCount < 100) {
    warnings.push(`Prompt is short (${wordCount} words). Aim for 150-200.`)
  }
  
  if (wordCount > 250) {
    warnings.push(`Prompt is long (${wordCount} words). Consider condensing.`)
  }
  
  // Check for over-formatting (shouldn't be present after cleaning)
  if (prompt.includes('**')) {
    warnings.push('Contains ** formatting - should be removed')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    wordCount
  }
}

