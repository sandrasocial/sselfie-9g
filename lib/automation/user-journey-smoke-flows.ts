export type JourneySmokeFlow =
  | {
      name: string
      landingPath: string
      expectedTitle: RegExp
      trigger: {
        type: "href"
        href: string
      }
    }
  | {
      name: string
      landingPath: string
      expectedTitle: RegExp
      trigger: {
        type: "button"
        name: string
      }
    }

export const USER_JOURNEY_SMOKE_FLOWS: JourneySmokeFlow[] = [
  {
    name: "Selfie Guide",
    landingPath: "/selfie-guide",
    expectedTitle: /Selfie Guide/i,
    trigger: {
      type: "href",
      href: "/checkout/selfie-guide?plan=guide",
    },
  },
  {
    name: "Brand Strategy",
    landingPath: "/brand-strategy",
    expectedTitle: /Brand Strategy/i,
    trigger: {
      type: "href",
      href: "/checkout/brand-strategy-pack",
    },
  },
  {
    name: "Studio Membership",
    landingPath: "/checkout/membership",
    expectedTitle: /SSELFIE/i,
    trigger: {
      type: "button",
      name: "Continue to checkout",
    },
  },
]
