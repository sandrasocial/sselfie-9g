export const POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE = String.raw`(\/(?:academy\/visibility-plan|access\/(?:presets|prompt-vault|selfie-to-ai-photos-kit|selfie-to-brand-shoot|starter-kit)|ai-prompts\/access|approve|brand-strategy\/setup|campaign\/order|claim|selfie-guide\/access|strategy)\/)[^\/"?#]+`

const TOKENIZED_PATH = new RegExp(`^${POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE}`)
const TOKENIZED_PATH_IN_PAYLOAD = new RegExp(POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE, "g")

export function sanitizePostHogPathname(pathname: string): string | null {
  if (!pathname.startsWith("/")) return null
  const clean = pathname.split(/[?#]/, 1)[0]

  return clean.replace(TOKENIZED_PATH, "$1[token]").slice(0, 300)
}

export function sanitizePostHogEventPayload<T>(event: T): T | null {
  try {
    const scrub = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(scrub)
      if (value && typeof value === "object") {
        return Object.fromEntries(
          Object.entries(value).map(([key, nested]) => [key, scrub(nested)])
        )
      }
      if (typeof value !== "string") return value

      const tokenSafe = value.replace(TOKENIZED_PATH_IN_PAYLOAD, "$1[token]")
      if (!/^https?:\/\//i.test(tokenSafe) && !tokenSafe.startsWith("/")) return tokenSafe

      try {
        const absolute = /^https?:\/\//i.test(tokenSafe)
        const parsed = new URL(tokenSafe, "https://sselfie.invalid")
        return `${absolute ? parsed.origin : ""}${parsed.pathname}`
      } catch {
        return tokenSafe.split(/[?#]/, 1)[0]
      }
    }

    return scrub(event) as T
  } catch {
    return null
  }
}
