// @vitest-environment node

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const source = readFileSync(
  resolve(process.cwd(), "app/access/prompt-vault/[token]/page.tsx"),
  "utf8"
)
const deferredSource = readFileSync(
  resolve(process.cwd(), "components/prompt-vault/deferred-vault-collection.tsx"),
  "utf8"
)

describe("Prompt Vault accordion interaction performance", () => {
  it("contains the expanded shoot layout and skips off-screen card rendering", () => {
    expect(source).toMatch(/\.pva-details-content\s*\{[^}]*contain: layout paint style;/s)
    expect(source).toMatch(/\.pva-card\s*\{[^}]*content-visibility: auto;/s)
    expect(source).toMatch(/\.pva-card\s*\{[^}]*contain-intrinsic-size: auto 760px;/s)
  })

  it("does not hydrate closed shoot cards or their event handlers", () => {
    expect(source).toContain("<DeferredVaultCollection")
    expect(source).not.toContain("<PromptViewTracker")
    expect(deferredSource).toMatch(/const \[hasOpened, setHasOpened\] = useState\(false\)/)
    expect(deferredSource).toMatch(/requestAnimationFrame\(\(\) => startTransition/)
    expect(deferredSource).toMatch(/\{hasOpened \? \(/)
  })
})
