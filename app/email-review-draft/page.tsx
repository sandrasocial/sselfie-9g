import { notFound } from "next/navigation"

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
  VAULT_MAYA_LAUNCH_DEADLINE,
  VAULT_MAYA_LAUNCH_PLANNING_SNAPSHOT,
  VAULT_MAYA_LAUNCH_PROOF,
  VAULT_MAYA_LAUNCH_STEPS,
} from "@/lib/email/campaigns/vault-maya-launch-plan"
import {
  VaultMayaEmailReview,
  type VaultMayaEmailReviewItem,
} from "@/components/email-review/vault-maya-email-review"

export const dynamic = "force-dynamic"

export default function VaultMayaEmailReviewPage() {
  if (process.env.NODE_ENV === "production") notFound()

  const sampleName = "Sandra"
  const suite = generateVaultMayaSuiteIncludedEmail({ firstName: sampleName })
  const buyer = generateVaultMayaBuyerAnnouncementEmail({ firstName: sampleName })
  const list = generateVaultMayaListAnnouncementEmail({ firstName: sampleName })
  const inside = generateVaultMayaInsideLookEmail({ firstName: sampleName })
  const proof = generateVaultMayaProofEmail({
    firstName: sampleName,
    collectionName: VAULT_MAYA_LAUNCH_PROOF.collectionName,
    proofImageUrl: VAULT_MAYA_LAUNCH_PROOF.imageUrl,
  })
  const likeness = generateVaultMayaLikenessEmail({ firstName: sampleName })
  const useCases = generateVaultMayaUseCasesEmail({ firstName: sampleName })
  const close = generateVaultMayaFounderCloseEmail({
    firstName: sampleName,
    founderDeadline: VAULT_MAYA_LAUNCH_DEADLINE,
  })
  const finalDay = generateVaultMayaFounderFinalDayEmail({
    firstName: sampleName,
    founderDeadline: VAULT_MAYA_LAUNCH_DEADLINE,
  })
  const finalHours = generateVaultMayaFounderFinalHoursEmail({
    firstName: sampleName,
    founderDeadline: VAULT_MAYA_LAUNCH_DEADLINE,
  })
  const nudge = generateVaultMayaFirstPhotoNudgeEmail({ firstName: sampleName })

  const emails = new Map(
    [suite, buyer, list, inside, proof, likeness, useCases, close, finalDay, finalHours, nudge].map(
      email => [email.id, email]
    )
  )

  const items: VaultMayaEmailReviewItem[] = VAULT_MAYA_LAUNCH_STEPS.map(step => {
    const email = emails.get(step.id)
    if (!email) throw new Error(`Missing Vault Maya launch email: ${step.id}`)
    return {
      id: email.id,
      sequence: step.sequence,
      audience: step.audienceLabel,
      job: step.job,
      guardrail: step.stopRule,
      status: "ready",
      subject: email.subject,
      html: email.html,
    }
  })

  const targetMath = getVaultMayaLaunchTargetMath(
    VAULT_MAYA_LAUNCH_PLANNING_SNAPSHOT.eligibleNonMemberAudience
  )

  return (
    <VaultMayaEmailReview
      items={items}
      planning={{
        targetMembers: targetMath.targetMembers,
        eligibleAudience: VAULT_MAYA_LAUNCH_PLANNING_SNAPSHOT.eligibleNonMemberAudience,
        requiredConversionRate: targetMath.requiredConversionRate,
        targetMrrUsd: targetMath.targetMrrUsd,
      }}
    />
  )
}
