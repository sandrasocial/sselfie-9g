export type JourneySmokeFlow = {
  name: string
  landingPath: string
  expectedTitle: RegExp
  trigger:
    | { type: "href"; href: string }
    | { type: "button"; name: string }
    /** Land on `landingPath` for title checks, then open this path (server redirect → Stripe checkout). */
    | { type: "goto"; href: string }
}

export const USER_JOURNEY_SMOKE_FLOWS: JourneySmokeFlow[] = [
  {
    name: "Selfie Guide",
    landingPath: "/selfie-guide",
    expectedTitle: /Free Guide|First Visible Post/i,
    trigger: {
      type: "goto",
      href: "/checkout/selfie-guide",
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
      type: "goto",
      href: "/checkout/membership?interval=month",
    },
  },
]
