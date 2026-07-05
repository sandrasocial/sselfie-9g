// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

import {
  generateTrialDay0Email,
  generateTrialDay3Email,
  generateTrialNoFirstImageEmail,
  TRIAL_DAY3_EMAIL_TYPE,
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

    expect(email.subject).toBe("your 7 days start now. do this first")
    expect(email.text).toContain("add one clear selfie")
    expect(email.text).toContain("Not an AI stranger. You, on your best day.")
    expect(email.text).toContain("Make my first photo:")
    expect(email.text).toContain("photos you'd actually post")
  })

  it("renders the no-first-image nudge as reassurance plus a single clear action", () => {
    const email = generateTrialNoFirstImageEmail({
      customerName: "Sandra",
      customerEmail: "sandra@example.com",
    })

    expect(email.subject).toBe("two minutes, love. that's all this takes")
    expect(email.text).toContain("haven't made a photo yet")
    expect(email.text).toContain("You don't need a better selfie.")
    expect(email.text).toContain("stays recognizably you")
    expect(email.text).toContain("Add my selfie:")
    expect(email.text).toContain("doesn't need to be perfect. It just needs to exist.")
  })

  it("sends the day-3 momentum email only to activated trials, once, outside the day-5 window", () => {
    const email = generateTrialDay3Email({
      customerName: "Sandra",
      customerEmail: "sandra@example.com",
    })

    expect(email.subject).toBe("did you post one yet?")
    expect(email.text).toContain("pick the one that feels most like you and post it today")
    expect(email.text).toContain('"this doesn\'t feel like me"')
    expect(email.text).toContain("But today, just post one.")

    const route = read("app/api/cron/suite-trial-expiry/route.ts")
    expect(TRIAL_DAY3_EMAIL_TYPE).toBe("suite_trial_day3_post_one")
    expect(route).toContain("generateTrialDay3Email")
    expect(route).toContain("alreadyEmailed(trial.email, TRIAL_DAY3_EMAIL_TYPE)")
    // Positive activation gate: EXISTS trial_first_generation (the nudge uses NOT EXISTS).
    expect(route).toContain("AND EXISTS (")
    // Day-5 window exclusion so nobody gets two lifecycle emails at once.
    expect(route.split("s.trial_ends_at > NOW() + INTERVAL '2 days'").length).toBe(3)
    expect(route).toContain("s.created_at <= NOW() - INTERVAL '3 days'")
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
    expect(appPage).toContain("trialHasSeenFirstRunStep")
    expect(appPage).toContain("FROM ai_images")
    expect(appPage).toContain("FROM user_avatar_images")
    expect(appPage).toContain("suite_trial_first_run_seen")
    expect(shell).toContain("showTrialFirstRunStep")
    expect(shell).toContain(
      'accessLevel === "trial" &&'
    )
    expect(shell).toContain("!trialHasSeenFirstRunStep")
    expect(shell).toContain("trialHasSavedSelfie={trialHasSavedSelfie}")
    expect(shell).toContain("trialHasSeenFirstRunStep={trialHasSeenFirstRunStep}")
    expect(shell).toContain("analyticsCohort={analyticsCohort}")
    expect(shell).toContain("analyticsCohort={cohort}")
    expect(frontDoor).toContain("FIRST_RUN_SEEN_KEY")
    expect(frontDoor).toContain("markFirstRunSeen()")
    expect(frontDoor).toContain('event: "suite_trial_first_run_seen"')
    expect(frontDoor).toContain("Hi, I'm Maya. Let's make your first photo.")
    expect(frontDoor).toContain("Add one clear selfie and I'll keep your real face")
    expect(frontDoor).toContain("Add my selfie")
    expect(concierge).toContain("For best results")
    expect(concierge).toContain("one full-body shot and one side profile")
    expect(concierge).toContain("All optional.")
  })
})
