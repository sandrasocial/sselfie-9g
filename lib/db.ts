import "server-only"

import { neon as createNeonClient } from "@neondatabase/serverless"

// Export the neon client creator
export const neon = createNeonClient
