import { TestimonialSubmissionForm } from "@/components/testimonials/testimonial-submission-form"

export const metadata = {
  title: "Share Your Story | SSELFIE",
  description: "Share your SSELFIE experience with the community",
}

export default function ShareYourStoryPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-3xl px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light tracking-wider text-stone-950 mb-4">
            SHARE YOUR STORY
          </h1>
          <p className="text-lg text-stone-600 font-light leading-relaxed max-w-2xl mx-auto">
            Your experience inspires other women to start showing up confidently online. Share your favorite SSELFIE
            moment with the community.
          </p>
        </div>

        <TestimonialSubmissionForm />
      </div>
    </div>
  )
}
