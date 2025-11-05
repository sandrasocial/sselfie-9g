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
