import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SSELFIE - Luxury AI Photography",
  description: "Create stunning professional photos with AI",
  generator: "v0.app",
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
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
