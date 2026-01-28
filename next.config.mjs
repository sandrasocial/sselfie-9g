// Injected content via Sentry wizard below
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
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
        hostname: 'images.unsplash.com',
      },
    ],
  },
  serverExternalPackages: ['prettier', 'prettier/plugins/html', 'prettier/standalone'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://va.vercel-scripts.com",
              "connect-src 'self' https://api.v0.app https://va.vercel-scripts.com https://vercel.live https://*.pusher.com wss://*.pusher.com https://blob.vercel-storage.com https://*.blob.vercel-storage.com https://ai-gateway.vercel.sh https://*.vercel.sh https://gateway.ai.cloudflare.com https://api.anthropic.com https://api.openai.com https://*.vercel-ai.com https://*.vercel.app https://replicate.com https://*.replicate.com https://replicate.delivery https://api.replicate.com https://*.anthropic.com https://*.supabase.co https://api.stripe.com https://js.stripe.com https://*.stripe.com https://*.upstash.io https://*.neon.tech https://*.sentry.io https://o4510612788346880.ingest.us.sentry.io https://*.postimg.cc https://i.postimg.cc https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com",
              "img-src 'self' data: blob: https://*.vercel-storage.com https://images.unsplash.com https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "font-src 'self' data:",
              "frame-src 'self' https://js.stripe.com",
              "media-src 'self' data: blob:",
            ].join('; '),
          },
        ],
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
