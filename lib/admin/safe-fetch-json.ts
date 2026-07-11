// Canonical guard for admin fetches. Vercel timeouts/errors return plain-text bodies
// ("An error occurred..."), and calling response.json() on them throws
// `Unexpected token 'A' ... is not valid JSON` in the admin UI. This helper was
// previously reimplemented inline across multiple admin clients. One implementation
// now serves every admin surface.

/**
 * Strict variant: returns parsed JSON ({} for an empty body) or THROWS a readable
 * error for non-JSON bodies. Use where the call site already try/catches.
 */
export async function readJsonResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text.trim()) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    const excerpt = text.replace(/\s+/g, " ").trim().slice(0, 180)
    throw new Error(
      `The server returned a non-JSON error (${response.status}). ${excerpt || "No details were returned."}`
    )
  }
}

/**
 * Lenient variant: never throws. Non-JSON bodies become `{ success: false, error }`
 * with a 504-specific message. Use in UI flows that render `error` directly.
 */
export async function readAdminJson(response: Response): Promise<any> {
  const text = await response.text()
  if (!text.trim()) return null
  try {
    return JSON.parse(text)
  } catch {
    const compact = text.replace(/\s+/g, " ").trim().slice(0, 180)
    return {
      success: false,
      error:
        response.status === 504
          ? "The request timed out before it could finish. Try again in a minute."
          : `The server returned a non-JSON error (${response.status}). ${compact || "Try again in a minute."}`,
    }
  }
}
