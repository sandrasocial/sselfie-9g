import type { VaultMayaMarketingEmailId } from "@/lib/email/templates/vault-maya-marketing"

export const VAULT_MAYA_LAUNCH_GOAL = 100

export const VAULT_MAYA_LAUNCH_PLANNING_SNAPSHOT = {
  asOf: "2026-08-03",
  sendableMainAudience: 7272,
  eligibleNonMemberAudience: 7256,
  currentVaultMayaBuyers: 0,
} as const

export const VAULT_MAYA_LAUNCH_DEADLINE = "Tuesday 11 August at 10:00 Oslo time"

export const VAULT_MAYA_LAUNCH_PROOF = {
  collectionName: "Golden Hour Diary",
  shotName: "Seaside Wine",
  imageUrl:
    "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/content-kit/shoots/1785423567032-23571.png",
} as const

export type VaultMayaLaunchAudience =
  | "suite-members"
  | "commerce-buyers"
  | "eligible-nonbuyers"
  | "eligible-nonmembers"
  | "high-intent-nonmembers"
  | "new-vault-members"

export interface VaultMayaLaunchStep {
  id: VaultMayaMarketingEmailId
  sequence: string
  sendWindow: string
  audience: VaultMayaLaunchAudience
  audienceLabel: string
  job: string
  stopRule: string
}

export const VAULT_MAYA_LAUNCH_STEPS: VaultMayaLaunchStep[] = [
  {
    id: "suite-included",
    sequence: "LAUNCH DAY",
    sendWindow: "First send",
    audience: "suite-members",
    audienceLabel: "SUITE members",
    job: "deliver the promised included product and get one first creation",
    stopRule: "Never include this audience in Vault Maya sales broadcasts.",
  },
  {
    id: "buyer-announcement",
    sequence: "LAUNCH DAY",
    sendWindow: "Before the main list",
    audience: "commerce-buyers",
    audienceLabel: "Prompt Vault and commerce buyers",
    job: "show the easier creation option without weakening what she already bought",
    stopRule: "Exclude SUITE access and anyone who already joined Vault Maya.",
  },
  {
    id: "list-announcement",
    sequence: "LAUNCH DAY",
    sendWindow: "Main announcement",
    audience: "eligible-nonbuyers",
    audienceLabel: "Non-buyers",
    job: "make the outcome and difference clear in one read",
    stopRule: "Exclude SUITE access, commerce buyers and Vault Maya members.",
  },
  {
    id: "inside-look",
    sequence: "DAY 1",
    sendWindow: "Morning",
    audience: "eligible-nonmembers",
    audienceLabel: "Non-members",
    job: "make the product experience easy to picture before asking for the decision again",
    stopRule: "Remove every Vault Maya buyer before the broadcast is created.",
  },
  {
    id: "proof",
    sequence: "DAY 3",
    sendWindow: "Morning",
    audience: "eligible-nonmembers",
    audienceLabel: "Non-members",
    job: "show one approved later photo from the newest Vault collection instead of adding more claims",
    stopRule:
      "Use only Sandra-approved Vault imagery and describe it as the photo the member can choose to recreate; remove every Vault Maya buyer before sending.",
  },
  {
    id: "likeness",
    sequence: "DAY 4",
    sendWindow: "Morning",
    audience: "eligible-nonmembers",
    audienceLabel: "Non-members",
    job: "answer the biggest identity question honestly",
    stopRule: "Remove every Vault Maya buyer before the broadcast is created.",
  },
  {
    id: "use-cases",
    sequence: "DAY 5",
    sendWindow: "Morning",
    audience: "eligible-nonmembers",
    audienceLabel: "Non-members",
    job: "connect the membership to a photo she needs now",
    stopRule: "Remove every Vault Maya buyer before the broadcast is created.",
  },
  {
    id: "founder-close",
    sequence: "FINAL 24 HOURS",
    sendWindow: "One day before the deadline",
    audience: "eligible-nonmembers",
    audienceLabel: "Non-members",
    job: "state the real founder-price change without pressure or invented scarcity",
    stopRule: "Remove every Vault Maya buyer before the broadcast is created.",
  },
  {
    id: "founder-final-day",
    sequence: "FINAL DAY",
    sendWindow: "Morning",
    audience: "eligible-nonmembers",
    audienceLabel: "Non-members",
    job: "make the final price decision complete and easy to understand",
    stopRule: "Remove every Vault Maya buyer before the broadcast is created.",
  },
  {
    id: "founder-final-hours",
    sequence: "FINAL HOURS",
    sendWindow: "Three hours before the deadline",
    audience: "high-intent-nonmembers",
    audienceLabel: "Clicked or started checkout",
    job: "give interested women one short personal reminder",
    stopRule: "Only send to tracked interest, excluding buyers and all SUITE access.",
  },
  {
    id: "first-photo-nudge",
    sequence: "AFTER JOINING",
    sendWindow: "24 hours after purchase",
    audience: "new-vault-members",
    audienceLabel: "Members with no first photo",
    job: "help a paying member create before she loses momentum",
    stopRule: "Suppress as soon as the member completes her first Vault Maya photo.",
  },
]

export function getVaultMayaLaunchTargetMath(eligibleAudience: number) {
  const safeAudience = Math.max(0, eligibleAudience)
  return {
    targetMembers: VAULT_MAYA_LAUNCH_GOAL,
    requiredConversionRate: safeAudience > 0 ? VAULT_MAYA_LAUNCH_GOAL / safeAudience : 0,
    targetMrrUsd: VAULT_MAYA_LAUNCH_GOAL * 19,
    targetArrUsd: VAULT_MAYA_LAUNCH_GOAL * 19 * 12,
  }
}
