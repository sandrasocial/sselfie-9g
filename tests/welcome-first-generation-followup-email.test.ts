import { describe, expect, it } from "vitest"

import { generateWelcomeFirstGenerationFollowupEmail } from "@/lib/email/templates/welcome-first-generation-followup"

describe("welcome first generation followup email", () => {
  it("nudges zero-generation users toward their first photo instead of implying one already exists", () => {
    const email = generateWelcomeFirstGenerationFollowupEmail({ firstName: "Sandra" })

    expect(email.subject).toBe("your 2 free photos are ready. try one now")
    expect(email.html).toContain("you've got <strong>2 free photos waiting for you right now</strong>")
    expect(email.html).toContain("Generate my first photo")
    expect(email.html).toContain("/app?utm_source=email&utm_medium=lifecycle&utm_campaign=free_welcome_day0")
    expect(email.text).not.toContain("Your first brand image is waiting for you inside SSELFIE.")
  })
})
