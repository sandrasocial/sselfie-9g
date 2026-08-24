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
    const serialized = JSON.stringify(event)
    if (!serialized) return null
    return JSON.parse(serialized.replace(TOKENIZED_PATH_IN_PAYLOAD, "$1[token]")) as T
  } catch {
    return null
  }
}
