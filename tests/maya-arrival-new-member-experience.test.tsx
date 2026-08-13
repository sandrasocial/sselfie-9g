// @vitest-environment node

import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  getAuthenticatedUser: vi.fn(),
  getUserIdFromSupabase: vi.fn(),
  getSuiteAccess: vi.fn(),
  isAdminEmail: vi.fn(),
  getPaidPromptVaultAccess: vi.fn(),
  getPublishedVaultCollections: vi.fn(),
  logAnalyticsEvent: vi.fn(),
}))

vi.mock("next/font/google", () => ({
  Cormorant_Garamond: () => ({ className: "font-serif" }),
  Inter: () => ({ className: "font-sans" }),
}))

vi.mock("next/image", () => ({
  default: ({ fill: _fill, priority: _priority, ...props }: Record<string, unknown>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  ),
}))

vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/auth-helper", () => ({ getAuthenticatedUser: mocks.getAuthenticatedUser }))
vi.mock("@/lib/user-mapping", () => ({
  getUserIdFromSupabase: mocks.getUserIdFromSupabase,
}))
vi.mock("@/lib/trial/suite-trial", () => ({ getSuiteAccess: mocks.getSuiteAccess }))
vi.mock("@/lib/admin-feature-flags", () => ({ isAdminEmail: mocks.isAdminEmail }))
vi.mock("@/lib/prompt-vault/paid-access", () => ({
  getPaidPromptVaultAccess: mocks.getPaidPromptVaultAccess,
}))
vi.mock("@/lib/vault/published-collections", () => ({
  getPublishedVaultCollections: mocks.getPublishedVaultCollections,
  toAestheticId: (name: string) =>
    name
      .toLowerCase()
      .replace(/\s*editorial\s*$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  toDisplayName: (name: string) => name.replace(/\s*Editorial\s*$/i, "").trim(),
}))
vi.mock("@/lib/analytics/events", () => ({ logAnalyticsEvent: mocks.logAnalyticsEvent }))
vi.mock("@/components/prompt-vault/prompt-view-tracker", () => ({
  PromptViewTracker: () => null,
}))
vi.mock("@/components/ai-prompts/copy-button", () => ({
  CopyButton: ({ label }: { label?: string }) => <button type="button">{label ?? "Copy"}</button>,
}))
vi.mock("@/components/marketing/suite-door", () => ({
  SuiteDoor: ({ ctaLabel, href }: { ctaLabel: string; href: string }) => (
    <a data-suite-door="true" href={href}>
      {ctaLabel}
    </a>
  ),
}))

function read(path: string) {
  return readFileSync(path, "utf8")
}

async function renderVaultPage({
  tokenValid,
  authenticated,
  accessLevel,
}: {
  tokenValid: boolean
  authenticated: boolean
  accessLevel: "member" | "trial" | "limited" | "none"
}) {
  mocks.sql.mockResolvedValue(tokenValid ? [{ name: "Sandra" }] : [])
  mocks.getAuthenticatedUser.mockResolvedValue({
    user: authenticated ? { id: "auth-user", email: "member@example.com" } : null,
    error: authenticated ? null : new Error("Not authenticated"),
  })
  mocks.getUserIdFromSupabase.mockResolvedValue("neon-user")
  mocks.getSuiteAccess.mockResolvedValue({
    level: accessLevel,
    trialEndsAt: null,
    trialDaysLeft: null,
  })
  mocks.getPaidPromptVaultAccess.mockResolvedValue(
    tokenValid ? { valid: true, name: "Sandra" } : { valid: false }
  )

  const { default: PromptVaultAccessPage } = await import("@/app/access/prompt-vault/[token]/page")
  const element = await PromptVaultAccessPage({ params: Promise.resolve({ token: "vault-token" }) })
  return renderToStaticMarkup(element)
}

describe("MAYA-ARRIVAL-01 new-member experience", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.sql.mockReset()
    mocks.getAuthenticatedUser.mockReset()
    mocks.getUserIdFromSupabase.mockReset()
    mocks.getSuiteAccess.mockReset()
    mocks.isAdminEmail.mockReset()
    mocks.getPaidPromptVaultAccess.mockReset()
    mocks.getPublishedVaultCollections.mockReset()
    mocks.logAnalyticsEvent.mockReset()

    mocks.isAdminEmail.mockReturnValue(false)
    mocks.getPublishedVaultCollections.mockResolvedValue([])
    mocks.logAnalyticsEvent.mockResolvedValue(undefined)
  })

  it("opens the existing maya-general Vault picker only for members with Vault access", () => {
    const appPage = read("app/app/page.tsx")
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(appPage).toContain("hasVaultAccess")
    expect(shell).toContain("hasVaultAccess={hasVaultAccess}")
    expect(shell).toContain("suppressRestore={Boolean(initialAestheticId)}")
    expect(frontDoor).toContain("Your Vault styles are already available inside Maya.")
    expect(frontDoor).toContain("hasVaultAccess ? (")
    expect(frontDoor).toContain('id: "maya-general"')
    expect(frontDoor).toContain("openWithAesthetic(MAYA_GENERAL")
    expect(frontDoor).toContain('format: "photo"')

    const worldGate = concierge.slice(
      concierge.indexOf("const mayaChoosesVisualWorld"),
      concierge.indexOf("const shouldShowProjectStart")
    )
    expect(worldGate).toContain("mayaChoosesVisualWorld ||")
    expect(worldGate).not.toContain('aesthetic.id === "maya-general"')
  })

  it("uses the same accent-insensitive id on Vault links and bundled aesthetics", async () => {
    const { AESTHETICS } = await import("@/components/app-v3/aesthetics")

    expect(AESTHETICS.some(aesthetic => aesthetic.id === "dark-feminine-cafe-coffee-run")).toBe(
      true
    )
  })

  it("renders member actions for a valid token plus active membership", async () => {
    const html = await renderVaultPage({
      tokenValid: true,
      authenticated: true,
      accessLevel: "member",
    })

    expect(html).toContain("Open in Maya")
    expect(html).toContain("Copy text")
    expect(html).toContain("YOUR PROMPT VAULT IS READY")
    expect(html).toContain("start with this shoot.")
    expect(html).toContain("DARK FEMININE CAFÉ · SIX MATCHING PHOTOS")
    expect(html).toContain("/app?view=create&amp;aesthetic=")
    expect(html).toContain("Open this look in Maya")
    expect(html).toContain('data-suite-door="true" href="/app"')
    expect(html).not.toContain("/join/studio?source=suite_door_vault_access")
  })

  it.each([
    { authenticated: false, accessLevel: "none" as const },
    { authenticated: true, accessLevel: "trial" as const },
    { authenticated: true, accessLevel: "limited" as const },
  ])("keeps the buyer page and defers the offer for a non-member session %#", async session => {
    const html = await renderVaultPage({ tokenValid: true, ...session })

    expect(html).toContain("Copy the first prompt")
    expect(html).toContain(">Copy</button>")
    expect(html).toContain("Need help choosing a selfie or fixing a result?")
    expect(html).not.toContain("Vault Maya")
    expect(html).not.toContain("visual world")
    expect(html).not.toContain("Open in Maya")
    expect(html).not.toContain("Copy text")
    expect(html).not.toContain("/join/studio?source=suite_door_vault_access")
    expect(html).not.toContain("See SSELFIE SUITE")
  })

  it("does not let an authenticated member bypass an invalid access token", async () => {
    const html = await renderVaultPage({
      tokenValid: false,
      authenticated: true,
      accessLevel: "member",
    })

    expect(html).toContain("This link doesn&#x27;t look right.")
    expect(html).not.toContain("Open in Maya")
  })

  it("keeps the pre-selfie question link dark unless the server flag is explicitly enabled", () => {
    const appPage = read("app/app/page.tsx")
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(appPage).toContain('process.env.MAYA_PRESELFIE_CHAT_ENABLED === "true"')
    expect(frontDoor).toContain("preSelfieChatEnabled = false")
    expect(frontDoor).toContain("preSelfieChatEnabled ? (")
    expect(frontDoor).toContain("Have a question first? Ask Maya")
    expect(frontDoor).toContain('initialSetupAction: "plain_chat"')
    expect(concierge).toContain('session.initialSetupAction === "plain_chat"')
  })
})
