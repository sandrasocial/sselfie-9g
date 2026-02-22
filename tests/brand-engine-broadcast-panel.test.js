import { describe, expect, it } from "vitest"
import panelSource from "@/components/admin/brand-engine-broadcast-panel.tsx?raw"

describe("BrandEngineBroadcastPanel", () => {
  it("uses app signups label and does not reference mismatch guard fields", () => {
    expect(panelSource).toContain("App signups")
    expect(panelSource).not.toContain("audienceMismatch")
    expect(panelSource).not.toContain("dbSubscriberCount")
    expect(panelSource).not.toContain("Audience mismatch detected")
  })
})
