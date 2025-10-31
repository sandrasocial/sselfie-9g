export interface CreditPackage {
  id: string
  name: string
  credits: number
  priceInCents: number
  description: string
  popular?: boolean
}

// Credit packages for one-time purchases
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits-50",
    name: "50 CREDITS",
    credits: 50,
    priceInCents: 1200, // $12 ($0.24 per credit - 20% markup)
    description: "Perfect for trying out features",
  },
  {
    id: "credits-150",
    name: "150 CREDITS",
    credits: 150,
    priceInCents: 3300, // $33 ($0.22 per credit - 10% markup)
    description: "Great for regular users",
    popular: true,
  },
  {
    id: "credits-500",
    name: "500 CREDITS",
    credits: 500,
    priceInCents: 10000, // $100 ($0.20 per credit - break even)
    description: "Best value for power users",
  },
]

// Subscription tiers with monthly credit allocations
export interface SubscriptionTier {
  id: string
  name: string
  credits: number
  priceInCents: number
  description: string
  features: string[]
  popular?: boolean
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: "starter",
    name: "STARTER",
    credits: 100,
    priceInCents: 4900, // $49/month
    description: "For beginners and side hustlers",
    features: [
      "100 credits per month",
      "Maya AI basic access",
      "Feed Designer (10 designs/month)",
      "Core Academy courses",
      "Gallery organization",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    credits: 250,
    priceInCents: 9900, // $99/month
    description: "For serious personal brands",
    features: [
      "250 credits per month",
      "Full Maya AI access",
      "Feed Designer (unlimited)",
      "Full Academy + monthly drops",
      "Priority support",
      "Early access to features",
    ],
    popular: true,
  },
  {
    id: "elite",
    name: "ELITE",
    credits: 600,
    priceInCents: 19900, // $199/month
    description: "For agencies and power users",
    features: [
      "600 credits per month",
      "Everything in Pro",
      "Team collaboration",
      "White-glove support",
      "Quarterly strategy call",
    ],
  },
]
