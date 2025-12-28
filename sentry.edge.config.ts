// This file configures the initialization of Sentry on the Edge Runtime (middleware, edge functions, etc.).
// The config you add here will be used whenever Edge runtime loads.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "https://480992b7a8c1a943853c3454f6447a97@o4510612788346880.ingest.us.sentry.io/4510612838744064",
  
  // Enable logging to Sentry
  enableLogs: true,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,
  
  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});

