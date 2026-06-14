import { readFileSync } from "fs"
import path from "path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("IG inbox manual reply feedback", () => {
  it("does not report a failed manual send as success", () => {
    const routeSource = read("app/api/admin/ig-inbox/[conversationId]/reply/route.ts")

    expect(routeSource).toContain("success: result.sent")
    expect(routeSource).not.toContain("success: true, result")
  })

  it("keeps the typed reply visible and shows the failure reason when send fails", () => {
    const clientSource = read("components/ig-agent/ig-inbox-client.tsx")

    expect(clientSource).toContain("setSendError")
    expect(clientSource).toContain("!payload?.success")
    expect(clientSource).toContain("setReply(\"\")")
  })
})
