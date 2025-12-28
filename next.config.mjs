/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Enable Sentry instrumentation
  experimental: {
    instrumentationHook: true,
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
    ],
  },
  serverExternalPackages: ['prettier', 'prettier/plugins/html', 'prettier/standalone'],
  async headers() {
    return [
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

export default nextConfig
