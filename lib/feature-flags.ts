/**
 * Feature Flags
 * Simple feature flag system for gradual rollouts
 */

/**
 * Check if workbench mode is enabled
 * Controlled by NEXT_PUBLIC_ENABLE_WORKBENCH_MODE environment variable
 * Default: false (disabled)
 * 
 * Note: For client-side, Next.js exposes NEXT_PUBLIC_ vars at build time.
 * If the env var is set after build, you may need to restart the dev server.
 */
export function isWorkbenchModeEnabled(): boolean {
  // Check both server and client env vars
  // Client-side: Next.js exposes NEXT_PUBLIC_ vars in the browser
  const envValue = typeof window !== 'undefined' 
    ? (window as any).__NEXT_DATA__?.env?.NEXT_PUBLIC_ENABLE_WORKBENCH_MODE 
      || process.env.NEXT_PUBLIC_ENABLE_WORKBENCH_MODE
    : process.env.NEXT_PUBLIC_ENABLE_WORKBENCH_MODE
  
  return envValue === 'true'
}

