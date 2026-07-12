// @vitest-environment node

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

const REMOVED_RUNTIME_PATHS = [
  "app/admin/ig-inbox",
  "app/my-inbox",
  "app/api/admin/ig-inbox",
  "app/api/ig-agent",
  "app/api/webhooks/instagram",
  "app/api/webhooks/manychat-inbound",
  "components/ig-agent",
  "lib/admin/dm-approval-context.ts",
  "lib/ig-agent",
  "lib/email/templates/ig-flag-notification.ts",
  "scripts/ig-community-manager.ts",
  "scripts/ig-dm-draft-prep.ts",
  "scripts/ig-graph-dm-test.ts",
]

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return []
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(?:ts|tsx|js|mjs)$/.test(name) ? [path] : []
  })
}

describe("retired Instagram reply system", () => {
  it("removes every reply-agent runtime surface", () => {
    for (const path of REMOVED_RUNTIME_PATHS) {
      const absolutePath = resolve(ROOT, path)
      const remainingFiles = existsSync(absolutePath)
        ? statSync(absolutePath).isDirectory()
          ? sourceFiles(absolutePath)
          : [absolutePath]
        : []
      expect(remainingFiles, path).toHaveLength(0)
    }
  })

  it("leaves no active reply-agent database or route references", () => {
    const activeFiles = ["app", "components", "lib", "scripts"]
      .flatMap((directory) => sourceFiles(resolve(ROOT, directory)))

    for (const retiredReference of [
      "ig_conversations",
      "ig_messages",
      "send_ig_reply",
      "dm_response",
      "/admin/ig-inbox",
      "manychat-inbound",
      "IG_AGENT_AUTO_SEND_ENABLED",
      "MANYCHAT_OUTBOUND_ENABLED",
      "INSTAGRAM_LOGIN_SCOPES",
    ]) {
      const offenders = activeFiles.filter((path) =>
        readFileSync(path, "utf8").includes(retiredReference),
      )
      expect(offenders, retiredReference).toEqual([])
    }
  })

  it("keeps founder approvals limited to email broadcasts", () => {
    const queue = readFileSync(resolve(ROOT, "lib/admin/action-queue.ts"), "utf8")
    const executor = readFileSync(resolve(ROOT, "lib/admin/action-executor.ts"), "utf8")

    expect(queue).toContain('export type AdminActionKind = "send_resend_broadcast"')
    expect(queue).not.toContain("send_ig_reply")
    expect(executor).not.toContain("sendApprovedInstagramReply")
  })
})
