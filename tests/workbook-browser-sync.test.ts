// @vitest-environment node
import { readFileSync } from "node:fs"
import { JSDOM, VirtualConsole } from "jsdom"
import { afterEach, describe, expect, it, vi } from "vitest"

const windows: JSDOM[] = []
afterEach(() => {
  windows.forEach(dom => dom.window.close())
  windows.length = 0
})

async function openWorkbook(
  productId: string,
  options: {
    answers?: unknown[]
    legacy?: object
    userId?: string
    failSave?: number
    pending?: object
  } = {}
) {
  const dom = new JSDOM(readFileSync(`server/academy-workbooks/${productId}/index.html`, "utf8"), {
    url: `https://sselfie.ai/academy/${productId}`,
    runScripts: "outside-only",
    virtualConsole: new VirtualConsole(),
  })
  windows.push(dom)
  const w = dom.window as any
  const css = w.document.createElement("style")
  css.textContent = readFileSync("public/academy-workbook-wizard.css", "utf8")
  w.document.head.appendChild(css)
  w.SSELFIE_WORKBOOK_USER = "member-a"
  w.scrollTo = () => {}
  w.confirm = () => true
  if (options.legacy)
    w.localStorage.setItem(
      `sselfie-workbook-wizard:${productId}:v1`,
      JSON.stringify({ values: options.legacy })
    )
  if (options.pending)
    w.localStorage.setItem(
      `sselfie-workbook:member-a:${productId}`,
      JSON.stringify(options.pending)
    )
  const fetch = vi.fn(async (_url: string, init: any) => {
    if (_url === "/api/academy/visibility-suite/workbook")
      return { ok: false, status: 503, json: async () => ({ error: "PDF generation unavailable" }) }
    if (init.method === "PUT")
      return {
        ok: !options.failSave,
        status: options.failSave || 200,
        json: async () => (options.failSave ? { error: "Not saved for Maya" } : { revision: 2 }),
      }
    return {
      ok: true,
      json: async () => ({
        userId: options.userId || "member-a",
        workbook: { revision: 1, answers: options.answers || [], source: "answers" },
      }),
    }
  })
  w.fetch = fetch
  // Execute the real inline workbook code followed by both real shared scripts.
  for (const script of Array.from(
    w.document.querySelectorAll("script:not([src])")
  ) as HTMLScriptElement[])
    w.eval(script.textContent || "")
  w.eval(readFileSync("public/academy-workbook-sync.js", "utf8"))
  w.eval(readFileSync("public/academy-workbook-wizard.js", "utf8"))
  await new Promise<void>(resolve => w.addEventListener("DOMContentLoaded", () => resolve()))
  await new Promise(resolve => setTimeout(resolve, 0))
  return { w, fetch }
}

describe("real workbook HTML + guided wizard + member save", () => {
  it("keeps the save status and legacy review visible under the real workbook CSS", async () => {
    const { w } = await openWorkbook("what_to_say", {
      answers: [{ key: "legacy_99", label: "Earlier answer", value: "Keep this visible" }],
    })
    const status = w.document.querySelector('[role="status"]')
    expect(w.getComputedStyle(status).display).not.toBe("none")
    expect(status.closest(".sw-shell")).not.toBeNull()
    const previous = w.document.querySelector(".sw-workbook-older textarea")
    expect(previous.value).toBe("Keep this visible")
    previous.value = ""
    previous.dispatchEvent(new w.Event("input", { bubbles: true }))
    expect(w.SSELFIE_WORKBOOK_SYNC.getAnswers().find((a: any) => a.key === "legacy_99").value).toBe(
      ""
    )
  })
  it("saves answers before PDF generation and retains them when generation fails", async () => {
    const { w, fetch } = await openWorkbook("what_to_say")
    const field = w.document.querySelector("textarea")
    field.value = "My actual answer"
    field.dispatchEvent(new w.Event("input", { bubbles: true }))
    await w.runMayaAction("generate")
    const writes = fetch.mock.calls.filter(call => ["PUT", "POST"].includes(call[1].method))
    expect(writes.map(call => call[1].method)).toEqual(["PUT", "POST"])
    expect(w.document.getElementById("maya-status").textContent).toContain(
      "PDF generation unavailable"
    )
    expect(w.document.querySelector('[role="status"]').textContent).toContain(
      "Saved to your account"
    )
    expect(
      JSON.parse(writes[0][1].body).answers.some((a: any) => a.value === "My actual answer")
    ).toBe(true)
  })
  it("preserves the meaning of all five message-pillar answers after the wizard moves the fields", async () => {
    const { w } = await openWorkbook("what_to_say")
    const answers = w.SSELFIE_WORKBOOK_SYNC.getAnswers()
    expect(
      [10, 11, 12, 13, 14].map(i => answers.find((a: any) => a.key === `q${i}f0`).label)
    ).toEqual(["Your Story", "Your Expertise", "Your Values", "Your Vision", "Your Voice"])
  })
  it.each(["what_to_say", "show_up", "get_paid"])(
    "saves all %s fields, including the last field, and updates without model generation",
    async productId => {
      const { w, fetch } = await openWorkbook(productId)
      const fields = Array.from(
        w.document.querySelectorAll("[data-workbook-key]")
      ) as HTMLInputElement[]
      expect(fields.length).toBeGreaterThan(10)
      for (const field of fields) {
        field.value = "Answer for " + field.dataset.workbookKey
        field.dispatchEvent(new w.Event("input", { bubbles: true }))
      }
      await w.SSELFIE_WORKBOOK_SYNC.flush()
      const puts = fetch.mock.calls.filter(call => call[1].method === "PUT")
      expect(puts).toHaveLength(1)
      const body = JSON.parse(puts[0][1].body)
      expect(body.userId).toBe("member-a")
      expect(body.answers).toHaveLength(fields.length)
      expect(new Set(body.answers.map((a: any) => a.key)).size).toBe(fields.length)
      expect(body.answers.at(-1).value).toBe("Answer for " + fields.at(-1)!.dataset.workbookKey)
      expect(w.document.querySelector('[role="status"]').textContent).toContain(
        "Saved to your account"
      )
      expect(
        fetch.mock.calls.every(call => call[0].startsWith("/api/academy/workbook-answers"))
      ).toBe(true)
      fields[0].value = "Updated offer"
      fields[0].dispatchEvent(new w.Event("input", { bubbles: true }))
      await w.SSELFIE_WORKBOOK_SYNC.flush()
      const updated = JSON.parse(fetch.mock.calls.at(-1)![1].body)
      expect(updated.revision).toBe(2)
      expect(updated.answers.find((a: any) => a.key === fields[0].dataset.workbookKey).value).toBe(
        "Updated offer"
      )
    }
  )
  it("loads server answers instead of silently importing an ownerless browser draft", async () => {
    const { w, fetch } = await openWorkbook("what_to_say", {
      answers: [{ key: "q6f0", label: "Story", value: "Server story" }],
      legacy: { q6f0: "Other member" },
    })
    expect(w.document.querySelector('[data-workbook-key="q6f0"]').value).toBe("Server story")
    expect(
      Array.from(w.document.querySelectorAll("textarea")).some(
        (field: any) => field.value === "Other member"
      )
    ).toBe(false)
    expect(fetch.mock.calls.filter(call => call[1].method === "PUT")).toHaveLength(0)
    expect(w.localStorage.getItem("sselfie-workbook-wizard:what_to_say:v1")).toContain(
      "Other member"
    )
  })
  it("does not load one account's answers into a stale page belonging to another", async () => {
    const { w, fetch } = await openWorkbook("what_to_say", {
      userId: "member-b",
      answers: [{ key: "q6f0", label: "Story", value: "Private B" }],
    })
    expect(w.SSELFIE_WORKBOOK_SYNC.isReady()).toBe(false)
    expect(w.document.querySelector('[data-workbook-key="q6f0"]').value).toBe("")
    expect(fetch.mock.calls.filter(call => call[1].method === "PUT")).toHaveLength(0)
  })
  it.each([503, 409])(
    "preserves unsaved answers and blocks a false success on error %s",
    async failSave => {
      const { w } = await openWorkbook("what_to_say", { failSave })
      const field = w.document.querySelector("textarea")
      field.value = "Keep my words"
      field.dispatchEvent(new w.Event("input", { bubbles: true }))
      await expect(w.SSELFIE_WORKBOOK_SYNC.flush()).rejects.toThrow("Not saved")
      expect(w.document.querySelector('[role="status"]').textContent).not.toContain(
        "Saved to your account"
      )
      expect(w.localStorage.getItem("sselfie-workbook:member-a:what_to_say")).toContain(
        "Keep my words"
      )
      expect(w.SSELFIE_WORKBOOK_SYNC.isReady()).toBe(failSave !== 409)
    }
  )
})
