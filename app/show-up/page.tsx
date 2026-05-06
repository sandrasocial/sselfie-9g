import type { Metadata } from "next"
import { OfferLandingPage } from "@/components/sselfie/offer-landing-page"

export const metadata: Metadata = {
  title: "Show Up | SSELFIE",
  description: "Plan what to post this week with a content rhythm that fits your actual business.",
}

export default function ShowUpPage() {
  return (
    <OfferLandingPage
      eyebrow="CONTENT"
      title="Know what to post this week."
      problem="You are not lazy. You are trying to create from scratch too often. Show Up gives your message a rhythm so content stops feeling random."
      promise="A practical content workbook for planning posts that connect your message, your proof, and your offer."
      productId="show_up"
      offerSlug="show-up"
      ctaKeyword="CONTENT"
      price="€67"
      checkoutHref="/checkout/academy-product/show_up"
      outcomes={[
        "A weekly rhythm you can actually keep.",
        "Post ideas tied to your message and offer.",
        "A simple plan for showing up without starting over every Monday.",
      ]}
      steps={[
        { title: "Pick the rhythm", body: "Choose how often you can post without burning out." },
        { title: "Choose the angles", body: "Map what people need to believe before they buy." },
        { title: "Plan the week", body: "Leave with your next posts in a clear order." },
      ]}
      bestFor={[
        "You keep disappearing because planning takes too much energy.",
        "You have ideas, but they do not connect to a buyer path.",
        "You want content that supports sales without sounding pushy.",
      ]}
      nextStep={{
        title: "Ready to sell from it?",
        body: "Show Up gives you the rhythm. Get Paid gives that rhythm a clear path from post to buyer.",
        href: "/get-paid",
        label: "Go To Get Paid",
      }}
    />
  )
}
