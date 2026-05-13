import type React from "react"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

// const _geist = Geist({ subsets: ["latin"] })
// const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://sselfie.ai"),
  title: {
    default: "SSELFIE | Selfie Education, Studio & Maya",
    template: "%s | SSELFIE",
  },
  description:
    "SSELFIE helps women move from selfie confidence to clear messaging, consistent content, and a path to paid. Start with the guide, grow through the method, and use Maya to execute weekly.",
  keywords: [
    "selfie branding",
    "visibility to paid",
    "brand photography",
    "content strategy",
    "offer clarity",
    "instagram visibility",
    "creator business",
    "personal brand education",
    "personal branding",
    "social media content",
    "maya ai assistant",
  ],
  authors: [{ name: "Sandra", url: "https://instagram.com/sandra.social" }],
  creator: "Sandra - SSELFIE",
  publisher: "SSELFIE",
  formatDetection: {
    email: true,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sselfie.ai",
    siteName: "SSELFIE",
    title: "SSELFIE - Selfie Education, Studio & Maya",
    description:
      "From selfie to strategy: build a personal brand people understand, trust, and buy from, then use Maya to execute weekly.",
    images: [
      {
        url: "https://sselfie.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "SSELFIE - AI Photography for Personal Brands",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SSELFIE - Selfie Education, Studio & Maya",
    description:
      "Selfie-first personal branding, visibility systems, and weekly execution support inside SSELFIE.",
    images: ["https://sselfie.ai/og-image.png"],
    creator: "@sandra.social",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://sselfie.ai",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SSELFIE",
  },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "any", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0d0c0b",
  interactiveWidget: "resizes-content",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  if (typeof window === "undefined") {
    console.log("[v0] Server-side env check:")
    console.log("[v0] SUPABASE_URL:", process.env.SUPABASE_URL ? "✓ Set" : "✗ Missing")
    console.log(
      "[v0] SUPABASE_VITE_PUBLIC_SUPABASE_URL:",
      process.env.SUPABASE_VITE_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing",
    )
    console.log("[v0] NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ Set" : "✗ Missing")
  }

  return (
    <html lang="en">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SSELFIE" />
        {/* SoftwareApplication schema — accurate pricing in USD, no fabricated ratings */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "SSELFIE",
              url: "https://sselfie.ai",
              applicationCategory: "PhotographyApplication",
              operatingSystem: "Web",
              description:
                "Personal branding platform that moves you from selfie confidence to clear messaging, consistent content, and a path to paid. Includes education, planning tools, and Maya for weekly execution.",
              offers: [
                {
                  "@type": "Offer",
                  name: "Selfie Guide",
                  price: "17",
                  priceCurrency: "USD",
                  url: "https://sselfie.ai/selfie-guide",
                },
                {
                  "@type": "Offer",
                  name: "Starter Kit",
                  price: "37",
                  priceCurrency: "USD",
                  url: "https://sselfie.ai/starter-kit",
                },
                {
                  "@type": "Offer",
                  name: "Masterclass",
                  price: "147",
                  priceCurrency: "USD",
                  url: "https://sselfie.ai/masterclass",
                },
                {
                  "@type": "Offer",
                  name: "Studio Membership",
                  price: "97",
                  priceCurrency: "EUR",
                  priceSpecification: {
                    "@type": "UnitPriceSpecification",
                    price: "97",
                    priceCurrency: "EUR",
                    unitCode: "MON",
                  },
                  url: "https://sselfie.ai/checkout/membership",
                },
              ],
              author: {
                "@type": "Person",
                name: "Sandra",
                url: "https://sselfie.ai",
                sameAs: ["https://instagram.com/sandra.social", "https://tiktok.com/@sandra.social"],
              },
            }),
          }}
        />

        {/* Organization schema — entity recognition for AI systems */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "SSELFIE",
              url: "https://sselfie.ai",
              logo: "https://sselfie.ai/favicon.png",
              description:
                "Personal branding platform helping coaches, consultants, and content creators move from visibility to paid with clearer messaging, content systems, and weekly execution support.",
              founder: {
                "@type": "Person",
                name: "Sandra",
                jobTitle: "Founder & CEO",
                description:
                  "Single mother from Iceland who built a 180K+ personal brand using selfies — then built an AI to do it for everyone.",
                sameAs: ["https://instagram.com/sandra.social", "https://tiktok.com/@sandra.social"],
              },
              sameAs: ["https://instagram.com/sselfie.ai", "https://tiktok.com/@sselfie.ai"],
            }),
          }}
        />

        {/* FAQPage schema — surfaces SSELFIE in AI answers for common questions */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: "What is SSELFIE?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "SSELFIE is a selfie-first personal branding platform. You start with clear photo and content foundations, then use structured products and Maya support to build message clarity, consistent visibility, and a path to paid.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How is SSELFIE different from other AI photo tools?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Most tools focus only on image generation. SSELFIE combines selfie-first education, offer clarity, content planning, and execution support so your visuals and message work together toward business outcomes.",
                  },
                },
                {
                  "@type": "Question",
                  name: "How much does SSELFIE cost?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "SSELFIE offers a simple path: start with the Selfie Guide, move into the Starter Kit for presets and a 7-day content starter, use the Masterclass for the deeper method, then continue inside Studio membership for Maya, Feed Planner, brand photo generation, and caption writing.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Do I need photography or tech skills to use SSELFIE?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "No. Maya guides everything through a chat interface. You upload selfies, describe what you want, and Maya generates the photos. No prompts, no settings, no technical knowledge required.",
                  },
                },
                {
                  "@type": "Question",
                  name: "What is Maya in SSELFIE?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "Maya is SSELFIE's AI — the entire interface. Instead of navigating menus and settings, you talk to Maya. She generates photos, plans your feed, writes captions, and remembers your brand preferences across every session.",
                  },
                },
                {
                  "@type": "Question",
                  name: "Is SSELFIE only for Instagram?",
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: "No. SSELFIE generates professional brand photos usable on Instagram, LinkedIn, websites, email headers, course platforms, and anywhere else you need to show up professionally.",
                  },
                },
              ],
            }),
          }}
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body className="antialiased min-h-screen">
        {/* Google Analytics 4 */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                });
              `}
            </Script>
          </>
        )}

        {/* Facebook Pixel */}
        {process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID && (
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID}');
              fbq('track', 'PageView');
            `}
          </Script>
        )}

        {children}
        <Analytics />
      </body>
    </html>
  )
}
