// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import {
  generateTrialDay0Email,
  generateTrialNoFirstImageEmail,
} from "@/lib/email/templates/suite-trial"

const ROOT = process.cwd()

function read(relativePath: string) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8")
}

describe("SUITE trial first-image activation", () => {
  it("makes the day-0 email lead with adding one selfie", () => {
    const email = generateTrialDay0Email({
      customerName: "Sandra",
      customerEmail: "sandra@example.com",
    })

    expect(email.subject).toBe("You're in. Here's step one 🤍")
    expect(email.text).toContain("Step 1 is simple: add one clear selfie.")
    expect(email.text).toContain("Maya can keep it looking like you")
    expect(email.text).toContain("AI should not erase you. It should frame you.")
    expect(email.text).not.toContain("Pick a look. Maya pulls three concepts")
  })

  it("renders the no-first-image nudge as a single clear action", () => {
    const email = generateTrialNoFirstImageEmail({
      customerName: "Sandra",
      customerEmail: "sandra@example.com",
    })

    expect(email.subject).toContain("make your first photo")
    expect(email.text).toContain("You haven't made your first photo yet")
    expect(email.text).toContain("add one clear selfie")
    expect(email.text).toContain("doesn't need to be perfect")
    expect(email.text).toContain("Open your Studio:")
  })

  it("pins the cron guard: no nudge after trial_first_generation", () => {
    const route = read("app/api/cron/suite-trial-expiry/route.ts")

    expect(route).toContain("suite_trial_no_first_image")
    expect(route).toContain("trial_first_generation")
    expect(route).toContain("NOT EXISTS")
    expect(route).toContain("ae.event_name = 'trial_first_generation'")
    expect(route).toContain('alreadyEmailed(trial.email, "suite_trial_no_first_image")')
  })

  it("shows the first-run selfie step only for trials with zero generated images", () => {
    const appPage = read("app/app/page.tsx")
    const shell = read("components/app-v3/app-v3-shell.tsx")
    const frontDoor = read("components/app-v3/visual-front-door.tsx")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(appPage).toContain("trialHasGeneratedImages")
    expect(appPage).toContain("trialHasSavedSelfie")
    expect(appPage).toContain("FROM ai_images")
    expect(appPage).toContain("FROM user_avatar_images")
    expect(shell).toContain("showTrialFirstRunStep")
    expect(shell).toContain(
      'accessLevel === "trial" && !trialHasGeneratedImages && !trialHasSavedSelfie'
    )
    expect(frontDoor).toContain("Hi, I'm Maya. Let's make your first photo.")
    expect(frontDoor).toContain("Add my selfie")
    expect(concierge).toContain("For best results")
    expect(concierge).toContain("one full-body shot and one side profile")
    expect(concierge).toContain("All optional.")
  })
})
