// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

console.log('[Sentry Server Config] Initializing Sentry...')
console.log('[Sentry Server Config] DSN:', process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN ? 'Set' : 'Not set')

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "https://480992b7a8c1a943853c3454f6447a97@o4510612788346880.ingest.us.sentry.io/4510612838744064",
  
  // Release is required for Sentry to properly track events
  release: process.env.SENTRY_RELEASE || `sselfie@${process.env.npm_package_version || '1.0.0'}`,
  environment: process.env.NODE_ENV || 'development',
  
  // Enable logging to Sentry
  enableLogs: true,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: true,
  
  // Send console.log, console.warn, and console.error calls as logs to Sentry
  integrations: [
    Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
  ],
  
  // Uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: process.env.NODE_ENV === 'development',
});

