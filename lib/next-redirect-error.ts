/**
 * Next.js implements `redirect()` and `notFound()` by throwing a tagged error. Any
 * `catch` that sits between the call and the framework will swallow the navigation
 * unless it rethrows, and the page then silently continues rendering.
 *
 * That is exactly what broke the /app gate: a Vault Maya member's redirect to her own
 * studio was caught by the access-check catch, so she fell through to the limited shell
 * with generation locked.
 *
 * The checkout pages each inline this same digest test. This is the shared version.
 */
export function isNextControlFlowError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  if (!("digest" in error)) return false

  const digest = (error as { digest?: unknown }).digest
  if (typeof digest !== "string") return false

  return digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND"
}

/** Rethrow a Next.js redirect/notFound signal, leaving real errors to the caller. */
export function rethrowIfNextControlFlow(error: unknown): void {
  if (isNextControlFlowError(error)) {
    throw error
  }
}
