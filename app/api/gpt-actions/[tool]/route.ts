import { NextRequest, NextResponse } from "next/server"

// This endpoint used to expose file-system helper tools for a private GPT Action.
// Vercel traced the dynamic file reads as "the whole repo" and blocked production
// deploys by bundling a 300MB+ function. Keep the route present and authenticated,
// but do not ship repo file access inside the production app.

function verifyApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-gpt-actions-key")
  const expectedKey = process.env.GPT_ACTIONS_API_KEY

  if (!expectedKey) {
    console.error("[GPT Actions] GPT_ACTIONS_API_KEY not configured in environment")
    return false
  }

  if (!apiKey || apiKey !== expectedKey) {
    console.error("[GPT Actions] Invalid or missing API key")
    return false
  }

  return true
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tool: string }> | { tool: string } },
) {
  if (!verifyApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing x-gpt-actions-key header" },
      { status: 401 },
    )
  }

  const resolvedParams = await Promise.resolve(params)

  return NextResponse.json(
    {
      error: "GPT Actions file tools are disabled in production.",
      tool: resolvedParams.tool,
      availableTools: [],
    },
    { status: 503 },
  )
}
