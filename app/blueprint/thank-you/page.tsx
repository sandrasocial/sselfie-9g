import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Free Brand Blueprint Thank You | SSELFIE Studio",
  description:
    "Your Brand Blueprint is on its way. Download it now and start building a powerful personal brand.",
  openGraph: {
    title: "Your Brand Blueprint Is On Its Way!",
    description:
      "Download your free brand blueprint designed for women building powerful personal brands.",
    url: "https://sselfie.ai/blueprint/thank-you",
    type: "website",
    images: [
      {
        url: "/images/2-20-281-29.png",
        width: 1200,
        height: 630,
        alt: "SSELFIE Brand Blueprint",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Your Brand Blueprint Is On Its Way!",
    description:
      "Download your free brand blueprint designed for women building powerful personal brands.",
    images: ["/images/2-20-281-29.png"],
  },
}

export default function BlueprintThankYouPage({
  searchParams,
}: {
  searchParams?: { token?: string }
}) {
  const token = searchParams?.token
  const directLink = token ? `/freebie/selfie-guide/access/${token}` : null

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl w-full text-center">
        <h1
          className="text-3xl md:text-5xl font-light tracking-[0.18em] uppercase text-stone-950 mb-4"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          Your Brand Blueprint Is On Its Way!
        </h1>
        <p className="text-stone-700 font-light leading-relaxed mb-6 md:mb-8">
          We just emailed your download link. It may take a minute — be sure to check your spam folder.
        </p>

        {directLink ? (
          <Link
            href={directLink}
            className="inline-block border border-stone-900 px-6 py-3 text-xs md:text-sm tracking-[0.18em] uppercase hover:bg-stone-900 hover:text-white transition-colors"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            Download Now →
          </Link>
        ) : (
          <div className="inline-flex items-center gap-3">
            <span className="text-xs md:text-sm text-stone-600 font-light">
              Didn’t get the email?
            </span>
            <Link
              href="/blueprint"
              className="text-xs md:text-sm underline underline-offset-4 text-stone-900"
            >
              Try again
            </Link>
          </div>
        )}

        <div className="mt-10 md:mt-12 rounded-xl bg-white border border-stone-200 p-6 md:p-8">
          <h2
            className="text-xl md:text-2xl font-light tracking-[0.12em] uppercase text-stone-950 mb-2"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            Ready to build your brand visually?
          </h2>
          <p className="text-stone-700 font-light leading-relaxed mb-4">
            Join SSELFIE Studio for AI-powered photos, feed planning, and Maya — your personal brand strategist.
          </p>
          <Link
            href="/checkout/membership"
            className="inline-block bg-stone-950 text-white px-6 py-3 text-xs md:text-sm tracking-[0.18em] uppercase hover:bg-stone-800 transition-colors"
          >
            Join SSELFIE Studio
          </Link>
        </div>
      </div>
    </div>
  )
}


