import type { Metadata } from "next"
import { OfferLandingPage } from "@/components/sselfie/offer-landing-page"

export const metadata: Metadata = {
  title: "Get Paid | SSELFIE",
  description: "Build a simple buyer path from your content to your first clear offer.",
}

export default function GetPaidPage() {
  return (
    <OfferLandingPage
      eyebrow="PAID"
      title="Turn visibility into a buyer path."
      problem="Views are not the same as sales. If people are watching but not buying, they may not know what the next step is."
      promise="A focused sales-path workbook for mapping one post, one keyword, one offer, and one checkout."
      productId="get_paid"
      offerSlug="get-paid"
      ctaKeyword="PAID"
      price="€97"
      checkoutHref="/checkout/academy-product/get_paid"
      outcomes={[
        "One offer people can understand quickly.",
        "One CTA keyword connected to the right landing page.",
        "A 7-day path that tells people what to buy next.",
      ]}
      steps={[
        { title: "Choose the offer", body: "Pick the offer you want your content to support now." },
        { title: "Map the path", body: "Connect post, keyword, page, checkout, and next step." },
        { title: "Sell simply", body: "Use a sales post that feels clear instead of forced." },
      ]}
      bestFor={[
        "You get attention, but your audience does not move toward buying.",
        "You have an offer, but the path to it feels messy.",
        "You want each monetization post to have one clear job.",
      ]}
      nextStep={{
        title: "Want all three steps?",
        body: "The Suite includes What To Say, Show Up, Get Paid, and your Maya Visibility Plan for the same launch price as Get Paid alone.",
        href: "/visibility-suite",
        label: "Get The Suite",
      }}
    />
  )
}
