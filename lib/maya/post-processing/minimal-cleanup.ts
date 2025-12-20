/**
 * Minimal Post-Processing
 * 
 * Only fixes actual errors, preserves user intent.
 * Skips post-processing for guide prompts entirely.
 */

/**
 * Fix syntax errors only (double commas, extra spaces, etc.)
 */
export function fixSyntaxErrors(prompt: string): string {
  return prompt
    .replace(/,\s*,/g, ",") // Double commas
    .replace(/\.\s*\./g, ".") // Double periods
    .replace(/,\s*\./g, ".") // Comma before period
    .replace(/^,\s*/, "") // Leading comma
    .replace(/\s*,$/, "") // Trailing comma
    .replace(/\s+/g, " ") // Multiple spaces
    .trim()
}

/**
 * Fix formatting issues only
 */
export function fixFormatting(prompt: string): string {
  return prompt
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Minimal cleanup - only fix syntax and formatting
 * DO NOT change: outfit, location, lighting, aesthetic choices
 */
export function minimalCleanup(prompt: string, isFromGuidePrompt: boolean): string {
  if (isFromGuidePrompt) {
    // For guide prompts, only fix syntax errors
    return fixSyntaxErrors(prompt)
  }
  
  // For regular prompts, fix syntax and formatting
  let cleaned = fixSyntaxErrors(prompt)
  cleaned = fixFormatting(cleaned)
  
  return cleaned
}














