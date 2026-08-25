export const POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE = String.raw`(\/(?:academy\/visibility-plan|access\/(?:presets|prompt-vault|selfie-to-ai-photos-kit|selfie-to-brand-shoot|starter-kit)|ai-prompts\/access|approve|brand-strategy\/setup|campaign\/order|claim|selfie-guide\/access|strategy)\/)[^\/"?#]+`

const TOKENIZED_PATH = new RegExp(`^${POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE}`)
const TOKENIZED_PATH_IN_PAYLOAD = new RegExp(POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE, "g")

export function shouldResetPostHogIdentity(
  persistedDistinctId: string | null | undefined,
  serverDistinctId: string
): boolean {
  return Boolean(
    persistedDistinctId?.startsWith("user:") && persistedDistinctId !== serverDistinctId
  )
}

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

    const sanitized = scrub(event) as T
    if (sanitized && typeof sanitized === "object") {
      const eventRecord = sanitized as Record<string, unknown>
      const properties = eventRecord.properties
      if (properties && typeof properties === "object" && !Array.isArray(properties)) {
        const propertyRecord = properties as Record<string, unknown>
        if (eventRecord.event === "$exception") {
          const exceptionDimension = (value: unknown) => {
            if (typeof value !== "string") return null
            const clean = value.trim()
            return /^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(clean) ? clean : null
          }
          const exceptionList = Array.isArray(propertyRecord.$exception_list)
            ? propertyRecord.$exception_list
            : []
          const firstException =
            exceptionList[0] &&
            typeof exceptionList[0] === "object" &&
            !Array.isArray(exceptionList[0])
              ? (exceptionList[0] as Record<string, unknown>)
              : null
          const mechanism =
            firstException?.mechanism &&
            typeof firstException.mechanism === "object" &&
            !Array.isArray(firstException.mechanism)
              ? (firstException.mechanism as Record<string, unknown>)
              : null
          const exceptionType = exceptionDimension(
            propertyRecord.$exception_type ?? firstException?.type
          )
          const exceptionSource = exceptionDimension(
            propertyRecord.$exception_source ?? firstException?.source ?? mechanism?.type
          )
          for (const key of Object.keys(propertyRecord)) {
            if (/exception|error|message|stack/i.test(key)) delete propertyRecord[key]
          }
          if (exceptionType) propertyRecord.$exception_type = exceptionType
          if (exceptionSource) propertyRecord.$exception_source = exceptionSource
        } else {
          for (const key of Object.keys(propertyRecord)) {
            if (/^\$exception_/i.test(key)) delete propertyRecord[key]
          }
        }
      }
    }

    return sanitized
  } catch {
    return null
  }
}
