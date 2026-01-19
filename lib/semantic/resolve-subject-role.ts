/**
 * SEMANTIC AUTHORITY - Subject Role Resolver
 * 
 * SINGLE SOURCE OF TRUTH for subject identity across all prompt generation.
 * 
 * CONSTITUTIONAL RULES:
 * 1. Subject identity defaults to LIFESTYLE
 * 2. Business/CEO/professional identity ONLY when category === "professional"
 * 3. Business identity MUST NOT appear implicitly outside that case
 * 4. No other inputs allowed - category is the sole determiner
 * 
 * PURPOSE:
 * Eliminates semantic contradictions by establishing ONE authoritative resolver
 * that all prompt builders must consult.
 * 
 * USAGE:
 * ```typescript
 * const subjectRole = resolveSubjectRole(category)
 * if (subjectRole === "professional") {
 *   // Allow business semantics
 * } else {
 *   // Lifestyle only - NO business semantics
 * }
 * ```
 */

export type SubjectRole = "lifestyle" | "professional"

/**
 * Resolve subject role from category.
 * 
 * This is the ONLY function that determines whether business/professional
 * identity is allowed in prompts.
 * 
 * @param category - User-selected category (may be null)
 * @returns "professional" if category === "professional", otherwise "lifestyle"
 */
export function resolveSubjectRole(
  category: string | null | undefined
): SubjectRole {
  // Professional identity ONLY when explicitly selected
  if (category === "professional") {
    return "professional"
  }
  
  // DEFAULT: Lifestyle identity (no business semantics)
  return "lifestyle"
}

/**
 * Check if business semantics are allowed for this subject role.
 * 
 * Convenience function for readability in prompt builders.
 * 
 * @param subjectRole - Resolved subject role
 * @returns true if business semantics allowed, false otherwise
 */
export function allowsBusinessSemantics(subjectRole: SubjectRole): boolean {
  return subjectRole === "professional"
}

/**
 * Get subject identity descriptor for prompt injection.
 * 
 * Returns a descriptive string that can be injected into prompts
 * to anchor the subject identity correctly.
 * 
 * @param subjectRole - Resolved subject role
 * @returns Identity descriptor string
 */
export function getSubjectIdentityDescriptor(subjectRole: SubjectRole): string {
  if (subjectRole === "professional") {
    return "Professional individual in business context with executive presence and authority"
  }
  
  return "Lifestyle individual in everyday context with casual, expressive, authentic presence"
}
