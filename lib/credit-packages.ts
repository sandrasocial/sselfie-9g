export interface CreditPackage {
  id: string
  name: string
  credits: number
  priceInCents: number
  popular?: boolean
  description: string
}

// Source of truth for all credit packages
export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "credits-25",
    name: "25 Credits",
    credits: 25,
    priceInCents: 999, // $9.99 = $0.40/credit (50% margin)
    description: "Perfect for trying out the platform",
  },
  {
    id: "credits-80",
    name: "80 Credits",
    credits: 80,
    priceInCents: 2499, // $24.99 = $0.31/credit (35% margin)
    popular: true,
    description: "Most popular - Best value",
  },
  {
    id: "credits-200",
    name: "200 Credits",
    credits: 200,
    priceInCents: 4499, // $44.99 = $0.22/credit (10% margin)
    description: "For power users",
  },
  {
    id: "credits-500",
    name: "500 Credits",
    credits: 500,
    priceInCents: 12999, // $129.99 = $0.26/credit (23% margin)
    description: "Ultimate package",
  },
]
