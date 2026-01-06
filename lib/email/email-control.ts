/**
 * Email Control System
 * Manages global email sending controls (kill switch, test mode)
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Get email sending enabled status
 */
export async function isEmailSendingEnabled(): Promise<boolean> {
  try {
    const result = await sql`
      SELECT value FROM admin_feature_flags
      WHERE key = 'email_sending_enabled'
    `
    if (result.length === 0) {
      // Default to false if flag doesn't exist
      return false
    }
    return result[0].value === true || result[0].value === "true"
  } catch (error) {
    console.error("[EmailControl] Error checking email sending enabled:", error)
    // Fail safe: default to false
    return false
  }
}

/**
 * Get email test mode status
 */
export async function isEmailTestMode(): Promise<boolean> {
  try {
    const result = await sql`
      SELECT value FROM admin_feature_flags
      WHERE key = 'email_test_mode'
    `
    if (result.length === 0) {
      return false
    }
    return result[0].value === true || result[0].value === "true"
  } catch (error) {
    console.error("[EmailControl] Error checking test mode:", error)
    return false
  }
}

/**
 * Check if an email address is allowed in test mode
 */
export async function isEmailAllowedInTestMode(email: string): Promise<boolean> {
  // Always allow admin email
  if (email === ADMIN_EMAIL) {
    return true
  }

  // Check whitelist from env
  const whitelist = process.env.EMAIL_TEST_WHITELIST
  if (whitelist) {
    const allowedEmails = whitelist.split(",").map((e) => e.trim().toLowerCase())
    return allowedEmails.includes(email.toLowerCase())
  }

  return false
}

/**
 * Update email sending enabled flag
 */
export async function setEmailSendingEnabled(enabled: boolean, updatedBy: string = "system"): Promise<void> {
  await sql`
    INSERT INTO admin_feature_flags (key, value, updated_by, updated_at)
    VALUES ('email_sending_enabled', ${JSON.stringify(enabled)}, ${updatedBy}, NOW())
    ON CONFLICT (key) DO UPDATE SET
      value = ${JSON.stringify(enabled)},
      updated_by = ${updatedBy},
      updated_at = NOW()
  `
}

/**
 * Update email test mode flag
 */
export async function setEmailTestMode(enabled: boolean, updatedBy: string = "system"): Promise<void> {
  await sql`
    INSERT INTO admin_feature_flags (key, value, updated_by, updated_at)
    VALUES ('email_test_mode', ${JSON.stringify(enabled)}, ${updatedBy}, NOW())
    ON CONFLICT (key) DO UPDATE SET
      value = ${JSON.stringify(enabled)},
      updated_by = ${updatedBy},
      updated_at = NOW()
  `
}

/**
 * Get all email control settings
 */
export async function getEmailControlSettings(): Promise<{
  emailSendingEnabled: boolean
  emailTestMode: boolean
}> {
  try {
    const [enabledResult, testModeResult] = await Promise.all([
      sql`SELECT value FROM admin_feature_flags WHERE key = 'email_sending_enabled'`,
      sql`SELECT value FROM admin_feature_flags WHERE key = 'email_test_mode'`,
    ])

    // Handle JSONB value - it can be boolean, string "true"/"false", or null
    const getBooleanValue = (val: any): boolean => {
      if (val === true || val === "true") return true
      if (val === false || val === "false") return false
      return false // Default to false if missing or invalid
    }

    return {
      emailSendingEnabled: getBooleanValue(enabledResult[0]?.value),
      emailTestMode: getBooleanValue(testModeResult[0]?.value),
    }
  } catch (error) {
    console.error("[EmailControl] Error getting settings:", error)
    // Fail safe: return false for both
    return {
      emailSendingEnabled: false,
      emailTestMode: false,
    }
  }
}

