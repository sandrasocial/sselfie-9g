const TOKENIZED_PATHS: ReadonlyArray<RegExp> = [
  /^\/academy\/visibility-plan\/[^/]+/,
  /^\/access\/(?:presets|prompt-vault|selfie-to-ai-photos-kit|selfie-to-brand-shoot|starter-kit)\/[^/]+/,
  /^\/ai-prompts\/access\/[^/]+/,
  /^\/approve\/[^/]+/,
  /^\/brand-strategy\/setup\/[^/]+/,
  /^\/campaign\/order\/[^/]+/,
  /^\/claim\/[^/]+/,
  /^\/selfie-guide\/access\/[^/]+/,
  /^\/strategy\/[^/]+/,
]

export function sanitizePostHogPathname(pathname: string): string | null {
  if (!pathname.startsWith("/")) return null
  const clean = pathname.split(/[?#]/, 1)[0]

  for (const pattern of TOKENIZED_PATHS) {
    if (pattern.test(clean)) {
      return clean
        .replace(pattern, match => `${match.slice(0, match.lastIndexOf("/") + 1)}[token]`)
        .slice(0, 300)
    }
  }

  return clean.slice(0, 300)
}
