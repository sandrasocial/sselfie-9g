export async function register() {
  console.log('[Sentry Instrumentation] Register called, NEXT_RUNTIME:', process.env.NEXT_RUNTIME)
  
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Sentry Instrumentation] Loading server config...')
    await import('../sentry.server.config')
    console.log('[Sentry Instrumentation] Server config loaded')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    console.log('[Sentry Instrumentation] Loading edge config...')
    await import('../sentry.edge.config')
    console.log('[Sentry Instrumentation] Edge config loaded')
  }
}

