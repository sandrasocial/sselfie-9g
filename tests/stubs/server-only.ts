// `server-only` throws by design outside a React Server Component. That guard is
// correct in production and fatal for unit-testing the modules that carry it, so
// the vitest runner aliases the package to this no-op. The guard stays in source.
export {}
