/**
 * Credit Packages Configuration
 * Part of the new simplified SSELFIE pricing model
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

// Centralized credit packages for the new pricing model
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits_50",
    name: "50 Credits",
    displayName: "50 Credits",
    credits: 50,
    priceInCents: 1200,
    description: "Perfect for a few extra photos",
  },
  {
    id: "credits_150",
    name: "150 Credits",
    displayName: "150 Credits",
    credits: 150,
    priceInCents: 3300,
    description: "Great for regular use",
    popular: true,
  },
  {
    id: "credits_500",
    name: "500 Credits",
    displayName: "500 Credits",
    credits: 500,
    priceInCents: 10000,
    description: "Best value for power users",
  },
]

export function getCreditPackageById(packageId: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((p) => p.id === packageId)
}
