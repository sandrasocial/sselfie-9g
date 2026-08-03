import { describe, expect, it } from "vitest"

import {
  generateVaultMayaBuyerAnnouncementEmail,
  generateVaultMayaFirstPhotoNudgeEmail,
  generateVaultMayaFounderCloseEmail,
  generateVaultMayaFounderFinalDayEmail,
  generateVaultMayaFounderFinalHoursEmail,
  generateVaultMayaInsideLookEmail,
  generateVaultMayaLikenessEmail,
  generateVaultMayaListAnnouncementEmail,
  generateVaultMayaProofEmail,
  generateVaultMayaSuiteIncludedEmail,
  generateVaultMayaUseCasesEmail,
} from "@/lib/email/templates/vault-maya-marketing"
import {
  getVaultMayaLaunchTargetMath,
  VAULT_MAYA_LAUNCH_PLANNING_SNAPSHOT,
  VAULT_MAYA_LAUNCH_PROOF,
  VAULT_MAYA_LAUNCH_STEPS,
} from "@/lib/email/campaigns/vault-maya-launch-plan"

const bannedPhrases = [
  "stranger with your haircut",
  "my style. your face",
  "ready to wear",
  "the engine i built",
  "she frames you",
  "30 seconds",
]

describe("Vault Maya email marketing drafts", () => {
  const suite = generateVaultMayaSuiteIncludedEmail({ firstName: "Sandra" })
  const buyer = generateVaultMayaBuyerAnnouncementEmail({ firstName: "Sandra" })
  const list = generateVaultMayaListAnnouncementEmail({ firstName: "Sandra" })
  const inside = generateVaultMayaInsideLookEmail({ firstName: "Sandra" })
  const proof = generateVaultMayaProofEmail({ firstName: "Sandra" })
  const likeness = generateVaultMayaLikenessEmail({ firstName: "Sandra" })
  const useCases = generateVaultMayaUseCasesEmail({ firstName: "Sandra" })
  const close = generateVaultMayaFounderCloseEmail({
    firstName: "Sandra",
    founderDeadline: "Tuesday 11 August at 10:00 Oslo time",
  })
  const finalDay = generateVaultMayaFounderFinalDayEmail({
    firstName: "Sandra",
    founderDeadline: "Tuesday 11 August at 10:00 Oslo time",
  })
  const finalHours = generateVaultMayaFounderFinalHoursEmail({
    firstName: "Sandra",
    founderDeadline: "Tuesday 11 August at 10:00 Oslo time",
  })
  const nudge = generateVaultMayaFirstPhotoNudgeEmail({ firstName: "Sandra" })
  const marketingEmails = [
    suite,
    buyer,
    list,
    inside,
    proof,
    likeness,
    useCases,
    close,
    finalDay,
    finalHours,
  ]
  const allEmails = [...marketingEmails, nudge]

  it("keeps SUITE inclusion separate from the paid offer", () => {
    expect(suite.html).toContain("There is nothing extra to buy")
    expect(suite.html).toContain("/vault-maya/studio")
    expect(suite.html).not.toContain("$19")
    expect(suite.html).not.toContain("$29")
  })

  it("protects the Prompt Vault in the buyer announcement", () => {
    expect(buyer.html).toContain("Your Prompt Vault is still yours forever")
    expect(buyer.html).toContain("another way to create the same looks")
    expect(buyer.html).not.toContain("Stop pasting")
  })

  it("states the current offer without inventing a deadline", () => {
    expect(list.html).toContain("Founder price: $19/month")
    expect(list.html).toContain("$29/month for new members")
    expect(list.html).toContain("for as long as your membership stays active")
    expect(list.html).not.toMatch(/August|September|tomorrow/i)
  })

  it("requires real proof before the proof email can be sent", () => {
    expect(proof.html).toContain("PROOF IMAGE NEEDED")
    expect(proof.text).toContain("add one approved real Vault Maya result")
  })

  it("uses the approved later photo from the newest collection", () => {
    const approvedProof = generateVaultMayaProofEmail({
      collectionName: VAULT_MAYA_LAUNCH_PROOF.collectionName,
      proofImageUrl: VAULT_MAYA_LAUNCH_PROOF.imageUrl,
    })

    expect(approvedProof.html).toContain("Golden Hour Diary")
    expect(approvedProof.html).toContain("1785423567032-23571.png")
    expect(approvedProof.html).not.toContain("PROOF IMAGE NEEDED")
    expect(approvedProof.text).toContain("Maya creates your version")
  })

  it("shows the real product journey before the proof and objection emails", () => {
    expect(inside.html).toContain("The photo you choose already gives Maya that direction")
    expect(inside.html).toContain("Your finished photos stay together in your own gallery")
    expect(likeness.html).toContain("add up to four clear photos")
    expect(likeness.html).toContain("It is not used as your identity")
  })

  it("connects the membership to immediate useful photo jobs", () => {
    expect(useCases.html).toContain("a new profile photo")
    expect(useCases.html).toContain("Fresh photos for your content")
    expect(useCases.html).toContain("a beautiful photo of yourself")
  })

  it("uses the exact supplied founder deadline in the close email", () => {
    expect(close.html).toContain("Tuesday 11 August at 10:00 Oslo time")
    expect(close.html).toContain("Vault Maya will stay open")
    expect(finalDay.html).toContain("Tuesday 11 August at 10:00 Oslo time")
    expect(finalHours.html).toContain("Tuesday 11 August at 10:00 Oslo time")
  })

  it("uses the final-hours email only for tracked interest", () => {
    const finalHoursStep = VAULT_MAYA_LAUNCH_STEPS.find(step => step.id === "founder-final-hours")
    expect(finalHoursStep?.audience).toBe("high-intent-nonmembers")
    expect(finalHoursStep?.stopRule).toContain("excluding buyers and all SUITE access")
  })

  it("removes buyers from every post-announcement sales step", () => {
    const salesFollowups = VAULT_MAYA_LAUNCH_STEPS.filter(step =>
      [
        "inside-look",
        "proof",
        "likeness",
        "use-cases",
        "founder-close",
        "founder-final-day",
        "founder-final-hours",
      ].includes(step.id)
    )
    for (const step of salesFollowups) expect(step.stopRule.toLowerCase()).toContain("buyer")
  })

  it("models the 100-member launch target without presenting it as proof", () => {
    const target = getVaultMayaLaunchTargetMath(
      VAULT_MAYA_LAUNCH_PLANNING_SNAPSHOT.eligibleNonMemberAudience
    )
    expect(target.targetMembers).toBe(100)
    expect(target.requiredConversionRate).toBeCloseTo(0.01377, 4)
    expect(target.targetMrrUsd).toBe(1900)
    expect(target.targetArrUsd).toBe(22800)
  })

  it("keeps the first-photo nudge focused on activation", () => {
    expect(nudge.html).toContain("Create my first photo")
    expect(nudge.html).not.toContain("$19")
    expect(nudge.html).not.toContain("$29")
  })

  it("includes unsubscribe handling in every marketing broadcast", () => {
    for (const email of marketingEmails) {
      expect(email.html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}")
      expect(email.text).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}")
    }
  })

  it("keeps rejected and unsupported wording out of every draft", () => {
    for (const email of allEmails) {
      const copy = `${email.subject} ${email.html} ${email.text}`.toLowerCase()
      for (const phrase of bannedPhrases) expect(copy).not.toContain(phrase)
    }
  })

  it("uses one tracked Vault Maya destination per email", () => {
    expect(buyer.html).toContain("utm_campaign=vault_maya_launch_buyers")
    expect(list.html).toContain("utm_campaign=vault_maya_launch_list")
    expect(proof.html).toContain("utm_campaign=vault_maya_launch_proof")
    expect(close.html).toContain("utm_campaign=vault_maya_launch_close")
    expect(inside.html).toContain("utm_campaign=vault_maya_launch_inside")
    expect(likeness.html).toContain("utm_campaign=vault_maya_launch_likeness")
    expect(useCases.html).toContain("utm_campaign=vault_maya_launch_use_cases")
    expect(finalDay.html).toContain("utm_campaign=vault_maya_launch_final_day")
    expect(finalHours.html).toContain("utm_campaign=vault_maya_launch_final_hours")
    expect(suite.html).toContain("utm_campaign=vault_maya_suite_included")
    expect(nudge.html).toContain("utm_campaign=vault_maya_first_photo_nudge")
  })
})
