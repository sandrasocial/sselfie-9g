/**
 * Automation Test Endpoint
 * Test all 8 email automation types with a hardcoded user
 * GET /api/automations/test?type=<automation-type>
 * 
 * Types: after-blueprint, blueprint-abandoned, weekly-nurture, studio-purchase,
 *        concept-ready, blueprint-rewrite, welcome-sequence
 */

import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { requireAdmin } from "@/lib/security/require-admin"

// Test user data (hardcoded for testing)
const TEST_USER = {
  email: "test@sselfie.ai",
  userId: "999999",
  firstName: "Test",
  subscriberId: "1",
}

export async function GET(request: Request) {
  try {
    // Require admin access
    const guard = await requireAdmin(request)
    if (guard instanceof NextResponse) {
      return guard
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all"

    console.log("[Automation Test] Testing automation type:", type)

    const results: Record<string, any> = {}

    // Test each automation type
    const automationTypes = [
      "after-blueprint",
      "blueprint-abandoned",
      "weekly-nurture",
      "studio-purchase",
      "concept-ready",
      "blueprint-rewrite",
      "welcome-sequence",
    ]

    const typesToTest = type === "all" ? automationTypes : [type]

    for (const automationType of typesToTest) {
      if (!automationTypes.includes(automationType)) {
        results[automationType] = { error: "Invalid automation type" }
        continue
      }

      try {
        let response: Response
        let body: any

        switch (automationType) {
          case "after-blueprint":
            response = await fetch(`${request.url.split("?")[0].replace("/test", "/send-after-blueprint")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: TEST_USER.email,
                userId: TEST_USER.userId,
                subscriberId: TEST_USER.subscriberId,
                firstName: TEST_USER.firstName,
                blueprintUrl: "https://sselfie.ai/blueprint/view",
              }),
            })
            body = await response.json()
            results[automationType] = body
            break

          case "studio-purchase":
            response = await fetch(`${request.url.split("?")[0].replace("/test", "/send-after-studio-purchase")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: TEST_USER.email,
                userId: TEST_USER.userId,
                firstName: TEST_USER.firstName,
              }),
            })
            body = await response.json()
            results[automationType] = body
            break

          case "concept-ready":
            response = await fetch(`${request.url.split("?")[0].replace("/test", "/send-after-concept-ready")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: TEST_USER.email,
                userId: TEST_USER.userId,
                firstName: TEST_USER.firstName,
                conceptCount: 6,
              }),
            })
            body = await response.json()
            results[automationType] = body
            break

          case "blueprint-rewrite":
            response = await fetch(`${request.url.split("?")[0].replace("/test", "/send-after-blueprint-rewrite")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: TEST_USER.email,
                userId: TEST_USER.userId,
                firstName: TEST_USER.firstName,
                blueprintData: { test: true },
              }),
            })
            body = await response.json()
            results[automationType] = body
            break

          case "welcome-sequence":
            response = await fetch(`${request.url.split("?")[0].replace("/test", "/send-welcome-sequence")}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: TEST_USER.email,
                userId: TEST_USER.userId,
                firstName: TEST_USER.firstName,
              }),
            })
            body = await response.json()
            results[automationType] = body
            break

          case "blueprint-abandoned":
          case "weekly-nurture":
            results[automationType] = {
              note: "This automation is a cron job. Use the GET endpoint directly with cron secret.",
            }
            break

          default:
            results[automationType] = { error: "Not implemented" }
        }
      } catch (error) {
        results[automationType] = {
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    }

    return NextResponse.json({
      success: true,
      testUser: TEST_USER,
      results,
    })
  } catch (error) {
    console.error("[Automation Test] Error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}

