import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const { agentId, message } = await req.json()

    // Validate inputs
    if (!agentId || !message) {
      return NextResponse.json(
        { error: "Missing agentId or message" },
        { status: 400 }
      )
    }

    // Check for API key
    const apiKey = process.env.GUMLOOP_API_KEY
    if (!apiKey) {
      console.error("[Admin] GUMLOOP_API_KEY not configured")
      return NextResponse.json({
        error: "Gumloop API key not configured",
        message: "Please add GUMLOOP_API_KEY to your environment variables",
        placeholder: true
      }, { status: 500 })
    }

    console.log(`[Admin] Calling Gumloop agent: ${agentId}`)

    // Call Gumloop API
    // Note: Gumloop uses flow IDs, not agent names
    // You'll need to map agent names to flow IDs in your Gumloop dashboard
    const response = await fetch(`https://api.gumloop.com/api/v1/flow/${agentId}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input_data: {
          message: message
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Admin] Gumloop API error (${response.status}):`, errorText)

      return NextResponse.json({
        error: `Gumloop API error: ${response.status}`,
        details: errorText,
        agentId,
        message: "Check that your agent ID matches your Gumloop flow ID"
      }, { status: response.status })
    }

    const data = await response.json()
    console.log(`[Admin] Gumloop response:`, data)

    // Extract the response from Gumloop's data structure
    // Gumloop returns: { run_id, status, output_data, ... }
    const agentResponse = data.output_data?.response || data.output_data?.message || JSON.stringify(data.output_data)

    return NextResponse.json({
      response: agentResponse,
      agentId,
      timestamp: new Date().toISOString(),
      runId: data.run_id,
      status: data.status
    })

  } catch (error) {
    console.error("[Admin] Error in chat-with-agent:", error)
    return NextResponse.json(
      {
        error: "Failed to chat with agent",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
