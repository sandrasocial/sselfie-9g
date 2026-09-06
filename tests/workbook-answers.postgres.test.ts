// @vitest-environment node
// Opt-in only. Supply a temporary Neon branch URL, never the production URL.
import { randomUUID } from "node:crypto"
import { beforeAll, describe, expect, it, vi } from "vitest"
const isolatedUrl = process.env.WORKBOOK_TEST_DATABASE_URL
vi.mock("@/lib/db/client", async () => {
  const { neon } = await import("@neondatabase/serverless")
  const url = process.env.WORKBOOK_TEST_DATABASE_URL
  if (!url) return { sql: vi.fn() }
  if (new URL(url).hostname.includes("ep-rapid-hat-adiicy9z"))
    throw new Error("Refusing production database")
  return { sql: neon(url) }
})
import {
  getWorkbookContextForMaya,
  readWorkbookAnswers,
  writeWorkbookAnswers,
} from "@/lib/academy/workbook-answers"
import { getMayaHomeBrandContext } from "@/lib/maya/home-brand-context"
import { getMayaGeneralAssistantPrompt } from "@/lib/maya/general-assistant-persona"

describe.skipIf(!isolatedUrl)("isolated Postgres workbook -> Maya", () => {
  const userA = `workbook-test-a-${randomUUID()}`,
    userB = `workbook-test-b-${randomUUID()}`
  beforeAll(() => {
    if (!isolatedUrl || !process.env.WORKBOOK_TEST_BRANCH_ID)
      throw new Error("Isolated branch required")
  })
  it("persists separate members, reads back across sessions, handles racing edits and supplies Maya's actual prompt", async () => {
    const a = [{ key: "story", label: "Story", value: "Ada makes pottery in Bergen" }]
    const b = [{ key: "story", label: "Story", value: "Bea teaches yoga in Oslo" }]
    expect(await writeWorkbookAnswers(userA, "what_to_say", a, 0)).toMatchObject({ revision: 1 })
    expect(await writeWorkbookAnswers(userB, "what_to_say", b, 0)).toMatchObject({ revision: 1 })
    const sessionTwo = await readWorkbookAnswers(userA)
    expect(sessionTwo[0].answers).toEqual(a)
    const prompt = getMayaGeneralAssistantPrompt({
      brandContext: getMayaHomeBrandContext(await getWorkbookContextForMaya(userA)),
    })
    expect(prompt).toContain("Ada makes pottery in Bergen")
    expect(prompt).not.toContain("Bea teaches yoga")
    const updates = await Promise.all([
      writeWorkbookAnswers(userA, "what_to_say", [{ ...a[0], value: "Updated pottery offer" }], 1),
      writeWorkbookAnswers(userA, "what_to_say", [{ ...a[0], value: "Competing edit" }], 1),
    ])
    expect(updates.filter(Boolean)).toHaveLength(1)
    expect(updates.filter(value => value === null)).toHaveLength(1)
    expect(await writeWorkbookAnswers(userA, "what_to_say", [], 2)).toMatchObject({ revision: 3 })
    expect((await readWorkbookAnswers(userA))[0].answers).toEqual([])
    expect(await getWorkbookContextForMaya(userA)).not.toContain("Ada makes pottery")
    expect((await readWorkbookAnswers(userB))[0].answers).toEqual(b)
    // These synthetic rows live only in the expiring test branch.
  })
})
