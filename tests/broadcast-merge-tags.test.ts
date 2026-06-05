// @vitest-environment node
import { describe, expect, it } from "vitest"

import {
  assertNoUnsupportedBroadcastMergeTags,
  findUnsupportedBroadcastMergeTags,
} from "@/lib/email/broadcast-preflight"

describe("broadcast merge tag validation", () => {
  it("blocks unsupported first_name placeholders before broadcast creation", () => {
    const html = "<p>Hi {{first_name}},</p>"

    expect(findUnsupportedBroadcastMergeTags(html)).toEqual([
      {
        tag: "{{first_name}}",
        index: 6,
      },
    ])
    expect(() => assertNoUnsupportedBroadcastMergeTags(html)).toThrow("{{first_name}}")
  })

  it("allows documented Resend broadcast contact and unsubscribe tags", () => {
    const html = `
      <p>Hi {{{contact.first_name|there}}},</p>
      <a href="{{{RESEND_UNSUBSCRIBE_URL}}}">Unsubscribe</a>
    `

    expect(findUnsupportedBroadcastMergeTags(html)).toEqual([])
    expect(() => assertNoUnsupportedBroadcastMergeTags(html)).not.toThrow()
  })
})
