import { NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-static"

export async function GET() {
  const manifest = {
    name: "SSELFIE - AI Photography for Personal Brands",
    short_name: "SSELFIE",
    description:
      "Create stunning professional brand photos every month with AI. No photographer needed. Built by Sandra, a single mom who turned selfies into a business.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    orientation: "portrait-primary",
    scope: "/",
    categories: ["photo", "productivity", "lifestyle"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      {
        src: "/screenshot-mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: "SSELFIE mobile app showing AI photo generation",
      },
      {
        src: "/screenshot-desktop.png",
        sizes: "1920x1080",
        type: "image/png",
        form_factor: "wide",
        label: "SSELFIE desktop app showing photo studio",
      },
    ],
    shortcuts: [
      {
        name: "Studio",
        short_name: "Studio",
        description: "Create new AI photos",
        url: "/studio",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Gallery",
        short_name: "Gallery",
        description: "View your photos",
        url: "/gallery",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Maya",
        short_name: "Maya",
        description: "Chat with Maya AI",
        url: "/maya",
        icons: [{ src: "/icon-192.png", sizes: "192x192" }],
      },
    ],
    prefer_related_applications: false,
  }

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600, must-revalidate",
    },
  })
}
