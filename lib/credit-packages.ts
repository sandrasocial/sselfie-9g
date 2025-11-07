/**
 * Credit Packages Configuration
 * Part of the new simplified SSELFIE pricing model
 *
 * Pricing Strategy:
 * - Main products (One-Time & Membership) offer BEST value
 * - Top-ups use tiered value system to encourage larger purchases
 * - Creates accessible emergency top-ups while rewarding bulk purchases
 */

export interface CreditPackage {
  id: string
  name: string
  displayName?: string
  credits: number
  priceInCents: number
  description: string
  popular?: boolean
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_50",
    name: "50 Credits",
    displayName: "50 Credits",
    credits: 50,
    priceInCents: 2500, // $25 for 50 = $0.50/credit - Quick emergency top-up
    description: "Quick top-up for a few more sessions",
  },
  {
    id: "credits_150",
    name: "150 Credits",
    displayName: "150 Credits",
    credits: 150,
    priceInCents: 6000, // $60 for 150 = $0.40/credit - Better value tier
    description: "Great value for continued creation",
    popular: true,
  },
  {
    id: "credits_300",
    name: "300 Credits",
    displayName: "300 Credits",
    credits: 300,
    priceInCents: 10500, // $105 for 300 = $0.35/credit - Best top-up deal
    description: "Maximum value for power users",
  },
]

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId)
}
