import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ sql: Object.assign(vi.fn(), { transaction: vi.fn() }) }))
vi.mock("@/lib/db/client", () => ({ sql: mocks.sql }))
vi.mock("@/lib/resend/api-key", () => ({ getResendApiKey: () => "test-key" }))
import { inboundAddress, correspondenceAddresses, isAutomaticReply, receiveCustomerEmail, markCustomerEmailAnswered } from "@/lib/email/received-email"

const id = "11111111-2222-4333-8444-555555555555"
const event = { email_id: id, from: "Customer <customer@example.com>", to: ["hello@sselfie.ai"] }
const message = { id, from: event.from, subject: "Can Maya help with my photos?", text: "My question", headers: {}, created_at: "2026-09-06T12:00:00Z" }

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => message }))
  mocks.sql.mockResolvedValue([])
  mocks.sql.transaction.mockResolvedValue([[], []])
})

describe("customer email replies", () => {
  it("recognizes Google's documented mail-domain alias without combining other inboxes", () => {
    expect(correspondenceAddresses("customer@googlemail.com")).toEqual(["customer@googlemail.com", "customer@gmail.com"])
    expect(correspondenceAddresses("customer@gmail.com")).toEqual(["customer@gmail.com", "customer@googlemail.com"])
    expect(correspondenceAddresses("customer@example.com")).toEqual(["customer@example.com"])
    expect(correspondenceAddresses("customer+tag@gmail.com")[0]).toBe("customer+tag@gmail.com")
  })

  it("normalizes a display-name address and rejects header injection", () => {
    expect(inboundAddress("Customer <PERSON@EXAMPLE.COM>")).toBe("person@example.com")
    expect(inboundAddress("person@example.com\r\nBcc: victim@example.com")).toBeNull()
    expect(inboundAddress("https://example.com")).toBeNull()
  })

  it("filters automatic replies case-insensitively without treating ordinary replies as automated", () => {
    expect(isAutomaticReply({ headers: { "Auto-Submitted": "auto-replied" } })).toBe(true)
    expect(isAutomaticReply({ headers: { "Precedence": "bulk" } })).toBe(true)
    expect(isAutomaticReply({ subject: "Automatic reply: Thank you" })).toBe(true)
    expect(isAutomaticReply({ subject: "Re: Your question", headers: { "Auto-Submitted": "no" } })).toBe(false)
  })

  it("does not retrieve DMARC, self mail, or unknown-sender bodies", async () => {
    expect(await receiveCustomerEmail({ ...event, to: ["postmaster@sselfie.ai"] })).toMatchObject({ ignored: true })
    expect(await receiveCustomerEmail({ ...event, from: "hello@sselfie.ai" })).toMatchObject({ ignored: true })
    mocks.sql.mockResolvedValueOnce([{ known: false }])
    expect(await receiveCustomerEmail(event)).toMatchObject({ reason: "unknown_sender_kept_in_resend" })
    expect(fetch).not.toHaveBeenCalled()
    expect(mocks.sql.transaction).not.toHaveBeenCalled()
  })

  it("skips provider retries already recorded", async () => {
    mocks.sql.mockResolvedValueOnce([{ known: true }]).mockResolvedValueOnce([{ id: 5 }])
    expect(await receiveCustomerEmail(event)).toEqual({ recorded: true, duplicate: true })
    expect(fetch).not.toHaveBeenCalled()
  })

  it("accepts the published support mailbox and checks durable subscriber history", async () => {
    mocks.sql.mockResolvedValueOnce([{ known: true }]).mockResolvedValueOnce([])
    await expect(receiveCustomerEmail({ ...event, to: ["support@sselfie.ai"] })).resolves.toMatchObject({ recorded: true })
    expect(String(mocks.sql.mock.calls[0][0])).toContain("freebie_subscribers")
  })

  it("only clears a question after a delivered reply with an exact thread and recipient match", async () => {
    const delivery = { from: "Sandra <hello@sselfie.ai>", to: ["customer@example.com"], email_id: "reply-id", headers: [{ name: "In-Reply-To", value: "<inbound@example.com>" }] }
    await markCustomerEmailAnswered("email.sent", delivery)
    await markCustomerEmailAnswered("email.bounced", delivery)
    await markCustomerEmailAnswered("email.delivered", { ...delivery, headers: [] })
    await markCustomerEmailAnswered("email.delivered", { ...delivery, from: "outsider@example.com" })
    expect(mocks.sql).not.toHaveBeenCalled()
    await markCustomerEmailAnswered("email.delivered", delivery)
    const args = mocks.sql.mock.calls[0]
    expect(String(args[0])).toContain("status = 'answered'")
    expect(String(args[0])).toContain("metadata->>'message_id'")
    expect(String(args[0])).toContain("metadata->>'sender_email'")
    expect(args).toContain("<inbound@example.com>")
    expect(args).toContainEqual(["customer@example.com"])
  })

  it("stores bounded plain text in the existing event log using a serialized transaction", async () => {
    mocks.sql.mockResolvedValueOnce([{ known: true }]).mockResolvedValueOnce([])
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ ...message, text: "x".repeat(10000), html: "<script>bad</script>", raw: { download_url: "https://signed.example" } }) } as Response)
    expect(await receiveCustomerEmail(event)).toEqual({ recorded: true, automated: false })
    expect(fetch).toHaveBeenCalledWith(`https://api.resend.com/emails/receiving/${id}`, expect.anything())
    const insertArgs = mocks.sql.mock.calls.find(args => String(args[0]).includes("INSERT INTO email_events"))!
    const metadata = JSON.parse(insertArgs.find(value => typeof value === "string" && value.startsWith('{"provider"')))
    expect(metadata.text).toHaveLength(6000)
    expect(metadata).toMatchObject({ direction: "inbound", untrusted_content: true, sender_email: "customer@example.com" })
    expect(metadata).not.toHaveProperty("html")
    expect(metadata).not.toHaveProperty("raw")
    expect(mocks.sql.transaction).toHaveBeenCalledWith(expect.any(Array), { isolationLevel: "ReadCommitted" })
    expect(insertArgs).toContain("needs_reply")
  })

  it("marks automatic responses ignored instead of putting them in the reply queue", async () => {
    mocks.sql.mockResolvedValueOnce([{ known: true }]).mockResolvedValueOnce([])
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ ...message, headers: { "Auto-Submitted": "auto-replied" } }) } as Response)
    expect(await receiveCustomerEmail(event)).toMatchObject({ automated: true })
    expect(mocks.sql.mock.calls.find(args => String(args[0]).includes("INSERT INTO email_events"))).toContain("ignored")
  })

  it("fails for provider errors or mismatched identity, allowing webhook retries", async () => {
    mocks.sql.mockResolvedValueOnce([{ known: true }]).mockResolvedValueOnce([])
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 503 } as Response)
    await expect(receiveCustomerEmail(event)).rejects.toThrow("503")
    expect(mocks.sql.transaction).not.toHaveBeenCalled()
    mocks.sql.mockResolvedValueOnce([{ known: true }]).mockResolvedValueOnce([])
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true, json: async () => ({ ...message, from: "different@example.com" }) } as Response)
    await expect(receiveCustomerEmail(event)).rejects.toThrow("identity mismatch")
  })

  it("dispatches incoming email only after signature verification, before outgoing attribution", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/api/webhooks/resend/route.ts"), "utf8")
    const handler = source.slice(source.indexOf("export async function POST"))
    expect(handler.indexOf("verifyWebhook(request, payload)")).toBeLessThan(handler.indexOf("receiveCustomerEmail(body.data)"))
    expect(handler.indexOf("receiveCustomerEmail(body.data)")).toBeLessThan(handler.indexOf("buildContext(body)"))
  })
})
