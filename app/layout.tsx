import type React from "react"
import type { Metadata, Viewport } from "next"
import Script from "next/script"
// import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

// const _geist = Geist({ subsets: ["latin"] })
// const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://sselfie.ai"),
  title: {
    default: "SSELFIE - AI Photography for Personal Brands | Professional Photos Without a Photographer",
    template: "%s | SSELFIE",
  },
  description:
    "Create stunning professional brand photos every month with AI. No photographer needed. Built by Sandra, a single mom who turned selfies into a business. Get AI-generated photos styled for your brand and ready to use on Instagram, LinkedIn, and everywhere else.",
  keywords: [
    "AI photography",
    "personal brand photos",
    "professional headshots",
    "AI selfies",
    "brand photography",
    "Instagram photos",
    "content creator tools",
    "AI photo generator",
    "professional photos without photographer",
    "personal branding",
    "social media content",
    "AI portraits",
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
    title: "SSELFIE - Your Personal AI Photographer",
    description:
      "Professional brand photos every month. No photographer needed. Just AI selfies that look like you, styled for your brand.",
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
    title: "SSELFIE - Your Personal AI Photographer",
    description:
      "Professional brand photos every month. No photographer needed. Built by a single mom who turned selfies into a business.",
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
  generator: "v0.app",
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
  themeColor: "#000000",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "SSELFIE",
              applicationCategory: "PhotographyApplication",
              operatingSystem: "Web",
              offers: {
                "@type": "AggregateOffer",
                lowPrice: "24.50",
                highPrice: "99.50",
                priceCurrency: "USD",
                offerCount: "3",
              },
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: "4.8",
                ratingCount: "127",
              },
              description:
                "Create stunning professional brand photos every month with AI. No photographer needed. Just AI selfies that look like you, styled for your brand.",
              author: {
                "@type": "Person",
                name: "Sandra",
                url: "https://instagram.com/sandra.social",
              },
              creator: {
                "@type": "Person",
                name: "Sandra",
                jobTitle: "Founder",
                description: "Single mom of three who built a business from selfies",
                sameAs: ["https://instagram.com/sandra.social", "https://tiktok.com/@sandra.social"],
              },
            }),
          }}
        />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        {/* Font optimization: Times New Roman is a system font, ensure fast rendering */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @font-face {
                font-family: 'Times New Roman';
                font-display: swap;
                font-style: normal;
                font-weight: 400;
              }
            `,
          }}
        />
      </head>
      <body className={`font-sans antialiased`}>
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
        {/* <Analytics /> */}
      </body>
    </html>
  )
}
