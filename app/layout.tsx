import type React from "react"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

// const _geist = Geist({ subsets: ["latin"] })
// const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://www.sselfie.ai"),
  title: {
    default: "SSELFIE | Selfie Education, the SUITE & Maya",
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
  authors: [{ name: "Sandra Aamodt", url: "https://www.sselfie.ai" }],
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
    url: "https://www.sselfie.ai",
    siteName: "SSELFIE",
    title: "SSELFIE - Selfie Education, the SUITE & Maya",
    description:
      "From selfie to strategy: build a personal brand people understand, trust, and buy from, then use Maya to execute weekly.",
    images: [
      {
        url: "https://www.sselfie.ai/og-image.png",
        width: 1200,
        height: 630,
        alt: "SSELFIE - AI Photography for Personal Brands",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SSELFIE - Selfie Education, the SUITE & Maya",
    description:
      "Selfie-first personal branding, visibility systems, and weekly execution support inside SSELFIE.",
    images: ["https://www.sselfie.ai/og-image.png"],
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
        <meta name="p:domain_verify" content="2df53c71e4cbd55c3f1b54c34f6661e8" />
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
