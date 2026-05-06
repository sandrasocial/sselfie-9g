import type { Metadata } from "next"
import { OfferLandingPage } from "@/components/sselfie/offer-landing-page"

export const metadata: Metadata = {
  title: "What To Say | SSELFIE",
  description: "Make your offer easier to understand so people know why they should buy from you.",
}

export default function WhatToSayPage() {
  return (
    <OfferLandingPage
      eyebrow="SAY"
      title="Make your offer easier to understand."
      problem="People can see your content and still not understand what you do, who it is for, or why it matters now. That is a message problem, not a motivation problem."
      promise="A focused message workbook for turning vague content into one clear offer line, hooks, and CTAs."
      productId="what_to_say"
      offerSlug="what-to-say"
      ctaKeyword="SAY"
      price="€47"
      checkoutHref="/checkout/academy-product/what_to_say"
      outcomes={[
        "A simple sentence that explains what you help with.",
        "Hooks you can use when your content feels too vague.",
        "A clear CTA so people know the next step.",
      ]}
      steps={[
        { title: "Name the problem", body: "Start with the thing your buyer already feels and wants fixed." },
        { title: "Write the promise", body: "Turn your work into one clear line people can repeat." },
        { title: "Post with direction", body: "Use hooks and CTAs that lead somewhere real." },
      ]}
      bestFor={[
        "You post, but people still ask what you actually do.",
        "Your offer feels clear in your head, but vague in your content.",
        "You want one quick win before buying the full Suite.",
      ]}
      nextStep={{
        title: "Need the full path?",
        body: "What To Say is Step 01. The Visibility To Paid Suite gives you the message, content rhythm, buyer path, and Maya plan together.",
        href: "/visibility-suite",
        label: "See The Suite",
      }}
    />
  )
}
