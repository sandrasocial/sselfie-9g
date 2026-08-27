// Injected content via Sentry wizard below
import { withSentryConfig } from "@sentry/nextjs";

const protectedWorkbookHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" },
  { key: "Vercel-CDN-Cache-Control", value: "no-store" },
  { key: "CDN-Cache-Control", value: "no-store" },
  { key: "Pragma", value: "no-cache" },
  { key: "Vary", value: "Cookie" },
  { key: "X-Robots-Tag", value: "noindex,nofollow,noarchive" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'",
  },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/ingest/static/:path*",
          destination: "https://eu-assets.i.posthog.com/static/:path*",
        },
        {
          source: "/ingest/:path*",
          destination: "https://eu.i.posthog.com/:path*",
        },
      ],
    }
  },
  // DELETE-01 (2026-06-10): 18 retired marketing pages became framework-level redirects so the
  // page directories could be deleted. External links (ManyChat, old IG posts) keep working.
  async redirects() {
    return [
      {
        source: "/academy/what_to_say/index.html",
        destination: "/academy/what_to_say",
        permanent: false,
      },
      {
        source: "/academy/show_up/index.html",
        destination: "/academy/show_up",
        permanent: false,
      },
      {
        source: "/academy/get_paid/index.html",
        destination: "/academy/get_paid",
        permanent: false,
      },
      // Members type /login by hand; it was a raw 404 (UX audit 2026-07-28).
      { source: "/login", destination: "/auth/login", permanent: true },
      { source: "/signup", destination: "/auth/sign-up", permanent: true },
      { source: "/visibility-suite", destination: "/join/studio", permanent: true },
      { source: "/concept-cards", destination: "/masterclass", permanent: true },
      { source: "/captions", destination: "/masterclass", permanent: true },
      { source: "/feed-reset", destination: "/masterclass", permanent: true },
      { source: "/what-to-say", destination: "/masterclass", permanent: true },
      { source: "/show-up", destination: "/masterclass", permanent: true },
      { source: "/ai-brand-photos", destination: "/selfie-guide", permanent: true },
      { source: "/transform", destination: "/selfie-guide", permanent: true },
      { source: "/transform/studio", destination: "/app", permanent: true },
      { source: "/quiz/post-to-paid", destination: "/selfie-guide", permanent: true },
      { source: "/quiz/post-to-paid/results", destination: "/selfie-guide", permanent: true },
      { source: "/prompt-guides", destination: "/prompt-vault", permanent: true },
      { source: "/prompt-guides/:slug", destination: "/selfie-guide", permanent: true },
      { source: "/whats-new", destination: "/join/studio", permanent: true },
      { source: "/sselfie-vs-aragon", destination: "/join/studio", permanent: true },
      { source: "/paid-blueprint", destination: "/join/studio", permanent: true },
      { source: "/ai-photo-refresh", destination: "/starter-kit", permanent: true },
      { source: "/private-shoot", destination: "/work-with-me", permanent: true },
      { source: "/brand-strategy", destination: "/masterclass", permanent: true },
      { source: "/checkout/brand-strategy-pack", destination: "/checkout/masterclass", permanent: true },
      { source: "/checkout/transform", destination: "/checkout/membership", permanent: true },
      { source: "/checkout/visibility-suite", destination: "/checkout/membership", permanent: true },
      { source: "/why-studio", destination: "/join/studio", permanent: true },
      { source: "/simple-training", destination: "/selfie-guide", permanent: true },
      { source: "/simple-checkout", destination: "/join/studio", permanent: true },
      { source: "/sselfie-gallery", destination: "/prompt-vault", permanent: true },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // CONTENT-VISUALS-01: the carousel + story render routes read these TTFs at runtime on Vercel
  outputFileTracingIncludes: {
    "/api/admin/content-kit/**": ["./assets/fonts/*.ttf"],
    "/academy/what_to_say": ["./server/academy-workbooks/what_to_say/index.html"],
    "/academy/show_up": ["./server/academy-workbooks/show_up/index.html"],
    "/academy/get_paid": ["./server/academy-workbooks/get_paid/index.html"],
  },
  // Enable Sentry instrumentation
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    proxyClientMaxBodySize: '100mb',
  },
  images: {
    unoptimized: true,
    qualities: [75, 80, 85], // Configure quality values to suppress warnings
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kcnmiu7u3eszdkja.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  serverExternalPackages: ['prettier', 'prettier/plugins/html', 'prettier/standalone'],
  async headers() {
    return [
      {
        source: "/academy/what_to_say",
        headers: protectedWorkbookHeaders,
      },
      {
        source: "/academy/show_up",
        headers: protectedWorkbookHeaders,
      },
      {
        source: "/academy/get_paid",
        headers: protectedWorkbookHeaders,
      },
      {
        source: "/academy/what_to_say/index.html",
        headers: protectedWorkbookHeaders,
      },
      {
        source: "/academy/show_up/index.html",
        headers: protectedWorkbookHeaders,
      },
      {
        source: "/academy/get_paid/index.html",
        headers: protectedWorkbookHeaders,
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/gpt-actions-openapi.yaml',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/yaml; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, must-revalidate',
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Max-Body-Size',
            value: '100mb',
          },
        ],
      },
      {
        source: '/api/training/upload-zip',
        headers: [
          {
            key: 'X-Upload-Route',
            value: 'true',
          },
        ],
      },
    ]
  },
}

export default withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: true,

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
